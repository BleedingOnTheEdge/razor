using Engine.Kernel;
using Engine.Management.Tasks;
using Kernel.Backtesting;
using Microsoft.Extensions.Logging.Abstractions;
using Sdk.Slots.Adapter;
using Sdk.Slots.Strategy;
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;

namespace Engine.UnitTests.Management.Tasks;

/// <summary>
/// Covers the contract between a task and the kernel it drives: a task must not report itself
/// complete until the kernel has actually produced a result.
/// <para>
/// The defect these pin is worth stating plainly. The kernel used to answer "not finished yet" with
/// a zeroed <see cref="BacktestResult"/>, and the task decided completion with
/// <c>_result != null &amp;&amp; _result.TotalTrades &gt;= 0</c>. Because a zeroed result satisfies
/// both, the task reported <c>Completed</c> on its very first poll -- so a caller was told the run
/// had finished while it was still running, and every later request for the result returned
/// nothing useful. The kernel now answers <c>null</c> until it has a result, which makes "still
/// running" distinguishable from "finished with nothing".
/// </para>
/// </summary>
public sealed class BacktestTaskCompletionTests
{
    [Fact]
    public async Task A_Task_Does_Not_Complete_Before_The_Kernel_Has_A_Result()
    {
        // The kernel answers "not yet" twice and only then produces a result, so a task that
        // completed early would be observably wrong.
        var kernel = new FakeKernelService(nullResponses: 2);
        using var task = CreateTask(kernel);

        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await task.ExecuteAsync(cancellation.Token);

        Assert.Equal(TaskState.Completed, task.State);
        Assert.True(
            kernel.ResultRequestCount >= 3,
            $"the task polled {kernel.ResultRequestCount} time(s); it must keep polling until a result exists");
        Assert.NotNull(await task.GetResultAsync(cancellation.Token));
    }

    [Fact]
    public async Task A_Task_Reports_No_Result_Until_The_Kernel_Has_One()
    {
        // Before executing there is nothing to report, and the task must say so rather than
        // substituting an empty result, which a caller cannot tell from a real one.
        using var task = CreateTask(new FakeKernelService(nullResponses: 0));

        Assert.Equal(TaskState.Initializing, task.State);
        Assert.Null(await task.GetResultAsync(CancellationToken.None));
    }

    [Fact]
    public async Task A_Completed_Task_Reports_The_Kernel_Result_Unchanged()
    {
        var expected = new BacktestResult { Balance = 12_345.0, TotalTrades = 7 };
        var kernel = new FakeKernelService(nullResponses: 0, result: expected);
        using var task = CreateTask(kernel);

        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await task.ExecuteAsync(cancellation.Token);

        var actual = Assert.IsType<BacktestResult>(await task.GetResultAsync(cancellation.Token));
        Assert.Equal(expected.Balance, actual.Balance);
        Assert.Equal(expected.TotalTrades, actual.TotalTrades);
    }

    [Fact]
    public async Task A_Cancelled_Task_Reports_No_Result()
    {
        // Cancellation is not completion: there is no outcome to hand back.
        var kernel = new FakeKernelService(nullResponses: int.MaxValue);
        using var task = CreateTask(kernel);

        using var cancellation = new CancellationTokenSource();
        var running = task.ExecuteAsync(cancellation.Token);
        await cancellation.CancelAsync().ConfigureAwait(true);
        await running.ConfigureAwait(true);

        Assert.Equal(TaskState.Canceled, task.State);
        Assert.Null(await task.GetResultAsync(CancellationToken.None));
    }

    private static BacktestTask CreateTask(FakeKernelService kernel) =>
        new(
            taskId: "task-1",
            input: new object(),
            logger: NullLogger<BacktestTask>.Instance,
            taskManager: null!,
            kernelService: kernel,
            kernelTaskId: "kernel-1");

    /// <summary>
    /// A kernel double that answers "not finished" a fixed number of times before producing a
    /// result, and records how often it was asked.
    /// </summary>
    private sealed class FakeKernelService : IKernelService
    {
        private readonly int _nullResponses;
        private readonly BacktestResult _result;
        private int _requests;

        public FakeKernelService(int nullResponses, BacktestResult? result = null)
        {
            _nullResponses = nullResponses;
            _result = result ?? new BacktestResult { Balance = 1.0, TotalTrades = 1 };
        }

        public int ResultRequestCount => _requests;

        public Task<BacktestResult?> GetBacktestResultAsync(string taskId, CancellationToken cancellationToken)
        {
            int request = Interlocked.Increment(ref _requests);
            return Task.FromResult(request > _nullResponses ? _result : null);
        }

        public Task<string> StartBacktestAsync(IAdapterCapability adapter, IStrategyCapability strategy, BacktestConfiguration config, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<string> StartLiveAsync(LiveInput input, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<LiveState> GetLiveStateAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task StopLiveAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task PauseLiveAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task ResumeLiveAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<string> StartOptimizationAsync(OptimizationInput input, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<ChromosomeKernel> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}
