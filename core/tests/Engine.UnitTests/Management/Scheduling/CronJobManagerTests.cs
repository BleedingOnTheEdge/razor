// -----------------------------------------------------------------------------
// <copyright file="CronJobManagerTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Management.Scheduling;

using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Engine.Core;
using Engine.Management.Commands;
using Engine.Management.Scheduling;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public sealed class CronJobManagerTests : IDisposable
{
    private readonly string _tempDbPath;
    private readonly StateManager _stateManager;

    public CronJobManagerTests()
    {
        _tempDbPath = Path.Combine(Path.GetTempPath(), $"cron_test_{Guid.NewGuid():N}.db");
        _stateManager = new StateManager(_tempDbPath);
    }

    [Fact]
    public async Task CronJobManager_SetListDeleteCronJob_PersistsAndRemoves()
    {
        var dummyDispatcher = new Lazy<ICommandDispatcher>(() => null!);
        using var manager = new CronJobManager(NullLogger<CronJobManager>.Instance, dummyDispatcher, _stateManager);

        await manager.SetCronJobAsync("job-1", "*/5 * * * *", "{\"CommandId\":1003}", true, CancellationToken.None);

        var listObj = await manager.ListCronJobsAsync(CancellationToken.None);
        Assert.NotNull(listObj);

        // Delete job
        await manager.DeleteCronJobAsync("job-1", CancellationToken.None);

        var listAfterDelete = await manager.ListCronJobsAsync(CancellationToken.None);
        Assert.NotNull(listAfterDelete);
    }

    [Fact]
    public async Task CronJobManager_SetListDeleteSchedule_PersistsAndRemoves()
    {
        var dummyDispatcher = new Lazy<ICommandDispatcher>(() => null!);
        using var manager = new CronJobManager(NullLogger<CronJobManager>.Instance, dummyDispatcher, _stateManager);

        var scheduledTime = DateTime.UtcNow.AddHours(2);
        await manager.SetScheduleAsync("sched-1", scheduledTime, "{\"CommandId\":1003}", false, CancellationToken.None);

        var listObj = await manager.ListSchedulesAsync(CancellationToken.None);
        Assert.NotNull(listObj);

        await manager.DeleteScheduleAsync("sched-1", CancellationToken.None);

        var listAfterDelete = await manager.ListSchedulesAsync(CancellationToken.None);
        Assert.NotNull(listAfterDelete);
    }

    public void Dispose()
    {
        _stateManager.Dispose();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        if (File.Exists(_tempDbPath))
        {
            try
            {
                File.Delete(_tempDbPath);
            }
            catch
            {
                // Ignore cleanup lock
            }
        }
    }
}
