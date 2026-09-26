// -----------------------------------------------------------------------------
// <copyright file="CloudEnums.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>The lifecycle state of a licence (002-030-160 §17.1 "licenses").</summary>
internal enum LicenseStatus
{
    /// <summary>The licence entitles its account to run Engine instances.</summary>
    Active,

    /// <summary>The licence is temporarily withheld; instances stay connected but must not run user tasks.</summary>
    Suspended,

    /// <summary>The licence has lapsed.</summary>
    Expired,

    /// <summary>The licence was withdrawn.</summary>
    Revoked
}

/// <summary>The administrative state of a registered Engine instance.</summary>
internal enum EngineInstanceStatus
{
    /// <summary>The instance may authenticate and run.</summary>
    Active,

    /// <summary>An administrator has held the instance; it may authenticate but must stop user tasks.</summary>
    Suspended,

    /// <summary>An administrator has barred the instance from the service.</summary>
    Banned
}

/// <summary>
/// The extension slots an Engine reports and a profile can select (002-030-090 §10.1, §10.3 step 10).
/// </summary>
internal enum ExtensionKind
{
    /// <summary>Broker connectivity, scanned from <c>Adapters/</c>.</summary>
    Adapter,

    /// <summary>Trading logic, scanned from <c>Strategies/</c>.</summary>
    Strategy,

    /// <summary>Technical analysis, scanned from <c>Indicators/</c>.</summary>
    Indicator,

    /// <summary>Neural network models, scanned from <c>NeuralNetworks/</c>.</summary>
    NeuralNetwork,

    /// <summary>Hook based plugins, scanned from <c>Plugins/</c>.</summary>
    HookPlugin
}

/// <summary>The delivery state of a command Cloud submitted to an Engine instance.</summary>
internal enum CommandStatus
{
    /// <summary>The command is queued and has not reached the instance.</summary>
    Pending,

    /// <summary>The command has been written to a live connection or returned in a heartbeat.</summary>
    Dispatched,

    /// <summary>The instance reported success.</summary>
    Completed,

    /// <summary>The instance reported an error, or the command timed out.</summary>
    Failed
}
