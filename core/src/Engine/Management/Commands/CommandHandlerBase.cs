namespace Engine.Management.Commands;

using Engine.Communication;
using Microsoft.Extensions.Logging;

/// <summary>Base class for command handlers.</summary>
internal abstract class CommandHandlerBase : ICommandHandler
{
    protected readonly ICloudConnector CloudConnector;
    protected readonly ICommandDispatcher Dispatcher;
    protected readonly ILogger Logger;

    /// <summary>Initialises a new instance of the <see cref="CommandHandlerBase"/> class.</summary>
    protected CommandHandlerBase(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ILogger logger)
    {
        CloudConnector = cloudConnector;
        Dispatcher = dispatcher;
        Logger = logger;
    }

    public abstract int CommandId { get; }
    public abstract Task HandleAsync(CloudCommand command, CancellationToken cancellationToken);

    /// <summary>Sends a response for the current command.</summary>
    /// <param name="correlationId">Correlation identifier.</param>
    /// <param name="result">Result payload.</param>
    /// <param name="error">Error message, if any.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    protected async Task SendResponseAsync(string correlationId, object? result, string? error = null, CancellationToken cancellationToken = default)
    {
        await Dispatcher.SendResponseAsync(CommandId, correlationId, result, error, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Sends a success response.</summary>
    /// <param name="correlationId">Correlation identifier.</param>
    /// <param name="result">Result payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    protected async Task SendSuccessAsync(string correlationId, object? result, CancellationToken cancellationToken = default)
    {
        await SendResponseAsync(correlationId, result, null, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Sends an error response.</summary>
    /// <param name="correlationId">Correlation identifier.</param>
    /// <param name="error">Error message.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    protected async Task SendErrorAsync(string correlationId, string error, CancellationToken cancellationToken = default)
    {
        await SendResponseAsync(correlationId, null, error, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Sends a progress report for the current command.</summary>
    /// <param name="correlationId">Correlation identifier.</param>
    /// <param name="progress">Progress payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    protected async Task SendProgressAsync(string correlationId, object? progress, CancellationToken cancellationToken = default)
    {
        await Dispatcher.SendProgressAsync(CommandId, correlationId, progress, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Safely extracts a string parameter from dictionary, JsonElement, or JSON string.</summary>
    protected static string? TryGetParameterString(object? parameters, string key)
    {
        if (parameters is null)
        {
            return null;
        }

        if (parameters is Dictionary<string, object> dict)
        {
            if (dict.TryGetValue(key, out var val) && val is not null)
            {
                return val.ToString();
            }

            string altKey = char.ToLowerInvariant(key[0]) + key[1..];
            if (dict.TryGetValue(altKey, out val) && val is not null)
            {
                return val.ToString();
            }
        }
        else if (parameters is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.Object)
        {
            if (je.TryGetProperty(key, out var prop) && prop.ValueKind != System.Text.Json.JsonValueKind.Null)
            {
                return prop.ToString();
            }

            string altKey = char.ToLowerInvariant(key[0]) + key[1..];
            if (je.TryGetProperty(altKey, out prop) && prop.ValueKind != System.Text.Json.JsonValueKind.Null)
            {
                return prop.ToString();
            }
        }
        else if (parameters is string s && !string.IsNullOrWhiteSpace(s))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(s);
                if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    if (doc.RootElement.TryGetProperty(key, out var prop) && prop.ValueKind != System.Text.Json.JsonValueKind.Null)
                    {
                        return prop.ToString();
                    }

                    string altKey = char.ToLowerInvariant(key[0]) + key[1..];
                    if (doc.RootElement.TryGetProperty(altKey, out prop) && prop.ValueKind != System.Text.Json.JsonValueKind.Null)
                    {
                        return prop.ToString();
                    }
                }
            }
            catch
            {
                if (key.Equals("TaskId", StringComparison.OrdinalIgnoreCase) && !s.TrimStart().StartsWith('{'))
                {
                    return s.Trim();
                }
            }
        }

        return null;
    }
}
