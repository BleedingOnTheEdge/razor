using Sdk.Shared;

namespace Kernel.UnitTests.Shared;

/// <summary>
/// Covers the deterministic generator's contract, including the state capture and restore that a
/// paused-and-resumed computation depends on.
/// <para>
/// The product promises reproducibility from a seed. That promise holds for a run that is never
/// interrupted, but a run that is saved and resumed needs more than the seed: it needs the
/// sequence's <em>position</em>. These tests pin both halves.
/// </para>
/// </summary>
public sealed class CustomizedRandomTests
{
    [Fact]
    public void The_Same_Seed_Produces_The_Same_Sequence()
    {
        var first = new CustomizedRandom(12345);
        var second = new CustomizedRandom(12345);

        for (int i = 0; i < 32; i++)
        {
            Assert.Equal(first.NextUInt64(), second.NextUInt64());
        }
    }

    [Fact]
    public void Different_Seeds_Produce_Different_Sequences()
    {
        var first = new CustomizedRandom(1);
        var second = new CustomizedRandom(2);

        Assert.NotEqual(first.NextUInt64(), second.NextUInt64());
    }

    [Fact]
    public void A_64_Bit_Seed_Is_Accepted_Where_A_32_Bit_One_Cannot_Express_It()
    {
        // The ulong constructor exists so a seed that does not fit in a signed int is still usable.
        var generator = new CustomizedRandom(ulong.MaxValue);

        Assert.NotEqual(0UL, generator.NextUInt64());
    }

    [Fact]
    public void A_Negative_Seed_Is_Rejected()
    {
        // A negative int would convert to an unpredictable ulong, so it is refused rather than
        // silently reinterpreted.
        Assert.Throws<ArgumentOutOfRangeException>(() => new CustomizedRandom(-1));
    }

    [Fact]
    public void NextDouble_Stays_In_Unit_Interval()
    {
        var generator = new CustomizedRandom(7);

        for (int i = 0; i < 1000; i++)
        {
            double value = generator.NextDouble();
            Assert.InRange(value, 0.0, 1.0);
        }
    }

    [Fact]
    public void NextDouble_Respects_Its_Bounds()
    {
        var generator = new CustomizedRandom(11);

        for (int i = 0; i < 500; i++)
        {
            Assert.InRange(generator.NextDouble(5.0), 0.0, 5.0);
            Assert.InRange(generator.NextDouble(-3.0, 3.0), -3.0, 3.0);
        }
    }

    [Fact]
    public void Next_Stays_Below_Its_Bound()
    {
        var generator = new CustomizedRandom(13);

        for (int i = 0; i < 500; i++)
        {
            Assert.InRange(generator.Next(10), 0, 9);
        }
    }

    [Fact]
    public void Next_With_A_Degenerate_Bound_Returns_Zero_Rather_Than_Dividing_By_It()
    {
        var generator = new CustomizedRandom(17);

        Assert.Equal(0, generator.Next(0));
        Assert.Equal(0, generator.Next(-5));
    }

    [Fact]
    public void Next_With_A_Range_Handles_An_Empty_Or_Inverted_Range()
    {
        var generator = new CustomizedRandom(19);

        Assert.Equal(5, generator.Next(5, 5));
        Assert.Equal(5, generator.Next(5, 1));
    }

    [Fact]
    public void Next_With_A_Range_Stays_Within_It()
    {
        var generator = new CustomizedRandom(23);

        for (int i = 0; i < 500; i++)
        {
            Assert.InRange(generator.Next(10, 20), 10, 19);
        }
    }

    [Fact]
    public void NextBytes_Fills_The_Buffer_And_Rejects_A_Null_One()
    {
        var generator = new CustomizedRandom(29);
        byte[] buffer = new byte[64];

        generator.NextBytes(buffer);

        Assert.Contains(buffer, b => b != 0);
        Assert.Throws<ArgumentNullException>(() => generator.NextBytes(null!));
    }

    // ---- state capture and restore ----

    [Fact]
    public void Capturing_And_Restoring_State_Replays_The_Sequence_Exactly()
    {
        // The property a resumed computation relies on: continue from the same position and the
        // same numbers follow, in the same order.
        var generator = new CustomizedRandom(31337);
        for (int i = 0; i < 10; i++)
        {
            generator.NextUInt64();
        }

        var position = generator.CaptureState();
        ulong[] expected = new ulong[16];
        for (int i = 0; i < expected.Length; i++)
        {
            expected[i] = generator.NextUInt64();
        }

        generator.RestoreState(position);

        for (int i = 0; i < expected.Length; i++)
        {
            Assert.Equal(expected[i], generator.NextUInt64());
        }
    }

    [Fact]
    public void Restoring_A_Position_Diverges_From_A_Generator_That_Kept_Going()
    {
        // Guards the reason the state exists: a seed alone cannot resume a sequence, because the
        // generator that kept drawing has moved on. If this ever passed, the position would be
        // redundant -- and a resumed run would silently diverge.
        var kept = new CustomizedRandom(4242);
        var resumed = new CustomizedRandom(4242);
        for (int i = 0; i < 5; i++)
        {
            kept.NextUInt64();
            resumed.NextUInt64();
        }

        var position = resumed.CaptureState();
        kept.NextUInt64();
        resumed.RestoreState(position);

        Assert.NotEqual(kept.NextUInt64(), resumed.NextUInt64());
    }

    [Fact]
    public void Restoring_The_Initial_Position_Replays_From_The_Start()
    {
        var generator = new CustomizedRandom(97);
        var start = generator.CaptureState();
        ulong first = generator.NextUInt64();

        generator.RestoreState(start);

        Assert.Equal(first, generator.NextUInt64());
    }

    [Fact]
    public void State_Is_Safe_To_Capture_And_Restore_Concurrently()
    {
        // The generator is documented as thread-safe; the accessors added for state must not
        // undermine that, so this exercises them from several threads at once.
        var generator = new CustomizedRandom(101);
        var errors = new List<Exception>();

        Parallel.For(0, 64, i =>
        {
            try
            {
                var position = generator.CaptureState();
                generator.NextUInt64();
                generator.RestoreState(position);
            }
            catch (Exception exception)
            {
                lock (errors)
                {
                    errors.Add(exception);
                }
            }
        });

        Assert.Empty(errors);
    }
}
