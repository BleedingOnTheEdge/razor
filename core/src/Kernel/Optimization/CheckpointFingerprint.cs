// -----------------------------------------------------------------------------
// <copyright file="CheckpointFingerprint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.Optimization;

using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

/// <summary>
/// Provides deterministic cryptographic fingerprinting for <see cref="GeneticOptimizerState"/> checkpoints.
/// </summary>
public static class CheckpointFingerprint
{
    /// <summary>
    /// Computes a deterministic SHA-256 fingerprint for a given <see cref="GeneticOptimizerState"/>.
    /// </summary>
    /// <param name="state">The optimizer state snapshot.</param>
    /// <returns>A lowercase hexadecimal SHA-256 digest string representing the checkpoint's deterministic identity.</returns>
    public static string Compute(GeneticOptimizerState state)
    {
        ArgumentNullException.ThrowIfNull(state);

        var sb = new StringBuilder(1024);
        sb.Append("Gen:").Append(state.CurrentGeneration).Append(';');
        sb.Append("Eval:").Append(state.Evaluated).Append(';');
        sb.Append("Best:").Append(state.BestOverallFitness.ToString("R", CultureInfo.InvariantCulture)).Append(';');
        sb.Append("Stag:").Append(state.StagnationCount).Append(';');
        sb.Append("Hyper:").Append(state.HyperMutation).Append(';');
        sb.Append("R0:").Append(state.RandomState0?.ToString(CultureInfo.InvariantCulture) ?? "null").Append(';');
        sb.Append("R1:").Append(state.RandomState1?.ToString(CultureInfo.InvariantCulture) ?? "null").Append(';');

        sb.Append("Pop:");
        if (state.Population != null)
        {
            foreach (var c in state.Population)
            {
                sb.Append('[').Append(c.IndividualIndex).Append(':').Append(c.Seed).Append(':');
                if (c.Genes != null)
                {
                    for (int i = 0; i < c.Genes.Length; i++)
                    {
                        if (i > 0)
                        {
                            sb.Append(',');
                        }

                        sb.Append(c.Genes[i].ToString("R", CultureInfo.InvariantCulture));
                    }
                }

                sb.Append(':');
                if (double.IsNaN(c.Fitness) || c.Fitness == Chromosome.NotEvaluated)
                {
                    sb.Append("UNEVAL");
                }
                else
                {
                    sb.Append(c.Fitness.ToString("R", CultureInfo.InvariantCulture));
                }

                sb.Append(']');
            }
        }

        if (state.NeuralNetworkState != null && state.NeuralNetworkState.Length > 0)
        {
            sb.Append(";NN:").Append(Convert.ToHexString(state.NeuralNetworkState));
        }

        byte[] utf8Bytes = Encoding.UTF8.GetBytes(sb.ToString());
        byte[] hash = SHA256.HashData(utf8Bytes);
        return Convert.ToHexString(hash);
    }
}
