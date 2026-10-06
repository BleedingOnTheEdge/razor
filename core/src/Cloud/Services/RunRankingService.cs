// -----------------------------------------------------------------------------
// <copyright file="RunRankingService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;

/// <summary>
/// Ranks runs and evaluates best results, enforcing comparability and divergence flagging (003-040).
/// </summary>
/// <remarks>
/// A diverged or gapped run is flagged in rankings and never selected as a "best result" without that flag.
/// A spliced or gapped outcome is never silently ranked against a clean run as if equivalent.
/// </remarks>
internal sealed class RunRankingService
{
    /// <summary>
    /// Ranks the supplied runs according to the specified performance metric.
    /// </summary>
    /// <param name="runs">The flow runs to rank.</param>
    /// <param name="metric">The metric to rank by.</param>
    /// <param name="includeDiverged">
    /// When <see langword="false"/>, diverged and gapped runs are excluded from rankings;
    /// when <see langword="true"/>, they are included but explicitly flagged.
    /// </param>
    /// <returns>The ranked run results in descending score order.</returns>
    public IReadOnlyList<RankedRunResult> RankRuns(
        IReadOnlyList<FlowRun> runs,
        RankingMetric metric,
        bool includeDiverged = false)
    {
        ArgumentNullException.ThrowIfNull(runs);

        var candidateRuns = includeDiverged
            ? runs
            : runs.Where(r => !IsDivergedOrGapped(r)).ToList();

        var scored = candidateRuns
            .Select(r => new
            {
                Run = r,
                Score = GetMetricScore(r, metric),
                IsDiverged = IsDivergedOrGapped(r),
                DivergenceFlag = GetDivergenceFlag(r)
            })
            .OrderByDescending(x => x.Score)
            .ToList();

        var results = new List<RankedRunResult>(scored.Count);
        for (int i = 0; i < scored.Count; i++)
        {
            var item = scored[i];
            results.Add(new RankedRunResult(
                RunId: item.Run.Id,
                Rank: i + 1,
                Score: item.Score,
                IsDiverged: item.IsDiverged,
                DivergenceFlag: item.DivergenceFlag));
        }

        return results;
    }

    /// <summary>
    /// Selects the best performing run according to the target metric.
    /// </summary>
    /// <param name="runs">The flow runs to evaluate.</param>
    /// <param name="metric">The metric to evaluate by.</param>
    /// <param name="allowDiverged">
    /// When <see langword="false"/>, only clean, non-diverged runs are eligible;
    /// when <see langword="true"/>, diverged runs may be selected but will carry an explicit divergence flag.
    /// </param>
    /// <returns>The best ranked run result, or <see langword="null"/> if no eligible runs exist.</returns>
    public RankedRunResult? SelectBestResult(
        IReadOnlyList<FlowRun> runs,
        RankingMetric metric,
        bool allowDiverged = false)
    {
        ArgumentNullException.ThrowIfNull(runs);

        var rankings = RankRuns(runs, metric, includeDiverged: allowDiverged);
        return rankings.Count > 0 ? rankings[0] : null;
    }

    /// <summary>
    /// Determines whether a flow run is diverged or contains known gaps.
    /// </summary>
    /// <param name="run">The flow run to inspect.</param>
    /// <returns><see langword="true"/> if the run is diverged or gapped; otherwise <see langword="false"/>.</returns>
    public static bool IsDivergedOrGapped(FlowRun run)
    {
        ArgumentNullException.ThrowIfNull(run);

        return run.Relation == RunRelation.Branched
               || run.Relation == RunRelation.Spliced
               || run.Continuity == RunContinuity.Gapped
               || run.IsPartial
               || (run.Gaps != null && run.Gaps.Count > 0);
    }

    private static string? GetDivergenceFlag(FlowRun run)
    {
        if (!IsDivergedOrGapped(run))
        {
            return null;
        }

        bool isGapped = run.Continuity == RunContinuity.Gapped || run.IsPartial || (run.Gaps != null && run.Gaps.Count > 0);
        if (run.Relation is not null && isGapped)
        {
            return $"{run.Relation} + Gapped";
        }

        if (run.Relation is not null)
        {
            return run.Relation.ToString();
        }

        return "Gapped";
    }

    private static double GetMetricScore(FlowRun run, RankingMetric metric)
    {
        return metric switch
        {
            RankingMetric.NetProfit => (double)(run.NetProfit ?? 0m),
            RankingMetric.TotalReturn => (double)(run.TotalReturn ?? 0m),
            RankingMetric.SharpeRatio => run.SharpeRatio ?? double.MinValue,
            RankingMetric.BestFitness => run.BestFitness ?? double.MinValue,
            _ => 0.0
        };
    }
}
