// -----------------------------------------------------------------------------
// <copyright file="InjectGenesHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;

internal sealed class InjectGenesHandler : CommandHandlerBase
{
    private readonly ITaskManager _taskManager;

    private static readonly Action<ILogger, int, Exception?> _logInjectingGenes =
        LoggerMessage.Define<int>(LogLevel.Information, 0, "Injecting {Count} genes into live task.");

    public InjectGenesHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ITaskManager taskManager, ILogger<InjectGenesHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
    }

    public override int CommandId => CommandIds.InjectGenes;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        string? taskId = TryGetParameterString(command.Parameters, "TaskId");
        double[]? genes = ExtractGenes(command.Parameters);

        if (string.IsNullOrWhiteSpace(taskId) || genes is null || genes.Length == 0)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing or invalid TaskId or Genes parameter.", cancellationToken).ConfigureAwait(false);
            return;
        }

        _logInjectingGenes(Logger, genes.Length, null);

        await _taskManager.InjectGenesAsync(taskId, genes, cancellationToken).ConfigureAwait(false);
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, new { GenesCount = genes.Length }, cancellationToken).ConfigureAwait(false);
    }

    private static double[]? ExtractGenes(object? parameters)
    {
        if (parameters is null)
        {
            return null;
        }

        object? rawGenes = null;
        if (parameters is Dictionary<string, object> dict)
        {
            dict.TryGetValue("Genes", out rawGenes);
            if (rawGenes is null)
            {
                dict.TryGetValue("genes", out rawGenes);
            }
        }
        else if (parameters is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.Object)
        {
            if (je.TryGetProperty("Genes", out var prop) || je.TryGetProperty("genes", out prop))
            {
                if (prop.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    try
                    {
                        return prop.EnumerateArray()
                            .Select(x => x.TryGetDouble(out var d) ? d : 0.0)
                            .ToArray();
                    }
                    catch
                    {
                        return null;
                    }
                }
            }
        }

        if (rawGenes is double[] dArr)
        {
            return dArr;
        }

        if (rawGenes is IEnumerable<object> ie)
        {
            try
            {
                return ie.Select(x => Convert.ToDouble(x, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
            }
            catch
            {
                return null;
            }
        }

        return null;
    }
}
