// -----------------------------------------------------------------------------
// <copyright file="RunReportService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;

/// <summary>
/// Generates user-facing reports for flow runs, enforcing the reporting integrity and comparability rules (003-040).
/// </summary>
/// <remarks>
/// <para>
/// <strong>A gapped run must never emit whole-looking numbers.</strong> Aggregates computed over a run with
/// a known gap are marked partial, and the gap range and reason are explicitly named in the report.
/// Headline figures (net profit, return, Sharpe ratio, max drawdown) over a known gap are suppressed,
/// never presented as whole.
/// </para>
/// <para>
/// <strong>Reportable is not the same as comparable.</strong> A diverged run is always reportable with its
/// provenance shown, but Branched, Spliced, or Gapped runs are flagged in rankings and benchmarks so they are
/// never silently compared against clean runs.
/// </para>
/// </remarks>
internal sealed class RunReportService
{
    /// <summary>
    /// Generates an auditable report for a flow run according to integrity rules.
    /// </summary>
    /// <param name="run">The flow run entity.</param>
    /// <returns>A structured report respecting gapped reporting and comparability constraints.</returns>
    public RunReport GenerateReport(FlowRun run)
    {
        ArgumentNullException.ThrowIfNull(run);

        bool isGapped = run.Continuity == RunContinuity.Gapped || run.IsPartial || (run.Gaps != null && run.Gaps.Count > 0);
        bool isDiverged = run.Relation == RunRelation.Branched
                          || run.Relation == RunRelation.Spliced
                          || isGapped;

        string? divergenceFlag = null;
        if (isDiverged)
        {
            if (run.Relation is not null && isGapped)
            {
                divergenceFlag = $"{run.Relation} + Gapped";
            }
            else if (run.Relation is not null)
            {
                divergenceFlag = run.Relation.ToString();
            }
            else if (isGapped)
            {
                divergenceFlag = "Gapped";
            }
        }

        var gapDetails = run.Gaps?
            .Select(g => new ReportGapDetail(g.StartStep, g.EndStep, g.Reason))
            .ToList() ?? [];

        var interventions = run.Interventions?
            .Select(i => new InterventionSpecification(
                i.StepIndex,
                i.PreviousFingerprint,
                i.NewFingerprint,
                i.Actor,
                i.Reason,
                i.ModificationsSummary,
                i.BeforePayloadJson,
                i.AfterPayloadJson))
            .ToList() ?? [];

        ReportAggregateMetrics? aggregates;
        string? warningMessage = null;

        if (isGapped)
        {
            // Headline figures over a known gap are suppressed to prevent misleading whole-looking figures.
            aggregates = new ReportAggregateMetrics(
                NetProfit: null,
                TotalReturn: null,
                SharpeRatio: null,
                MaxDrawdown: null,
                TradeCount: run.TradeCount,
                BestFitness: run.BestFitness);

            string gapSummary = gapDetails.Count > 0
                ? string.Join("; ", gapDetails.Select(g => $"Steps {g.StartStep}-{g.EndStep}: {g.Reason}"))
                : "Unspecified gap period";

            warningMessage = $"Headline figures (Net Profit, Return, Sharpe Ratio, Max Drawdown) are suppressed because the run contains known gaps: {gapSummary}. Aggregates are partial.";
        }
        else
        {
            aggregates = new ReportAggregateMetrics(
                NetProfit: run.NetProfit,
                TotalReturn: run.TotalReturn,
                SharpeRatio: run.SharpeRatio,
                MaxDrawdown: run.MaxDrawdown,
                TradeCount: run.TradeCount,
                BestFitness: run.BestFitness);
        }

        return new RunReport(
            RunId: run.Id,
            ParentRunId: run.ParentRunId,
            Relation: run.Relation,
            Continuity: run.Continuity,
            IsPartial: isGapped,
            HeadlineFiguresSuppressed: isGapped,
            IsDiverged: isDiverged,
            IsComparable: !isDiverged,
            DivergenceFlag: divergenceFlag,
            Gaps: gapDetails,
            Aggregates: aggregates,
            Interventions: interventions,
            WarningMessage: warningMessage);
    }
}
