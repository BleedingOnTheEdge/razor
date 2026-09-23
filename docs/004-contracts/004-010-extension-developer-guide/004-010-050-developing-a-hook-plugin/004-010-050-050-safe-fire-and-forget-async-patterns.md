---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/safe-fire-and-forget-async-patterns
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: Safe Fire‑and‑Forget Async Patterns
level: product
kind: contract
---

# Safe Fire‑and‑Forget Async Patterns

Because action hook callbacks **must be synchronous**, you cannot use `async`/`await` directly. However, you may need to perform asynchronous operations (e.g., sending an HTTP request to a webhook, writing to a remote database, or sending an email) without blocking the engine's tick processing pipeline.

The safe pattern is to **fire‑and‑forget** using `Task.Run` with explicit exception handling. **Never** use `async void` – unhandled exceptions in `async void` methods will crash the engine process.

**Correct pattern (copy‑paste ready):**

```csharp
public class TelegramNotifier : IHookManifest
{
    public void RegisterHooks(IHookRegistry registry)
    {
        registry.Backtest.OnCompleted.Register(ctx =>
        {
            // Fire and forget – do NOT use async void directly.
            Task.Run(async () =>
            {
                try
                {
                    await SendTelegramNotificationAsync("Backtest completed.");
                }
                catch (Exception ex)
                {
                    // Log the error; the engine will not catch it for you.
                    // Use your preferred logging mechanism.
                    Console.Error.WriteLine($"[TelegramNotifier] Failed: {ex.Message}");
                }
            });
        });
    }

    private async Task SendTelegramNotificationAsync(string message)
    {
        // Your HTTP call here...
        await Task.CompletedTask;
    }
}
```

**Why this works:**

- `Task.Run` schedules the async delegate on the thread pool, freeing the hook callback to return immediately.
- The `try/catch` inside the delegate ensures that any exception is logged and does not propagate to the CLR.
- The engine's tick processing is not blocked, preserving determinism and performance.

**Alternative pattern (using `ContinueWith`):**

```csharp
Task.Run(() => SendTelegramNotificationAsync("Backtest completed."))
    .ContinueWith(t =>
    {
        if (t.IsFaulted && t.Exception != null)
        {
            Console.Error.WriteLine($"[TelegramNotifier] Failed: {t.Exception.Message}");
        }
    }, TaskContinuationOptions.OnlyOnFaulted);
```

Both patterns are acceptable. The first is more readable and recommended.

**Important:** Always ensure that your background tasks do not hold references to engine objects that might be disposed (e.g., `IBroker`, `TickWindow`). If you need to capture such objects, do so only during the hook callback and do not keep them alive beyond the callback's scope.

---
