---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/example-custom-notifications-via-hooks
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: 6.9 Example: Custom Notifications via Hooks
level: product
kind: contract
---

# 6.9 Example: Custom Notifications via Hooks

The safe fire‑and‑forget pattern is demonstrated in §6.4. Here is a complete example:

```csharp
public class TelegramNotifier : IHookManifest
{
    public void RegisterHooks(IHookRegistry registry)
    {
        registry.Backtest.OnCompleted.Register(ctx =>
        {
            Task.Run(async () =>
            {
                try
                {
                    await SendTelegramNotificationAsync("Backtest completed.");
                }
                catch (Exception ex)
                {
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
