// -----------------------------------------------------------------------------
// <copyright file="RegisterEngineEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

using System.Text.Json;
using System.Text.Json.Serialization;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// Deserializes GUID strings flexibly, falling back to Guid.Empty on invalid formats or placeholders.
/// </summary>
internal sealed class FlexibleGuidConverter : JsonConverter<Guid>
{
    public override Guid Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            string? value = reader.GetString();
            if (string.IsNullOrWhiteSpace(value))
            {
                return Guid.Empty;
            }

            if (Guid.TryParse(value, out Guid parsed))
            {
                return parsed;
            }

            return Guid.Empty;
        }

        return Guid.Empty;
    }

    public override void Write(Utf8JsonWriter writer, Guid value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString());
    }
}

/// <summary>
/// Deserializes optional GUID strings flexibly, falling back to null on invalid formats or placeholders.
/// </summary>
internal sealed class FlexibleNullableGuidConverter : JsonConverter<Guid?>
{
    public override Guid? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            string? value = reader.GetString();
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (Guid.TryParse(value, out Guid parsed))
            {
                return parsed;
            }

            return null;
        }

        return null;
    }

    public override void Write(Utf8JsonWriter writer, Guid? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
        {
            writer.WriteStringValue(value.Value.ToString());
        }
        else
        {
            writer.WriteNullValue();
        }
    }
}

/// <summary>
/// The body of a registration request.
/// </summary>
internal sealed class RegisterEngineRequest
{
    /// <summary>Gets or sets the account the instance belongs to.</summary>
    [JsonConverter(typeof(FlexibleGuidConverter))]
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the licence to register the instance against.</summary>
    [JsonConverter(typeof(FlexibleGuidConverter))]
    public Guid LicenseId { get; set; }

    /// <summary>Gets or sets the stable identifier the Engine reports for itself.</summary>
    public string? EngineId { get; set; }

    /// <summary>Gets or sets the operator supplied display name.</summary>
    public string? Name { get; set; }
}

/// <summary>
/// The result of a registration request.
/// </summary>
internal sealed class RegisterEngineResponse
{
    /// <summary>Gets or sets the Cloud-side instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the Engine identifier the instance is bound to.</summary>
    public string EngineId { get; set; } = string.Empty;

    /// <summary>Gets or sets the generated API key, which is returned once and never stored in clear.</summary>
    public string ApiKey { get; set; } = string.Empty;
}

/// <summary>
/// Registers an Engine instance and issues the API key it will authenticate with
/// (002-030-160 §17.1 "manages user accounts, licenses"; 002-020-020 §3.3 step 1).
/// </summary>
/// <remarks>
/// The API key is in the response body and nowhere else: it is persisted only as a hash, so this response is
/// the operator's single opportunity to record it.
/// </remarks>
internal sealed class RegisterEngineEndpoint(EngineRegistrationService registration)
    : Endpoint<RegisterEngineRequest, RegisterEngineResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/engines", "/api/instances");
        Summary(summary =>
        {
            summary.Summary = "Register an Engine instance";
            summary.Description =
                "Creates an instance bound to an account and licence, and returns the API key the Engine "
                + "presents in its Auth message. The key is returned only here.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(RegisterEngineRequest request, CancellationToken cancellationToken)
    {
        RegistrationOutcome outcome = await registration
            .RegisterAsync(request.AccountId, request.LicenseId, request.EngineId, request.Name, cancellationToken)
            .ConfigureAwait(false);

        switch (outcome.Status)
        {
            case ServiceStatus.NotFound:
                await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
                return;
            case ServiceStatus.Rejected:
                AddError(outcome.FailureReason ?? "The request was refused.");
                await Send.ErrorsAsync(StatusCodes.Status409Conflict, cancellationToken).ConfigureAwait(false);
                return;
            default:
                break;
        }

        var response = new RegisterEngineResponse
        {
            InstanceId = outcome.Instance!.Id,
            EngineId = outcome.Instance.EngineId,
            ApiKey = outcome.ApiKey!
        };

        await Send.ResponseAsync(response, StatusCodes.Status201Created, cancellationToken).ConfigureAwait(false);
    }
}
