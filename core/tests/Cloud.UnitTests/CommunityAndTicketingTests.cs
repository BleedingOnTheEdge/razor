// -----------------------------------------------------------------------------
// <copyright file="CommunityAndTicketingTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cloud.Data;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Verifies community discussion forums, unified ticketing operations, and user subscription endpoints.
/// </summary>
public sealed class CommunityAndTicketingTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private static async Task<T?> ReadJsonAsync<T>(HttpResponseMessage response)
    {
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions).ConfigureAwait(true);
    }

    private static Uri Relative(string url) => new(url, UriKind.Relative);

    private static async Task<HttpResponseMessage> GetRelativeAsync(HttpClient client, string url) =>
        await client.GetAsync(Relative(url)).ConfigureAwait(true);

    private static async Task<HttpResponseMessage> PostRelativeAsync(HttpClient client, string url, HttpContent? content = null) =>
        await client.PostAsync(Relative(url), content).ConfigureAwait(true);

    private static async Task<HttpResponseMessage> PostJsonRelativeAsync<T>(HttpClient client, string url, T body) =>
        await client.PostAsJsonAsync(Relative(url), body, JsonOptions).ConfigureAwait(true);

    private static async Task<HttpResponseMessage> PatchJsonRelativeAsync<T>(HttpClient client, string url, T body) =>
        await client.PatchAsJsonAsync(Relative(url), body, JsonOptions).ConfigureAwait(true);

    [Fact]
    public async Task GetCurrentUser_ReturnsDefaultProfile_AndAllowsSubscriptionUpgrade()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // 1. Fetch current profile
        using HttpResponseMessage meResponse = await GetRelativeAsync(client, "/api/users/me").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

        UserProfileView? profile = await ReadJsonAsync<UserProfileView>(meResponse).ConfigureAwait(true);
        Assert.NotNull(profile);
        Assert.Equal("dev-operator", profile.UserName);
        Assert.Equal(SubscriptionTier.Free, profile.SubscriptionTier);
        Assert.Equal(1, profile.MaxInstances);
        Assert.True(profile.CanPublishMarketplace);

        // 2. Upgrade subscription to Pro
        var upgradeRequest = new
        {
            Tier = "Pro"
        };
        using HttpResponseMessage upgradeResponse = await PostJsonRelativeAsync(
            client,
            $"/api/accounts/{profile.AccountId}/subscription",
            upgradeRequest).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, upgradeResponse.StatusCode);
        UserProfileView? upgraded = await ReadJsonAsync<UserProfileView>(upgradeResponse).ConfigureAwait(true);
        Assert.NotNull(upgraded);
        Assert.Equal(SubscriptionTier.Pro, upgraded.SubscriptionTier);
        Assert.Equal(5, upgraded.MaxInstances);
        Assert.True(upgraded.CanExecuteLive);
    }

    [Fact]
    public async Task TicketLifecycle_CreateQueryReplyAndResolve_Succeeds()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // 1. Get current user for account context
        using HttpResponseMessage meResponse = await GetRelativeAsync(client, "/api/users/me").ConfigureAwait(true);
        UserProfileView? profile = await ReadJsonAsync<UserProfileView>(meResponse).ConfigureAwait(true);
        Assert.NotNull(profile);

        // 2. Create support ticket
        var createPayload = new
        {
            profile.AccountId,
            profile.UserId,
            AuthorName = profile.UserName,
            TargetType = "SystemManager",
            Title = "Need additional compute capacity in EU-Central",
            Description = "We are onboarding an intraday momentum model requiring sub-millisecond execution.",
            Category = "Incident",
            Priority = "High"
        };

        using HttpResponseMessage createResponse = await PostJsonRelativeAsync(client, "/api/tickets", createPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        Ticket? created = await ReadJsonAsync<Ticket>(createResponse).ConfigureAwait(true);
        Assert.NotNull(created);
        Assert.Equal("Need additional compute capacity in EU-Central", created.Title);
        Assert.Equal(TicketStatus.Open, created.Status);

        // 3. Query tickets
        using HttpResponseMessage listResponse = await GetRelativeAsync(client, "/api/tickets?status=Open").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        List<Ticket>? tickets = await ReadJsonAsync<List<Ticket>>(listResponse).ConfigureAwait(true);
        Assert.NotNull(tickets);
        Assert.Contains(tickets, t => t.Id == created.Id);

        // Query tickets with composite filters
        using HttpResponseMessage multiFilterResponse = await GetRelativeAsync(
            client,
            $"/api/tickets?targetType=SystemManager&status=Open&accountId={profile.AccountId}&targetItemId={Guid.NewGuid()}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, multiFilterResponse.StatusCode);

        // 4. Add message/reply
        var replyPayload = new
        {
            AuthorName = "Cloud Operations",
            AuthorRole = "Operator",
            Message = "Node provisioned on eu-central-1 dedicated rack.",
            NewStatus = "InProgress"
        };

        using HttpResponseMessage replyResponse = await PostJsonRelativeAsync(
            client,
            $"/api/tickets/{created.Id}/messages",
            replyPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, replyResponse.StatusCode);

        TicketMessage? reply = await ReadJsonAsync<TicketMessage>(replyResponse).ConfigureAwait(true);
        Assert.NotNull(reply);
        Assert.Equal("Node provisioned on eu-central-1 dedicated rack.", reply.Message);

        // Verify ticket status transitioned to InProgress
        using HttpResponseMessage getUpdatedResponse = await GetRelativeAsync(client, $"/api/tickets/{created.Id}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, getUpdatedResponse.StatusCode);
        Ticket? updatedTicket = await ReadJsonAsync<Ticket>(getUpdatedResponse).ConfigureAwait(true);
        Assert.NotNull(updatedTicket);
        Assert.Equal(TicketStatus.InProgress, updatedTicket.Status);
        Assert.Equal(2, updatedTicket.Messages.Count);

        // 5. Update ticket status to Resolved
        var statusPayload = new
        {
            Status = "Resolved"
        };
        using HttpResponseMessage patchResponse = await PatchJsonRelativeAsync(
            client,
            $"/api/tickets/{created.Id}/status",
            statusPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NoContent, patchResponse.StatusCode);

        // Verify resolved
        using HttpResponseMessage getResolvedResponse = await GetRelativeAsync(client, $"/api/tickets/{created.Id}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, getResolvedResponse.StatusCode);
        Ticket? resolvedTicket = await ReadJsonAsync<Ticket>(getResolvedResponse).ConfigureAwait(true);
        Assert.NotNull(resolvedTicket);
        Assert.Equal(TicketStatus.Resolved, resolvedTicket.Status);
    }

    [Fact]
    public async Task CommunityForum_ListThreadsCreateAndReply_Succeeds()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // 1. List threads (should contain auto-seeded threads)
        using HttpResponseMessage listResponse = await GetRelativeAsync(client, "/api/community/threads").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        List<CommunityThread>? threads = await ReadJsonAsync<List<CommunityThread>>(listResponse).ConfigureAwait(true);
        Assert.NotNull(threads);
        Assert.NotEmpty(threads);

        // 2. Create new discussion thread
        var createPayload = new
        {
            Title = "Low latency neural inference with ONNX runtime slots",
            Category = "Strategies",
            AuthorName = "AlphaTrader99",
            AuthorBadge = "Developer",
            Content = "Sharing observations on running quantized LSTM models inside Razor slot engines."
        };

        using HttpResponseMessage createResponse = await PostJsonRelativeAsync(client, "/api/community/threads", createPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        CommunityThread? created = await ReadJsonAsync<CommunityThread>(createResponse).ConfigureAwait(true);
        Assert.NotNull(created);
        Assert.Equal("Low latency neural inference with ONNX runtime slots", created.Title);

        // 3. Post reply
        var replyPayload = new
        {
            AuthorName = "System Engineer",
            AuthorBadge = "Team",
            Content = "Make sure to pin execution threads to isolated NUMA nodes using the host slot affinity option."
        };

        using HttpResponseMessage replyResponse = await PostJsonRelativeAsync(
            client,
            $"/api/community/threads/{created.Id}/replies",
            replyPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, replyResponse.StatusCode);

        CommunityReply? reply = await ReadJsonAsync<CommunityReply>(replyResponse).ConfigureAwait(true);
        Assert.NotNull(reply);
        Assert.Equal("System Engineer", reply.AuthorName);

        // 4. Retrieve single thread by ID
        using HttpResponseMessage getSingleResponse = await GetRelativeAsync(client, $"/api/community/threads/{created.Id}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, getSingleResponse.StatusCode);
        CommunityThread? fetched = await ReadJsonAsync<CommunityThread>(getSingleResponse).ConfigureAwait(true);
        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched.Id);
        Assert.Equal(1, fetched.RepliesCount);
        Assert.Single(fetched.Replies);

        // 5. Upvote thread
        using HttpResponseMessage upvoteResponse = await PostRelativeAsync(client, $"/api/community/threads/{created.Id}/upvote").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, upvoteResponse.StatusCode);

        // Upvote unknown thread returns 404
        using HttpResponseMessage upvoteNotFound = await PostRelativeAsync(client, $"/api/community/threads/{Guid.NewGuid()}/upvote").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, upvoteNotFound.StatusCode);

        // 6. Filter threads by category
        using HttpResponseMessage filterCat = await GetRelativeAsync(client, "/api/community/threads?category=Strategies").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, filterCat.StatusCode);

        using HttpResponseMessage filterAll = await GetRelativeAsync(client, "/api/community/threads?category=All").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, filterAll.StatusCode);
    }

    [Fact]
    public async Task Services_BranchEdgeCases_Succeed()
    {
        using var factory = new CloudWebApplicationFactory();
        UserService userService = factory.Services.GetRequiredService<UserService>();
        CommunityService communityService = factory.Services.GetRequiredService<CommunityService>();
        TicketService ticketService = factory.Services.GetRequiredService<TicketService>();

        // 1. UserService.AuthenticateAsync role fallbacks:
        AuthSessionResponse? trader = await userService.AuthenticateAsync("trader-jane", "pw").ConfigureAwait(true);
        Assert.NotNull(trader);
        Assert.Equal(UserRole.Trader, trader.User.Role);

        AuthSessionResponse? operatorUser = await userService.AuthenticateAsync("plain-user", "pw").ConfigureAwait(true);
        Assert.NotNull(operatorUser);
        Assert.Equal(UserRole.Operator, operatorUser.User.Role);

        // 2. UserService.UpgradeSubscriptionAsync unknown account returns null:
        UserProfileView? unknownUpgrade = await userService.UpgradeSubscriptionAsync(Guid.NewGuid(), SubscriptionTier.Enterprise).ConfigureAwait(true);
        Assert.Null(unknownUpgrade);

        // 3. CommunityService.AddReplyAsync to unknown thread returns null:
        CommunityReply? unknownReply = await communityService.AddReplyAsync(Guid.NewGuid(), "dev", "badge", "msg").ConfigureAwait(true);
        Assert.Null(unknownReply);

        // 4. CommunityService.CreateThreadAsync with empty category and badge defaults:
        CommunityThread defaultThread = await communityService.CreateThreadAsync("Blank Meta Thread", "", "author", "", "content").ConfigureAwait(true);
        Assert.Equal("General", defaultThread.Category);
        Assert.Equal("Community", defaultThread.AuthorBadge);

        // 5. TicketService.AddMessageAsync to unknown ticket returns null:
        TicketMessage? unknownMsg = await ticketService.AddMessageAsync(Guid.NewGuid(), "author", "role", "msg").ConfigureAwait(true);
        Assert.Null(unknownMsg);

        // 6. TicketService.UpdateStatusAsync to unknown ticket returns false:
        bool unknownStatus = await ticketService.UpdateStatusAsync(Guid.NewGuid(), TicketStatus.Closed).ConfigureAwait(true);
        Assert.False(unknownStatus);
    }

    [Fact]
    public async Task Endpoints_NotFoundAndErrorCases_ReturnAppropriateStatus()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();
        Guid nonExistent = Guid.NewGuid();

        // 1. GetTicketById non-existent returns 404
        using HttpResponseMessage ticket404 = await GetRelativeAsync(client, $"/api/tickets/{nonExistent}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, ticket404.StatusCode);

        // 2. AddTicketMessage non-existent returns 404
        var replyPayload = new
        {
            AuthorName = "Operator",
            Message = "Hello"
        };
        using HttpResponseMessage ticketMsg404 = await PostJsonRelativeAsync(client, $"/api/tickets/{nonExistent}/messages", replyPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, ticketMsg404.StatusCode);

        // 3. UpdateTicketStatus non-existent returns 404
        var statusPayload = new
        {
            Status = "Resolved"
        };
        using HttpResponseMessage ticketStatus404 = await PatchJsonRelativeAsync(client, $"/api/tickets/{nonExistent}/status", statusPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, ticketStatus404.StatusCode);

        // 4. CreateTicket with Guid.Empty AccountId and UserId (exercises ternary branches)
        var createPayload = new
        {
            AccountId = Guid.Empty,
            UserId = Guid.Empty,
            AuthorName = "AutoUser",
            TargetType = "SystemManager",
            Title = "Ticket with empty GUIDs",
            Description = "Testing fallback generation of account and user IDs.",
            Category = "General",
            Priority = "Low"
        };
        using HttpResponseMessage createResp = await PostJsonRelativeAsync(client, "/api/tickets", createPayload).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        // 5. GetCommunityThread non-existent returns 404
        using HttpResponseMessage thread404 = await GetRelativeAsync(client, $"/api/community/threads/{nonExistent}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, thread404.StatusCode);

        // 6. AddCommunityReply non-existent returns 404
        var commReply = new
        {
            AuthorName = "Dev",
            Content = "Test reply"
        };
        using HttpResponseMessage commReply404 = await PostJsonRelativeAsync(client, $"/api/community/threads/{nonExistent}/replies", commReply).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, commReply404.StatusCode);

        // 7. UpgradeSubscription non-existent returns 404
        var upgradeReq = new
        {
            Tier = "Enterprise"
        };
        using HttpResponseMessage upgrade404 = await PostJsonRelativeAsync(client, $"/api/accounts/{nonExistent}/subscription", upgradeReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, upgrade404.StatusCode);

        // 8. SubmitCommand non-existent returns 404
        var cmdReq = new
        {
            InstanceId = nonExistent,
            CommandId = 1,
            CommandType = "Ping"
        };
        using HttpResponseMessage cmd404 = await PostJsonRelativeAsync(client, $"/api/instances/{nonExistent}/commands", cmdReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, cmd404.StatusCode);
    }
}
