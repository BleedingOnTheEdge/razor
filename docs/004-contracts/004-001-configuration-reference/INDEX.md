---
id: product:razor/contracts/configuration-reference
title: Razor Configuration Reference
level: product
kind: contract
domains: [engine, sdk]
flows: [strategy-development, backtest-run, optimisation-run, live-trading-session, extension-development]
keywords:
  - configuration reference
  - strategy specification
  - execution specification
  - optimisation specification
  - live specification
  - symbol properties
  - timeframe
  - gene attributes
  - data action policy
  - slot capabilities
  - hook system
  - validation
  - exceptions
references:
  - product:razor/contracts/extension-developer-guide
code_paths:
  - core/src/Sdk/Shared/**
  - core/src/Sdk/Hooks/**
  - core/src/Sdk/Slots/**
  - core/src/Kernel/Configuration/**
---

# Razor Configuration Reference

Every configuration object, enumeration, and data contract that controls Razor engine behaviour.
This section is the single source of truth for parameter names, types, validation rules and
acceptable values - use it when writing strategies, building adapters, or interpreting
Cloud-supplied payloads. The matching how-to material is in
`product:razor/contracts/extension-developer-guide`.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/contracts/configuration-reference/strategy-specification | `StrategySpecification` and `SymbolRequest`: account setup and the symbols/timeframes a strategy needs. | engine, sdk | strategy-development, backtest-run | core/src/Sdk/Shared/StrategySpecification.cs, core/src/Sdk/Shared/SymbolRequest.cs |
| product:razor/contracts/configuration-reference/execution-specification | `ExecutionSpecification`: the backtest/optimisation run environment. | engine, backtesting | backtest-run, optimisation-run | core/src/Kernel/Configuration/ExecutionSpecification.cs |
| product:razor/contracts/configuration-reference/optimization-specification | `OptimizationSpecification`: master seed, population and GA rates. | optimisation | optimisation-run | core/src/Kernel/Configuration/OptimizationSpecification.cs |
| product:razor/contracts/configuration-reference/live-specification | `LiveSpecification`: magic number and order guard timeout. | live-trading | live-trading-session | core/src/Kernel/Configuration/LiveSpecification.cs |
| product:razor/contracts/configuration-reference/slot-capability-interfaces | The three slot interfaces: `IAdapterCapability`, `IStrategyCapability`, `INeuralNetworkModel`. | sdk, extensions | extension-development | core/src/Sdk/Slots/** |
| product:razor/contracts/configuration-reference/market-data-types | `SymbolProperties`, `TimeFrame`, `DataActionPolicy` and the enums they use. | sdk, data | | core/src/Sdk/Shared/SymbolProperties.cs, core/src/Sdk/Shared/TimeFrame.cs, core/src/Sdk/Shared/DataActionPolicy.cs |
| product:razor/contracts/configuration-reference/gene-attributes | `GeneAttribute` and `GeneType`: the gene schema the GA optimises. | sdk, optimisation | strategy-development, optimisation-run | core/src/Sdk/Shared/GeneAttribute.cs |
| product:razor/contracts/configuration-reference/hook-system | The hook contract: registration interfaces, contexts, priorities and the hook catalogue. | extensions | extension-development | core/src/Sdk/Hooks/** |
| product:razor/contracts/configuration-reference/validation-and-exceptions | How specifications validate, and the exceptions they throw. | engine, sdk | | core/src/Sdk/Shared/Exceptions.cs |
