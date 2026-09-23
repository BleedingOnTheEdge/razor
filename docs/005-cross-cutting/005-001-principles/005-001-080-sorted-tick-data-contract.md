---
id: product:razor/cross-cutting/principles/sorted-tick-data-contract
parent: product:razor/cross-cutting/principles
title: 8. Sorted Tick Data Contract
level: product
kind: cross-cutting
---

# 8. Sorted Tick Data Contract
**Adapters must guarantee that ticks stored in binary files are sorted by ascending time.**  
Razor relies on this invariant for efficient merging and window computation.

- `BinaryDataMapper.WriteTicksToBinary` and the memory‑mapped reader assume sorted data.
- A debug‑only assertion must verify sorted order when opening a file; unsorted data is an adapter error and must throw `AdapterException`.
- Adapters that synthesise ticks from bars are responsible for producing a correctly sorted array.
- Live tick streams are not guaranteed sorted, but the pipeline merges them chronologically; this principle applies only to historical data.

---
