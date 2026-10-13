// -----------------------------------------------------------------------------
// <copyright file="ConsoleCapture.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.IntegrationTests.TestSupport;

using System.Globalization;
using System.Text;

/// <summary>
/// Captures what the Engine writes to the console, for the one branch whose only observable effect is text
/// on the console.
/// </summary>
/// <remarks>
/// The capture is taken over the process-wide <see cref="Console.Out"/>, so the caller must dispose it to put
/// the original writer back. Writes arrive from the connector's receive loop while the test reads, so the
/// buffer is guarded rather than being a bare <see cref="StringBuilder"/>.
/// </remarks>
internal sealed class ConsoleCapture : TextWriter
{
    private readonly TextWriter _original;
    private readonly StringBuilder _captured = new();

    /// <summary>Starts capturing.</summary>
    internal ConsoleCapture()
    {
        _original = Console.Out;
        Console.SetOut(this);
    }

    /// <inheritdoc/>
    public override Encoding Encoding => _original.Encoding;

    /// <summary>Gets a value indicating whether the captured text contains a fragment.</summary>
    /// <param name="value">The fragment.</param>
    /// <returns><see langword="true"/> when the fragment has been written.</returns>
    internal bool Contains(string value)
    {
        lock (_captured)
        {
            return _captured.ToString().Contains(value, StringComparison.Ordinal);
        }
    }

    /// <inheritdoc/>
    public override void Write(char value) => this.Write(value.ToString(CultureInfo.InvariantCulture));

    /// <inheritdoc/>
    public override void Write(string? value)
    {
        if (value is null)
        {
            return;
        }

        lock (_captured)
        {
            _captured.Append(value);
        }
    }

    /// <inheritdoc/>
    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            Console.SetOut(_original);
        }

        base.Dispose(disposing);
    }
}
