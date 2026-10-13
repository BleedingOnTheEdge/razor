// -----------------------------------------------------------------------------
// <copyright file="EngineManifestReport.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;

/// <summary>
/// The catalogue of extensions an Engine reported in an <c>ExtensionManifest</c> message
/// (002-030-090 §10.3 step 8).
/// </summary>
/// <remarks>
/// The Engine sends a flat object of five string arrays produced by
/// <c>Engine.Extensions.ExtensionManager.GetManifestAsync</c>. Cloud parses those arrays into this
/// boundary type rather than binding to the Engine's own SDK types, so that a Cloud deployment accepts
/// manifests from any Engine release instead of only the one it was compiled against — a manifest field
/// that Cloud does not know about is ignored, not fatal.
/// </remarks>
/// <param name="Adapters">The broker adapters the Engine discovered.</param>
/// <param name="Strategies">The strategies the Engine discovered.</param>
/// <param name="Indicators">The indicators the Engine discovered.</param>
/// <param name="NeuralNetworks">The neural network models the Engine discovered.</param>
/// <param name="HookPlugins">The hook plugins the Engine discovered.</param>
internal sealed record EngineManifestReport(
    IReadOnlyList<string> Adapters,
    IReadOnlyList<string> Strategies,
    IReadOnlyList<string> Indicators,
    IReadOnlyList<string> NeuralNetworks,
    IReadOnlyList<string> HookPlugins)
{
    /// <summary>
    /// Flattens the report into the <see cref="ExtensionKind"/> keyed rows the store holds.
    /// </summary>
    /// <returns>One entry per extension, with blank names removed.</returns>
    internal IReadOnlyList<(ExtensionKind Kind, string Name)> ToEntries()
    {
        List<(ExtensionKind Kind, string Name)> entries = [];
        Add(entries, ExtensionKind.Adapter, Adapters);
        Add(entries, ExtensionKind.Strategy, Strategies);
        Add(entries, ExtensionKind.Indicator, Indicators);
        Add(entries, ExtensionKind.NeuralNetwork, NeuralNetworks);
        Add(entries, ExtensionKind.HookPlugin, HookPlugins);
        return entries;
    }

    private static void Add(List<(ExtensionKind Kind, string Name)> entries, ExtensionKind kind, IReadOnlyList<string> names)
    {
        foreach (string name in names)
        {
            if (!string.IsNullOrWhiteSpace(name))
            {
                entries.Add((kind, name.Trim()));
            }
        }
    }
}
