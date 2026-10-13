// -----------------------------------------------------------------------------
// <copyright file="BroadcastMessageHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Management.Commands;
using Microsoft.Extensions.Logging;

// ─── Admin & Broadcast ─────────────────────────────────────────

internal sealed class BroadcastMessageHandler : CommandHandlerBase
{
    private static readonly Action<ILogger, Exception?> _logBroadcastMessageWarning =
        LoggerMessage.Define(LogLevel.Warning, 0, "Broadcast message displayed.");

    public BroadcastMessageHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ILogger<BroadcastMessageHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
    }

    public override int CommandId => CommandIds.BroadcastMessage;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        if (command.Parameters is not Dictionary<string, object> dict ||
            !dict.TryGetValue("Text", out object? textObj))
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing Text.", cancellationToken).ConfigureAwait(false);
            return;
        }

        string text = textObj?.ToString() ?? string.Empty;
        string style = dict.TryGetValue("Style", out object? styleObj) ? styleObj?.ToString() ?? "info" : "info";

        // The colour is a presentation nicety; the text is the message. Setting a colour throws when the
        // process has no console (output redirected, or running as a service), and an unguarded call would
        // discard the broadcast along with it.
        bool colourChanged = false;
        try
        {
            Console.ForegroundColor = style switch
            {
                "error" => ConsoleColor.Red,
                "warning" => ConsoleColor.Yellow,
                "success" => ConsoleColor.Green,
                _ => ConsoleColor.Cyan
            };
            colourChanged = true;
        }
        catch (IOException)
        {
            // No console to colour; the text below is what matters.
            colourChanged = false;
        }

        try
        {
            Console.WriteLine($"\n=== BROADCAST ===\n{text}\n================\n");
        }
        finally
        {
            if (colourChanged)
            {
                try
                {
                    Console.ResetColor();
                }
                catch (IOException)
                {
                    // Nothing to restore when the console could not take a colour in the first place.
                }
            }
        }

        _logBroadcastMessageWarning(Logger, null);
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, new { Message = "Broadcast displayed." }, cancellationToken).ConfigureAwait(false);
    }
}
