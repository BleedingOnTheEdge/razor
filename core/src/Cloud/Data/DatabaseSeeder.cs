// -----------------------------------------------------------------------------
// <copyright file="DatabaseSeeder.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Seeds the cloud database with standard initial users, subscription tiers, licenses, and certified marketplace additives.
/// </summary>
internal static class DatabaseSeeder
{
    /// <summary>
    /// Seeds the cluster database idempotently.
    /// Requirements: 1 superadmin, 3 operators, 20 traders (each tier), 20 developers (each tier), real additives.
    /// </summary>
    internal static async Task SeedAsync(CloudDbContext db, IPasswordHasher<User> passwordHasher)
    {
        ArgumentNullException.ThrowIfNull(db);
        ArgumentNullException.ThrowIfNull(passwordHasher);

        await DatabaseSchemaCompatibility.EnsureSchemaAsync(db).ConfigureAwait(false);

        DateTimeOffset now = DateTimeOffset.UtcNow;

        // 1. Seed SuperAdmin
        if (!await db.Users.AnyAsync(u => u.UserName == "superadmin").ConfigureAwait(false))
        {
            var adminAccount = new Account
            {
                Id = Guid.NewGuid(),
                Name = "Razor Cluster Administration",
                SubscriptionTier = SubscriptionTier.Enterprise,
                CreatedAt = now
            };
            db.Accounts.Add(adminAccount);

            var superadmin = new User
            {
                Id = Guid.NewGuid(),
                AccountId = adminAccount.Id,
                UserName = "superadmin",
                Email = "admin@razor.io",
                DisplayName = "Chief Systems Administrator",
                Bio = "Root cluster administrator overseeing tenancy, security, and operator fleet assignments.",
                Role = UserRole.SuperAdmin,
                IsActive = true,
                CreatedAt = now
            };
            superadmin.PasswordHash = passwordHasher.HashPassword(superadmin, "Password123!");
            db.Users.Add(superadmin);

            db.Licenses.Add(new License
            {
                Id = Guid.NewGuid(),
                AccountId = adminAccount.Id,
                LicenseKey = $"LIC-SUPERADMIN-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
                Status = LicenseStatus.Active,
                IssuedAt = now,
                MaxInstances = 999
            });
        }

        // 2. Seed 3 Operators
        string[] operatorNames = ["operator-alpha", "operator-beta", "operator-gamma"];
        string[] operatorTitles = ["Alpha Operations Lead", "Beta Telemetry Engineer", "Gamma Reliability Specialist"];
        string[] operatorBios =
        [
            "Primary cluster operations lead managing execution instances and live routing.",
            "Specialist in real-time telemetry, node latency metrics, and performance triage.",
            "Site reliability and disaster recovery failover engineer."
        ];

        for (int i = 0; i < operatorNames.Length; i++)
        {
            string opName = operatorNames[i];
            if (!await db.Users.AnyAsync(u => u.UserName == opName).ConfigureAwait(false))
            {
                var opAccount = new Account
                {
                    Id = Guid.NewGuid(),
                    Name = $"Operator {opName.ToUpperInvariant()} Fleet",
                    SubscriptionTier = SubscriptionTier.Enterprise,
                    CreatedAt = now
                };
                db.Accounts.Add(opAccount);

                var opUser = new User
                {
                    Id = Guid.NewGuid(),
                    AccountId = opAccount.Id,
                    UserName = opName,
                    Email = $"{opName}@razor.io",
                    DisplayName = operatorTitles[i],
                    Bio = operatorBios[i],
                    Role = UserRole.Operator,
                    IsActive = true,
                    CreatedAt = now
                };
                opUser.PasswordHash = passwordHasher.HashPassword(opUser, "Password123!");
                db.Users.Add(opUser);

                db.Licenses.Add(new License
                {
                    Id = Guid.NewGuid(),
                    AccountId = opAccount.Id,
                    LicenseKey = $"LIC-{opName.ToUpperInvariant()}-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
                    Status = LicenseStatus.Active,
                    IssuedAt = now,
                    MaxInstances = 50
                });
            }
        }

        // 3. Seed 20 Traders across Free, Pro, Enterprise
        // 7 Free (1-7), 7 Pro (8-14), 6 Enterprise (15-20)
        for (int i = 1; i <= 20; i++)
        {
            string traderName = $"trader-{i:D2}";
            if (!await db.Users.AnyAsync(u => u.UserName == traderName).ConfigureAwait(false))
            {
                SubscriptionTier tier = i switch
                {
                    <= 7 => SubscriptionTier.Free,
                    <= 14 => SubscriptionTier.Pro,
                    _ => SubscriptionTier.Enterprise
                };

                int maxInst = tier switch
                {
                    SubscriptionTier.Free => 1,
                    SubscriptionTier.Pro => 5,
                    _ => 20
                };

                var account = new Account
                {
                    Id = Guid.NewGuid(),
                    Name = $"Trading Desk {i:D2} ({tier})",
                    SubscriptionTier = tier,
                    CreatedAt = now
                };
                db.Accounts.Add(account);

                var user = new User
                {
                    Id = Guid.NewGuid(),
                    AccountId = account.Id,
                    UserName = traderName,
                    Email = $"{traderName}@trading.razor.io",
                    DisplayName = $"Quantitative Trader #{i:D2}",
                    Bio = $"Algorithmic trading firm execution desk {i:D2} on {tier} subscription.",
                    Role = UserRole.Trader,
                    IsActive = true,
                    CreatedAt = now
                };
                user.PasswordHash = passwordHasher.HashPassword(user, "Password123!");
                db.Users.Add(user);

                db.Licenses.Add(new License
                {
                    Id = Guid.NewGuid(),
                    AccountId = account.Id,
                    LicenseKey = $"LIC-TRD{i:D2}-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
                    Status = LicenseStatus.Active,
                    IssuedAt = now,
                    MaxInstances = maxInst
                });
            }
        }

        // 4. Seed 20 Developers across Free, Pro, Enterprise
        // 7 Free (1-7), 7 Pro (8-14), 6 Enterprise (15-20)
        for (int i = 1; i <= 20; i++)
        {
            string devName = $"developer-{i:D2}";
            if (!await db.Users.AnyAsync(u => u.UserName == devName).ConfigureAwait(false))
            {
                SubscriptionTier tier = i switch
                {
                    <= 7 => SubscriptionTier.Free,
                    <= 14 => SubscriptionTier.Pro,
                    _ => SubscriptionTier.Enterprise
                };

                int maxInst = tier switch
                {
                    SubscriptionTier.Free => 1,
                    SubscriptionTier.Pro => 5,
                    _ => 25
                };

                var account = new Account
                {
                    Id = Guid.NewGuid(),
                    Name = $"Extension Studio {i:D2} ({tier})",
                    SubscriptionTier = tier,
                    CreatedAt = now
                };
                db.Accounts.Add(account);

                var user = new User
                {
                    Id = Guid.NewGuid(),
                    AccountId = account.Id,
                    UserName = devName,
                    Email = $"{devName}@dev.razor.io",
                    DisplayName = $"Platform Developer #{i:D2}",
                    Bio = $"Ecosystem additive author producing certified quantitative modules on {tier} subscription.",
                    Role = UserRole.Developer,
                    IsActive = true,
                    CreatedAt = now
                };
                user.PasswordHash = passwordHasher.HashPassword(user, "Password123!");
                db.Users.Add(user);

                db.Licenses.Add(new License
                {
                    Id = Guid.NewGuid(),
                    AccountId = account.Id,
                    LicenseKey = $"LIC-DEV{i:D2}-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
                    Status = LicenseStatus.Active,
                    IssuedAt = now,
                    MaxInstances = maxInst
                });
            }
        }

        // 5. Seed Real Production-Grade Additives in Marketplace
        await SeedAdditivesAsync(db, now).ConfigureAwait(false);

        await db.SaveChangesAsync().ConfigureAwait(false);
    }

    private static async Task SeedAdditivesAsync(CloudDbContext db, DateTimeOffset now)
    {
        var additives = new (string Name, ExtensionKind Kind, string Version, string Author, string Description, decimal Price, double Rating, int Downloads)[]
        {
            // Adapters
            ("BinanceSpotAdapter", ExtensionKind.Adapter, "1.4.2", "Binance VIP Integrations",
             "High-throughput WebSocket order routing and Level-2 orderbook adapter for Binance Spot markets with sub-millisecond execution.",
             0m, 4.9, 1420),

            ("BinanceFuturesAdapter", ExtensionKind.Adapter, "2.1.0", "Delta Alpha Labs",
             "Low-latency connector for Binance USD-M and COIN-M perpetual futures with automatic leverage and margin balance synchronization.",
             49.00m, 5.0, 980),

            ("InteractiveBrokersAdapter", ExtensionKind.Adapter, "3.0.1", "Greenwich Execution Services",
             "Certified FIX 4.4 institutional gateway for Interactive Brokers TWS and Gateway with smart order routing across global equity and futures exchanges.",
             199.00m, 4.8, 512),

            ("OkxUnifiedAdapter", ExtensionKind.Adapter, "1.2.0", "QuantForge Tech",
             "Unified account connector for OKX spot, margin, and multi-currency swap instruments with sub-account liquidity pooling.",
             0m, 4.7, 730),

            ("KrakenProAdapter", ExtensionKind.Adapter, "1.5.0", "Nordic HFT Team",
             "Ultra-resilient WebSocket v2 streaming gateway for Kraken Pro spot and margin pairs featuring deterministic sequence gap detection.",
             29.00m, 4.9, 610),

            // Strategies
            ("MeanRevertingPairsStrategy", ExtensionKind.Strategy, "2.0.0", "Razor Quantitative Research",
             "Statistical arbitrage strategy trading cointegrated asset pairs using dynamic Kalman-filtered hedge ratios and Bollinger z-score bands.",
             99.00m, 5.0, 1850),

            ("OrderBookImbalanceStrategy", ExtensionKind.Strategy, "1.8.3", "Apex Alpha Systems",
             "Microstructure market making model calculating real-time queue priority, volume-weighted order imbalance, and toxic flow evasion.",
             149.00m, 4.9, 1140),

            ("AtrVolatilitySurgeStrategy", ExtensionKind.Strategy, "1.3.0", "TrendEdge Capital",
             "Adaptive trend-following engine that identifies volatility compression zones and executes high-momentum directional surges with trailing ATR stops.",
             0m, 4.8, 2200),

            ("GridMarketMakerStrategy", ExtensionKind.Strategy, "2.2.1", "LiquidityWorks",
             "Dynamic multi-level geometric grid market maker with inventory skew compensation and automatic volatility expansion spacing.",
             79.00m, 4.7, 1340),

            // Indicators
            ("VolumeProfileIndicator", ExtensionKind.Indicator, "2.1.0", "Razor Quantitative Research",
             "Session-segmented Volume Profile computing developing Point of Control (VPOC), Value Area High (VAH), and Value Area Low (VAL).",
             0m, 4.9, 3100),

            ("CvdIndicator", ExtensionKind.Indicator, "1.4.0", "FlowMetrics Pro",
             "Real-time Cumulative Volume Delta (CVD) tracking aggressive taker buyer versus seller flow with delta divergence alerts.",
             39.00m, 5.0, 1680),

            ("HurstExponentIndicator", ExtensionKind.Indicator, "1.1.2", "Statistical Dynamics",
             "Adaptive Hurst exponent estimator measuring mean-reverting (H < 0.5) vs persistent trending (H > 0.5) market regimes on rolling windows.",
             0m, 4.8, 1250),

            // Neural Networks
            ("MlpAlphaModel", ExtensionKind.NeuralNetwork, "1.0.4", "DeepQuant Labs",
             "Multi-layer perceptron trained on normalized L2 orderbook features and micro-returns for 1-minute directional return forecasting.",
             199.00m, 4.8, 890),

            ("TcnVolatilityModel", ExtensionKind.NeuralNetwork, "2.0.1", "Neural Alpha Lab",
             "Temporal Convolutional Network with causal dilated convolutions forecasting instantaneous realized volatility and tail risk.",
             249.00m, 4.9, 640),

            // Hook Plugins
            ("DrawdownCircuitBreakerPlugin", ExtensionKind.HookPlugin, "1.2.0", "Razor Platform Core",
             "Institutional risk guard monitoring portfolio equity and executing graceful cancel-and-drain triggers when max daily drawdown is hit.",
             0m, 5.0, 4200),

            ("WebhookAlertPlugin", ExtensionKind.HookPlugin, "1.1.0", "DevOps Trading Utilities",
             "Asynchronous notification dispatcher firing rich payload alerts to Slack, Discord, and Telegram webhooks on order fills and risk alerts.",
             0m, 4.8, 3500)
        };

        foreach (var item in additives)
        {
            if (!await db.MarketplaceItems.AnyAsync(m => m.Name == item.Name).ConfigureAwait(false))
            {
                db.MarketplaceItems.Add(new MarketplaceItem
                {
                    Id = Guid.NewGuid(),
                    Name = item.Name,
                    Kind = item.Kind,
                    Version = item.Version,
                    Author = item.Author,
                    Description = item.Description,
                    Price = item.Price,
                    Rating = item.Rating,
                    Downloads = item.Downloads,
                    IsCurated = true,
                    SdkVersion = "1.0.0",
                    CreatedAt = now
                });
            }
        }
    }
}
