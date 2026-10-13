---
id: product:razor/blueprint/project-overview/market-and-business
parent: product:razor/blueprint/project-overview
title: Market and Business
level: product
kind: blueprint
keywords:
  - target audience
  - users
  - users groups
  - competitors
  - competitive landscape
  - metatrader
  - tradingview
  - quantconnect
  - business model
  - pricing
  - subscription tiers
  - reporting
  - monitoring
  - alerts
references:
  - product:razor/blueprint/project-overview/what-razor-is
  - product:razor/blueprint/product-model
---

# Market and Business

Who Razor is for, why it wins against the alternatives, and how it is sold.

## Who it is for

Three primary groups, in priority order:

1. **Independent quants and traders** - individuals developing and deploying their own algorithmic
   strategies. They need a powerful yet accessible toolset that does not demand a full-time
   engineering team.
2. **Proprietary trading firms and hedge funds** - teams with existing trading infrastructure who
   want advanced optimisation and machine learning while keeping control of their data and their
   execution environment.
3. **Brokers and exchanges** - institutional partners who want to offer advanced strategy
   development and optimisation to their clients, increasing engagement and trading volume.

## Why reporting is treated as the product

For a professional trader, reporting is not an afterthought. Decisions about capital allocation, risk
limits and strategy viability rest entirely on the quality and depth of the analytics available.

Razor therefore treats reporting as a first-class feature. Every trade, every tick and every
generation of an optimisation run produces data that is stored, processed and made available for
interactive exploration. Traders can drill into per-symbol performance, examine correlation
heatmaps, reconstruct equity curves from any starting point, and export fully formatted reports
(Excel, JSON, PDF) in one action - without a spreadsheet or a statistics package.

Real-time monitoring extends the same philosophy to live trading. The Cloud dashboard shows what the
engine is doing, moment by moment: open positions, pending orders, current drawdown, margin
utilisation and health. Alerts fire on configured conditions - a margin call, an unexpected
disconnect, a drawdown threshold breach - so the trader stays informed away from the screen. That
reporting depth is a competitive differentiator, not a supporting feature.

## The competitive landscape

Razor has no direct like-for-like competitor. The closest platforms are well known, but each serves a
different primary purpose:

- **MetaTrader 4/5** - the most widely used retail platform. Strong for manual and simple automated
  trading, but backtesting is bar-based, optimisation is a brute-force single pass, reporting is a
  static HTML statement with no interactive depth, and there is no remote management or advanced ML
  integration.
- **TradingView** - powerful charting and a popular scripting language. Its strategy tester is
  lightweight: no serious optimisation engine, no genetic algorithms, no walk-forward analysis, and
  it cannot act as a remote-controlled live trading command centre.
- **QuantConnect** - a cloud platform built on the open-source LEAN engine. It offers backtesting and
  some optimisation, but the engine runs on QuantConnect's servers, so a trader cannot deploy a
  private engine on their own hardware with cloud-based control - a real concern for institutional
  data privacy.
- **NinjaTrader, AmiBroker, cTrader** - each strong in a niche (futures, equities, CFDs). All offer
  scripting and basic backtesting; none makes advanced optimisation or continuous live
  re-optimisation a core mission, and reporting is functional rather than a differentiator.
- **Custom in-house systems** - maximum flexibility at the cost of significant engineering resource
  and ongoing maintenance, which is impractical for smaller teams.

None of these treats **strategy optimisation as its reason for existing**. None combines private
engine deployment, cloud-based control, an extension marketplace and institutional-depth reporting.
Razor occupies that intersection.

## Business model

Sold as a per-user subscription with tiered pricing by feature and usage:

- **Free Developer tier** - full access to the SDK and Engine with limits (mock adapter for live
  trading, restricted historical data range). Intended for learning and development.
- **Professional tier** - full live trading, unlimited backtests, standard support, one engine
  instance.
- **Enterprise tier** - multiple engine instances, advanced scheduling, custom report templates,
  priority support and dedicated account management.

Additional revenue comes from marketplace transaction fees on extension sales and from professional
services for custom adapter and strategy development.
