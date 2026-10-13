// -----------------------------------------------------------------------------
// <copyright file="EngineCommandIds.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Engine;

/// <summary>
/// The subset of the Engine's command registry that Cloud issues, taken from
/// <c>Engine.Management.Commands.CommandIds</c> (002-020-020 §3.5).
/// </summary>
/// <remarks>
/// Only the commands Cloud actually sends are declared. The registry also reserves a command id's
/// numeric band per feature area (1000-1099 system, 1100-1199 live, 1200-1299 backtesting, and so on);
/// that banding is the Engine's, and Cloud does not need to re-state it.
/// </remarks>
internal static class EngineCommandIds
{
    /// <summary>
    /// <c>ActivateExtensions</c>: applies a user's active extension selection to a running Engine
    /// (002-030-090 §10.3 step 10).
    /// </summary>
    internal const int ActivateExtensions = 1404;

    /// <summary>The command name Cloud stores alongside <see cref="ActivateExtensions"/> for readability.</summary>
    internal const string ActivateExtensionsName = "ActivateExtensions";

    /// <summary>
    /// The parameter names <c>Engine.Management.Commands.Handlers.ActivateExtensionsHandler</c> reads.
    /// </summary>
    internal static class ActivateExtensionsParameters
    {
        /// <summary>The required adapter name.</summary>
        internal const string Adapter = "Adapter";

        /// <summary>The required strategy name.</summary>
        internal const string Strategy = "Strategy";

        /// <summary>The optional neural network model name.</summary>
        internal const string NeuralNetwork = "NeuralNetwork";

        /// <summary>The optional hook plugin names.</summary>
        internal const string Hooks = "Hooks";
    }
}
