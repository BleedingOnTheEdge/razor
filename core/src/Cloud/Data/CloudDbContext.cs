// -----------------------------------------------------------------------------
// <copyright file="CloudDbContext.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// The PostgreSQL persistence model for the Cloud control plane
/// (002-030-160 §17.1: accounts, licences, engine instances, profiles, commands and their results).
/// </summary>
/// <remarks>
/// <para>
/// Enum columns are persisted as strings rather than integers. The store is the durable record of a
/// control plane that is read by operators and by ad-hoc SQL, so a readable value and a stable mapping
/// that survives reordering of the enum members matter more here than the bytes saved by an integer.
/// </para>
/// <para>
/// Every string column is bounded explicitly. PostgreSQL maps an unbounded <see cref="string"/> to
/// <c>text</c>, which cannot be indexed by the unique constraints below without a prefix length.
/// </para>
/// </remarks>
internal sealed class CloudDbContext : DbContext
{
    /// <summary>Initialises a new instance of the <see cref="CloudDbContext"/> class.</summary>
    /// <param name="options">The context options, supplied by the factory or the test harness.</param>
    public CloudDbContext(DbContextOptions<CloudDbContext> options)
        : base(options)
    {
    }

    /// <summary>Gets the customer accounts.</summary>
    public DbSet<Account> Accounts => Set<Account>();

    /// <summary>Gets the users.</summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>Gets the licences.</summary>
    public DbSet<License> Licenses => Set<License>();

    /// <summary>Gets the registered Engine instances.</summary>
    public DbSet<EngineInstance> EngineInstances => Set<EngineInstance>();

    /// <summary>Gets the per-instance profiles.</summary>
    public DbSet<EngineProfile> EngineProfiles => Set<EngineProfile>();

    /// <summary>Gets the profile selections.</summary>
    public DbSet<ProfileSelection> ProfileSelections => Set<ProfileSelection>();

    /// <summary>Gets the reported extension manifest entries.</summary>
    public DbSet<ExtensionManifestEntry> ExtensionManifestEntries => Set<ExtensionManifestEntry>();

    /// <summary>Gets the submitted commands.</summary>
    public DbSet<EngineCommand> EngineCommands => Set<EngineCommand>();

    /// <summary>Gets the received progress reports.</summary>
    public DbSet<CommandProgressReport> CommandProgressReports => Set<CommandProgressReport>();

    /// <summary>Gets the persistent flow runs and their lineage.</summary>
    public DbSet<FlowRun> FlowRuns => Set<FlowRun>();

    /// <summary>Gets the recorded interventions across flow runs.</summary>
    public DbSet<RunIntervention> RunInterventions => Set<RunIntervention>();

    /// <summary>Gets the recorded coverage and execution gaps across flow runs.</summary>
    public DbSet<RunGap> RunGaps => Set<RunGap>();

    /// <summary>Gets the marketplace extension catalogue items.</summary>
    public DbSet<MarketplaceItem> MarketplaceItems => Set<MarketplaceItem>();

    /// <summary>Gets the marketplace acquisitions and licences.</summary>
    public DbSet<MarketplaceAcquisition> MarketplaceAcquisitions => Set<MarketplaceAcquisition>();

    /// <summary>Gets the support and incident tickets.</summary>
    public DbSet<Ticket> Tickets => Set<Ticket>();

    /// <summary>Gets the messages in support tickets.</summary>
    public DbSet<TicketMessage> TicketMessages => Set<TicketMessage>();

    /// <summary>Gets the community discussion threads.</summary>
    public DbSet<CommunityThread> CommunityThreads => Set<CommunityThread>();

    /// <summary>Gets the replies to community threads.</summary>
    public DbSet<CommunityReply> CommunityReplies => Set<CommunityReply>();

    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        ConfigureAccount(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureLicense(modelBuilder);
        ConfigureEngineInstance(modelBuilder);
        ConfigureEngineProfile(modelBuilder);
        ConfigureExtensionManifestEntry(modelBuilder);
        ConfigureEngineCommand(modelBuilder);
        ConfigureFlowRun(modelBuilder);
        ConfigureRunIntervention(modelBuilder);
        ConfigureRunGap(modelBuilder);
        ConfigureMarketplaceItem(modelBuilder);
        ConfigureMarketplaceAcquisition(modelBuilder);
        ConfigureTicket(modelBuilder);
        ConfigureCommunityThread(modelBuilder);
    }


    private static void ConfigureAccount(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Account>(account =>
        {
            account.HasKey(a => a.Id);
            account.Property(a => a.Name).IsRequired().HasMaxLength(128);
            account.Property(a => a.SubscriptionTier).HasConversion<string>().HasMaxLength(32);
            account.HasMany(a => a.Users).WithOne(u => u!.Account!).HasForeignKey(u => u.AccountId).OnDelete(DeleteBehavior.Cascade);
            account.HasMany(a => a.Licenses).WithOne(l => l!.Account!).HasForeignKey(l => l.AccountId).OnDelete(DeleteBehavior.Cascade);
            account.HasMany(a => a.Instances).WithOne(i => i!.Account!).HasForeignKey(i => i.AccountId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.HasKey(u => u.Id);
            user.Property(u => u.UserName).IsRequired().HasMaxLength(128);
            user.Property(u => u.PasswordHash).IsRequired().HasMaxLength(512);
            user.Property(u => u.Role).HasConversion<string>().HasMaxLength(32);
            user.HasIndex(u => u.UserName).IsUnique();
        });
    }

    private static void ConfigureLicense(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<License>(license =>
        {
            license.HasKey(l => l.Id);
            license.Property(l => l.LicenseKey).IsRequired().HasMaxLength(128);
            license.Property(l => l.Status).HasConversion<string>().HasMaxLength(32);
            license.HasIndex(l => l.LicenseKey).IsUnique();
            license.HasMany(l => l.Instances).WithOne(i => i!.License!).HasForeignKey(i => i.LicenseId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureEngineInstance(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EngineInstance>(instance =>
        {
            instance.HasKey(i => i.Id);
            instance.Property(i => i.EngineId).IsRequired().HasMaxLength(128);
            instance.Property(i => i.Name).IsRequired().HasMaxLength(128);
            instance.Property(i => i.ApiKeyHash).IsRequired().HasMaxLength(128);
            instance.Property(i => i.Status).HasConversion<string>().HasMaxLength(32);
            instance.HasIndex(i => i.EngineId).IsUnique();
            instance.HasIndex(i => i.ApiKeyHash).IsUnique();
            instance.HasOne(i => i.Profile).WithOne(p => p!.EngineInstance!).HasForeignKey<EngineProfile>(p => p.EngineInstanceId).OnDelete(DeleteBehavior.Cascade);
            instance.HasMany(i => i.ManifestEntries).WithOne(m => m!.EngineInstance!).HasForeignKey(m => m.EngineInstanceId).OnDelete(DeleteBehavior.Cascade);
            instance.HasMany(i => i.Commands).WithOne(c => c!.EngineInstance!).HasForeignKey(c => c.EngineInstanceId).OnDelete(DeleteBehavior.Cascade);
            instance.HasMany(i => i.FlowRuns).WithOne(r => r!.EngineInstance!).HasForeignKey(r => r.EngineInstanceId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureEngineProfile(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EngineProfile>(profile =>
        {
            profile.HasKey(p => p.Id);
            profile.HasMany(p => p.Selections).WithOne(s => s!.EngineProfile!).HasForeignKey(s => s.EngineProfileId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileSelection>(selection =>
        {
            selection.HasKey(s => s.Id);
            selection.Property(s => s.Kind).HasConversion<string>().HasMaxLength(32);
            selection.Property(s => s.Name).IsRequired().HasMaxLength(256);
            selection.HasIndex(s => new { s.EngineProfileId, s.Kind, s.Name }).IsUnique();
        });
    }

    private static void ConfigureExtensionManifestEntry(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ExtensionManifestEntry>(entry =>
        {
            entry.HasKey(e => e.Id);
            entry.Property(e => e.Kind).HasConversion<string>().HasMaxLength(32);
            entry.Property(e => e.Name).IsRequired().HasMaxLength(256);
            entry.HasIndex(e => new { e.EngineInstanceId, e.Kind, e.Name }).IsUnique();
        });
    }

    private static void ConfigureEngineCommand(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EngineCommand>(command =>
        {
            command.HasKey(c => c.Id);
            command.Property(c => c.CommandType).IsRequired().HasMaxLength(128);
            command.Property(c => c.ParametersJson).HasMaxLength(8192);
            command.Property(c => c.CorrelationId).IsRequired().HasMaxLength(128);
            command.Property(c => c.Status).HasConversion<string>().HasMaxLength(32);
            command.Property(c => c.ResultPayloadJson).HasMaxLength(8192);
            command.Property(c => c.ErrorMessage).HasMaxLength(2048);
            command.HasIndex(c => c.CorrelationId).IsUnique();
            command.HasIndex(c => new { c.EngineInstanceId, c.Status });
            command.HasMany(c => c.ProgressReports).WithOne(p => p!.EngineCommand!).HasForeignKey(p => p.EngineCommandId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CommandProgressReport>(report =>
        {
            report.HasKey(r => r.Id);
            report.Property(r => r.PayloadJson).IsRequired().HasMaxLength(8192);
            report.HasIndex(r => r.EngineCommandId);
        });
    }

    private static void ConfigureFlowRun(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FlowRun>(run =>
        {
            run.HasKey(r => r.Id);
            run.Property(r => r.Kind).HasConversion<string>().HasMaxLength(32);
            run.Property(r => r.Status).HasConversion<string>().HasMaxLength(32);
            run.Property(r => r.Relation).HasConversion<string>().HasMaxLength(32);
            run.Property(r => r.Continuity).HasConversion<string>().HasMaxLength(32);
            run.Property(r => r.RandomPosition).HasMaxLength(4096);
            run.HasIndex(r => r.EngineInstanceId);
            run.HasIndex(r => r.ParentRunId);
            run.HasOne(r => r.ParentRun).WithMany(p => p!.ChildRuns).HasForeignKey(r => r.ParentRunId).OnDelete(DeleteBehavior.Restrict);
            run.HasMany(r => r.Interventions).WithOne(i => i!.FlowRun!).HasForeignKey(i => i.FlowRunId).OnDelete(DeleteBehavior.Cascade);
            run.HasMany(r => r.Gaps).WithOne(g => g!.FlowRun!).HasForeignKey(g => g.FlowRunId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureRunIntervention(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RunIntervention>(intervention =>
        {
            intervention.HasKey(i => i.Id);
            intervention.Property(i => i.PreviousFingerprint).IsRequired().HasMaxLength(64);
            intervention.Property(i => i.NewFingerprint).IsRequired().HasMaxLength(64);
            intervention.Property(i => i.Actor).IsRequired().HasMaxLength(128);
            intervention.Property(i => i.Reason).IsRequired().HasMaxLength(1024);
            intervention.Property(i => i.ModificationsSummary).HasMaxLength(2048);
            intervention.Property(i => i.BeforePayloadJson).HasMaxLength(8192);
            intervention.Property(i => i.AfterPayloadJson).HasMaxLength(8192);
            intervention.HasIndex(i => i.FlowRunId);
        });
    }

    private static void ConfigureRunGap(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RunGap>(gap =>
        {
            gap.HasKey(g => g.Id);
            gap.Property(g => g.Reason).IsRequired().HasMaxLength(1024);
            gap.HasIndex(g => g.FlowRunId);
        });
    }

    private static void ConfigureMarketplaceItem(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MarketplaceItem>(item =>
        {
            item.HasKey(m => m.Id);
            item.Property(m => m.Name).IsRequired().HasMaxLength(128);
            item.Property(m => m.Kind).HasConversion<string>().HasMaxLength(32);
            item.Property(m => m.Version).IsRequired().HasMaxLength(32);
            item.Property(m => m.Author).IsRequired().HasMaxLength(128);
            item.Property(m => m.Description).HasMaxLength(2048);
            item.Property(m => m.SdkVersion).IsRequired().HasMaxLength(32);
            item.HasIndex(m => new { m.Kind, m.Name }).IsUnique();
            item.HasMany(m => m.Acquisitions).WithOne(a => a!.MarketplaceItem!).HasForeignKey(a => a.MarketplaceItemId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureMarketplaceAcquisition(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MarketplaceAcquisition>(acq =>
        {
            acq.HasKey(a => a.Id);
            acq.Property(a => a.LicenseKey).IsRequired().HasMaxLength(128);
            acq.HasIndex(a => a.LicenseKey).IsUnique();
            acq.HasIndex(a => a.AccountId);
            acq.HasIndex(a => a.EngineInstanceId);
            acq.HasIndex(a => new { a.MarketplaceItemId, a.AccountId }).IsUnique();
            acq.HasOne(a => a.Account).WithMany().HasForeignKey(a => a.AccountId).OnDelete(DeleteBehavior.Cascade);
            acq.HasOne(a => a.EngineInstance).WithMany().HasForeignKey(a => a.EngineInstanceId).OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureTicket(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Ticket>(ticket =>
        {
            ticket.HasKey(t => t.Id);
            ticket.Property(t => t.AuthorName).IsRequired().HasMaxLength(128);
            ticket.Property(t => t.TargetType).HasConversion<string>().HasMaxLength(32);
            ticket.Property(t => t.TargetItemName).HasMaxLength(128);
            ticket.Property(t => t.Title).IsRequired().HasMaxLength(256);
            ticket.Property(t => t.Description).IsRequired().HasMaxLength(4096);
            ticket.Property(t => t.Category).HasConversion<string>().HasMaxLength(32);
            ticket.Property(t => t.Priority).HasConversion<string>().HasMaxLength(32);
            ticket.Property(t => t.Status).HasConversion<string>().HasMaxLength(32);
            ticket.HasIndex(t => t.AccountId);
            ticket.HasIndex(t => t.Status);
            ticket.HasIndex(t => t.TargetType);
            ticket.HasMany(t => t.Messages).WithOne(m => m!.Ticket!).HasForeignKey(m => m.TicketId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TicketMessage>(msg =>
        {
            msg.HasKey(m => m.Id);
            msg.Property(m => m.AuthorName).IsRequired().HasMaxLength(128);
            msg.Property(m => m.AuthorRole).IsRequired().HasMaxLength(64);
            msg.Property(m => m.Message).IsRequired().HasMaxLength(4096);
            msg.HasIndex(m => m.TicketId);
        });
    }

    private static void ConfigureCommunityThread(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CommunityThread>(thread =>
        {
            thread.HasKey(t => t.Id);
            thread.Property(t => t.Title).IsRequired().HasMaxLength(256);
            thread.Property(t => t.Category).IsRequired().HasMaxLength(64);
            thread.Property(t => t.AuthorName).IsRequired().HasMaxLength(128);
            thread.Property(t => t.AuthorBadge).IsRequired().HasMaxLength(64);
            thread.Property(t => t.Content).IsRequired().HasMaxLength(8192);
            thread.HasIndex(t => t.Category);
            thread.HasMany(t => t.Replies).WithOne(r => r!.Thread!).HasForeignKey(r => r.ThreadId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CommunityReply>(reply =>
        {
            reply.HasKey(r => r.Id);
            reply.Property(r => r.AuthorName).IsRequired().HasMaxLength(128);
            reply.Property(r => r.AuthorBadge).IsRequired().HasMaxLength(64);
            reply.Property(r => r.Content).IsRequired().HasMaxLength(4096);
            reply.HasIndex(r => r.ThreadId);
        });
    }
}

