// -----------------------------------------------------------------------------
// <copyright file="OptimizationCommandHandlerTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Management.Commands;

using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Engine.Communication;
using Engine.Core;
using Engine.Management.Commands;
using Engine.Management.Commands.Handlers;
using Engine.Management.Tasks;
using global::Kernel.Optimization;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;

/// <summary>
/// Triple-path test suite verifying wire command handlers for optimization stepping and checkpoints:
/// <see cref="StepComputationHandler"/> (1307), <see cref="GetCheckpointHandler"/> (1308), and <see cref="SetCheckpointHandler"/> (1309).
/// </summary>
public sealed class OptimizationCommandHandlerTests
{
    private readonly FakeCloudConnector _cloudConnector = new();
    private readonly RecordingDispatcher _dispatcher = new();
    private readonly FakeTaskManagerForCommands _taskManager = new();

    private static readonly double[] SampleGenes = [1.0];
    private static readonly double[] SampleGenesAlt = [3.0];
    private static readonly ChromosomeKernel[] SamplePopulation = [new(SampleGenes, fitness: 10.0)];
    private static readonly ChromosomeKernel[] SamplePopulationAlt = [new(SampleGenesAlt, fitness: 20.0)];
    private static readonly JsonSerializerOptions JsonOptions = new() { NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals };

    private StepComputationHandler CreateStepHandler() =>
        new(_cloudConnector, _dispatcher, _taskManager, NullLogger<StepComputationHandler>.Instance);

    private GetCheckpointHandler CreateGetHandler() =>
        new(_cloudConnector, _dispatcher, _taskManager, NullLogger<GetCheckpointHandler>.Instance);

    private SetCheckpointHandler CreateSetHandler() =>
        new(_cloudConnector, _dispatcher, _taskManager, NullLogger<SetCheckpointHandler>.Instance);

    // ─── 1. StepComputationHandler (1307) Tests ─────────────────────────────────

    [Fact]
    public async Task StepComputationHandler_Primary_AdvancesGenerationsAndReturnsSuccess()
    {
        var handler = CreateStepHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-1",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Generations"] = 2
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal(CommandIds.StepComputation, _dispatcher.LastCommandId);
        Assert.Equal("corr-1", _dispatcher.LastCorrelationId);
        Assert.Null(_dispatcher.LastError);
        Assert.NotNull(_dispatcher.LastResult);
    }

    [Fact]
    public async Task StepComputationHandler_Boundary_DefaultsToStepCountOne()
    {
        var handler = CreateStepHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-2",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1"
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Null(_dispatcher.LastError);
        Assert.Equal(1, _taskManager.LastSteppedGenerations);
    }

    [Fact]
    public async Task StepComputationHandler_Boundary_RejectsZeroOrNegativeGenerations()
    {
        var handler = CreateStepHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-3",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Generations"] = 0
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal("Generations must be greater than zero.", _dispatcher.LastError);
    }

    [Fact]
    public async Task StepComputationHandler_Negative_RejectsMissingTaskId()
    {
        var handler = CreateStepHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-4",
            Parameters = new Dictionary<string, object>()
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal("Missing TaskId parameter.", _dispatcher.LastError);
    }

    [Fact]
    public async Task StepComputationHandler_Negative_PropagatesTaskManagerError()
    {
        var handler = CreateStepHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-5",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "throw-error",
                ["Generations"] = 1
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal("Simulated task manager step error.", _dispatcher.LastError);
    }

    // ─── 2. GetCheckpointHandler (1308) Tests ────────────────────────────────────

    [Fact]
    public async Task GetCheckpointHandler_Primary_ReturnsCheckpointSuccess()
    {
        var handler = CreateGetHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.GetCheckpoint,
            CorrelationId = "corr-6",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1"
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal(CommandIds.GetCheckpoint, _dispatcher.LastCommandId);
        Assert.Equal("corr-6", _dispatcher.LastCorrelationId);
        Assert.Null(_dispatcher.LastError);
        Assert.NotNull(_dispatcher.LastResult);
    }

    [Fact]
    public async Task GetCheckpointHandler_Negative_RejectsMissingTaskId()
    {
        var handler = CreateGetHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.GetCheckpoint,
            CorrelationId = "corr-7",
            Parameters = new Dictionary<string, object>()
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal("Missing TaskId parameter.", _dispatcher.LastError);
    }

    // ─── 3. SetCheckpointHandler (1309) Tests ────────────────────────────────────

    [Fact]
    public async Task SetCheckpointHandler_Primary_WithValidReasonAndCheckpoint_ReturnsSuccess()
    {
        var handler = CreateSetHandler();
        var state = new GeneticOptimizerState
        {
            CurrentGeneration = 1,
            Evaluated = true,
            Population = SamplePopulation
        };
        var checkpoint = new ComputationCheckpoint
        {
            ComputationId = "task-1",
            StepIndex = 1,
            Fingerprint = CheckpointFingerprint.Compute(state),
            State = state
        };

        var command = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-8",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "Quant team model override",
                ["Checkpoint"] = checkpoint
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal(CommandIds.SetCheckpoint, _dispatcher.LastCommandId);
        Assert.Equal("corr-8", _dispatcher.LastCorrelationId);
        Assert.Null(_dispatcher.LastError);
        Assert.NotNull(_dispatcher.LastResult);
    }

    [Fact]
    public async Task SetCheckpointHandler_Primary_WithStateParameter_ConvertsAndAppliesCheckpoint()
    {
        var handler = CreateSetHandler();
        var state = new GeneticOptimizerState
        {
            CurrentGeneration = 2,
            Evaluated = true,
            Population = SamplePopulationAlt
        };

        var command = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-9",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "State-only parameter override",
                ["State"] = state
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Null(_dispatcher.LastError);
        Assert.NotNull(_dispatcher.LastResult);
    }

    [Fact]
    public async Task SetCheckpointHandler_Boundary_RejectsMissingOrEmptyReason()
    {
        var handler = CreateSetHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-10",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "   ",
                ["State"] = new GeneticOptimizerState
                {
                    CurrentGeneration = 0,
                    Evaluated = true,
                    Population = new[] { new ChromosomeKernel(1) }
                }
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal("An explicit audit reason is mandatory for SetCheckpoint interventions.", _dispatcher.LastError);
    }

    [Fact]
    public async Task SetCheckpointHandler_Negative_RejectsMissingCheckpointOrState()
    {
        var handler = CreateSetHandler();
        var command = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-11",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "Valid reason"
            }
        };

        await handler.HandleAsync(command, CancellationToken.None);

        Assert.Equal("Missing or invalid Checkpoint/State parameter.", _dispatcher.LastError);
    }

    [Fact]
    public async Task StepComputationHandler_Boundary_AcceptsGenerationsAsLong_String_AndJsonElement()
    {
        var handler = CreateStepHandler();

        // 1. As long
        var cmd1 = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-long",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Generations"] = 3L
            }
        };
        await handler.HandleAsync(cmd1, CancellationToken.None);
        Assert.Equal(3, _taskManager.LastSteppedGenerations);

        // 2. As string
        var cmd2 = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-str",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Generations"] = "4"
            }
        };
        await handler.HandleAsync(cmd2, CancellationToken.None);
        Assert.Equal(4, _taskManager.LastSteppedGenerations);

        // 3. As JsonElement
        using var doc = JsonDocument.Parse("5");
        var cmd3 = new CloudCommand
        {
            CommandId = CommandIds.StepComputation,
            CorrelationId = "corr-json",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Generations"] = doc.RootElement.Clone()
            }
        };
        await handler.HandleAsync(cmd3, CancellationToken.None);
        Assert.Equal(5, _taskManager.LastSteppedGenerations);
    }

    [Fact]
    public async Task Handlers_Negative_RejectNullOrNonDictionaryParameters()
    {
        var stepHandler = CreateStepHandler();
        var getHandler = CreateGetHandler();
        var setHandler = CreateSetHandler();

        // Step handler with null parameters
        await stepHandler.HandleAsync(new CloudCommand { CommandId = CommandIds.StepComputation, Parameters = null }, CancellationToken.None);
        Assert.Equal("Missing TaskId parameter.", _dispatcher.LastError);

        // Get handler with null parameters
        await getHandler.HandleAsync(new CloudCommand { CommandId = CommandIds.GetCheckpoint, Parameters = null }, CancellationToken.None);
        Assert.Equal("Missing TaskId parameter.", _dispatcher.LastError);

        // Set handler with null parameters
        await setHandler.HandleAsync(new CloudCommand { CommandId = CommandIds.SetCheckpoint, Parameters = null }, CancellationToken.None);
        Assert.Equal("Missing TaskId parameter.", _dispatcher.LastError);
    }

    [Fact]
    public async Task GetCheckpointHandler_Negative_PropagatesTaskManagerError()
    {
        var handler = CreateGetHandler();
        var cmd = new CloudCommand
        {
            CommandId = CommandIds.GetCheckpoint,
            CorrelationId = "corr-err",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "throw-error"
            }
        };

        await handler.HandleAsync(cmd, CancellationToken.None);
        Assert.Equal("Simulated task manager get error.", _dispatcher.LastError);
    }

    [Fact]
    public async Task SetCheckpointHandler_Primary_WithCheckpointAndStateAsJsonStringAndJsonElement()
    {
        var handler = CreateSetHandler();
        var state = new GeneticOptimizerState
        {
            CurrentGeneration = 1,
            Evaluated = true,
            Population = SamplePopulation
        };
        var checkpoint = new ComputationCheckpoint
        {
            ComputationId = "task-1",
            StepIndex = 1,
            Fingerprint = CheckpointFingerprint.Compute(state),
            State = state
        };

        // 1. Checkpoint as Json string
        string cpJson = JsonSerializer.Serialize(checkpoint, JsonOptions);
        var cmd1 = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-cp-str",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "CP JSON string test",
                ["Checkpoint"] = cpJson
            }
        };
        await handler.HandleAsync(cmd1, CancellationToken.None);
        Assert.Null(_dispatcher.LastError);

        // 2. Checkpoint as JsonElement
        using var cpDoc = JsonDocument.Parse(cpJson);
        var cmd2 = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-cp-je",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "CP JsonElement test",
                ["Checkpoint"] = cpDoc.RootElement.Clone()
            }
        };
        await handler.HandleAsync(cmd2, CancellationToken.None);
        Assert.Null(_dispatcher.LastError);

        // 3. State as Json string
        string stateJson = JsonSerializer.Serialize(state, JsonOptions);
        var cmd3 = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-st-str",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "State JSON string test",
                ["State"] = stateJson
            }
        };
        await handler.HandleAsync(cmd3, CancellationToken.None);
        Assert.Null(_dispatcher.LastError);

        // 4. State as JsonElement
        using var stDoc = JsonDocument.Parse(stateJson);
        var cmd4 = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-st-je",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "task-1",
                ["Reason"] = "State JsonElement test",
                ["State"] = stDoc.RootElement.Clone()
            }
        };
        await handler.HandleAsync(cmd4, CancellationToken.None);
        Assert.Null(_dispatcher.LastError);
    }

    [Fact]
    public async Task SetCheckpointHandler_Negative_PropagatesTaskManagerError()
    {
        var handler = CreateSetHandler();
        var state = new GeneticOptimizerState
        {
            CurrentGeneration = 1,
            Evaluated = true,
            Population = SamplePopulation
        };
        var checkpoint = new ComputationCheckpoint
        {
            ComputationId = "throw-error",
            StepIndex = 1,
            Fingerprint = CheckpointFingerprint.Compute(state),
            State = state
        };

        var cmd = new CloudCommand
        {
            CommandId = CommandIds.SetCheckpoint,
            CorrelationId = "corr-set-err",
            Parameters = new Dictionary<string, object>
            {
                ["TaskId"] = "throw-error",
                ["Reason"] = "Trigger simulated error",
                ["Checkpoint"] = checkpoint
            }
        };

        await handler.HandleAsync(cmd, CancellationToken.None);
        Assert.Equal("Simulated task manager set error.", _dispatcher.LastError);
    }

    // ─── Test Doubles ────────────────────────────────────────────────────────────

    private sealed class RecordingDispatcher : ICommandDispatcher
    {
        public int LastCommandId
        {
            get; private set;
        }
        public string? LastCorrelationId
        {
            get; private set;
        }
        public object? LastResult
        {
            get; private set;
        }
        public string? LastError
        {
            get; private set;
        }

        public override Task DispatchAsync(CloudCommand command, CancellationToken cancellationToken) => Task.CompletedTask;
        public override void RegisterHandler(int commandId, ICommandHandler handler)
        {
        }
        public override Task StopUserTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;

        public override Task SendResponseAsync(int commandId, string correlationId, object? result, string? error = null, CancellationToken cancellationToken = default)
        {
            LastCommandId = commandId;
            LastCorrelationId = correlationId;
            LastResult = result;
            LastError = error;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeCloudConnector : ICloudConnector
    {
        public bool IsConnected => true;
        public string? SessionId => "test-session";
        public int HeartbeatIntervalSeconds => 30;
        public TimeSpan ClockDrift => TimeSpan.Zero;
        public Task RunAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DisconnectAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SendAsync(CloudMessage message, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SendBinaryAsync(string filePath, string contentType, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SendExtensionManifestAsync(object manifest, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeTaskManagerForCommands : ITaskManager
    {
        public int LastSteppedGenerations
        {
            get; private set;
        }

        public IReadOnlyList<EngineTaskBase> RunningTasks => Array.Empty<EngineTaskBase>();
        public IReadOnlyList<EngineTaskBase> AllTasks => Array.Empty<EngineTaskBase>();

        public EngineTaskBase? GetTask(string taskId) => null;
        public Task<string> StartLiveTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("live-1");
        public Task StopLiveTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartBacktestTaskAsync(object input, CancellationToken cancellationToken) => Task.FromResult("bt-1");
        public Task CancelBacktestTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartOptimizationTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("opt-1");
        public Task CancelOptimizationTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<ComputationCheckpoint> StepComputationAsync(string taskId, int generations, CancellationToken cancellationToken)
        {
            if (taskId == "throw-error")
            {
                throw new InvalidOperationException("Simulated task manager step error.");
            }

            LastSteppedGenerations = generations;
            var state = new GeneticOptimizerState
            {
                CurrentGeneration = generations,
                Evaluated = true,
                Population = SamplePopulation
            };

            return Task.FromResult(new ComputationCheckpoint
            {
                ComputationId = taskId,
                StepIndex = generations,
                Fingerprint = CheckpointFingerprint.Compute(state),
                State = state
            });
        }

        public Task<ComputationCheckpoint> GetCheckpointAsync(string taskId, CancellationToken cancellationToken)
        {
            if (taskId == "throw-error")
            {
                throw new InvalidOperationException("Simulated task manager get error.");
            }

            var state = new GeneticOptimizerState
            {
                CurrentGeneration = 0,
                Evaluated = true,
                Population = SamplePopulation
            };

            return Task.FromResult(new ComputationCheckpoint
            {
                ComputationId = taskId,
                StepIndex = 0,
                Fingerprint = CheckpointFingerprint.Compute(state),
                State = state
            });
        }

        public Task<ComputationCheckpoint> SetCheckpointAsync(string taskId, ComputationCheckpoint checkpoint, string? reason, CancellationToken cancellationToken)
        {
            if (taskId == "throw-error")
            {
                throw new InvalidOperationException("Simulated task manager set error.");
            }

            return Task.FromResult(checkpoint with
            {
                Diverged = true
            });
        }

        public Task<string?> RestoreOptimizationTaskAsync(OptimizationState state, CancellationToken cancellationToken) => Task.FromResult<string?>("opt-restored");
        public Task PauseTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ResumeTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetTaskStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new object());
        public Task<object?> GetTaskResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task<object?> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task StopAllTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task StopAllUserTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetLiveStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new object());
        public Task StopAllLiveTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public DateTime? GetLastLiveTickTimestamp() => null;
        public Task<string?> RestoreLiveTaskAsync(LiveState state, CancellationToken cancellationToken) => Task.FromResult<string?>("live-restored");
    }
}
