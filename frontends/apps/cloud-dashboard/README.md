# Razor Cloud Dashboard (`cloud-dashboard`)

Institutional Operator Control Plane for the **Razor Trading Platform**. Built with Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons, and `@razor/ui-kit`.

---

## 1. Overview & Capabilities

The Razor Cloud Dashboard provides algorithmic trading operators, risk managers, and quant developers with an authoritative interface for managing distributed execution engines and inspecting historical runs:

- **System Overview (`/`)**: Real-time fleet health metrics, active connection telemetry, and reactive domain event updates via Server-Sent Events (SSE).
- **Engine Fleet Directory (`/instances`)**: Filterable registry of connected Engine instances with load statistics (CPU, memory, active runs) and registration modal.
- **Instance Detail & Hot-Swapping (`/instances/[id]`)**: Extension profile slot hot-swapping (Adapter, Strategy, NeuralNetwork, HookPlugins) and direct engine command dispatch console (`SoftReload`, `PauseTrading`, `ResumeTrading`, `Drain`).
- **Flow Runs Registry (`/runs`)**: Complete audit trail of backtests, paper trading, and live executions with deterministic run rankings leaderboard and run launcher.
- **Lineage DAG & Checkpoint Explorer (`/runs/[id]/lineage`)**: Hierarchical tree visualization of checkpoints, lineage relations (Original, Appended, Branched, Spliced), parameter diffs, branching, and state restoration.
- **Performance & Audit Report (`/reports/[id]`)**: Quantitative metrics (PnL, ROI, Sharpe Ratio, Max Drawdown, Fitness), comparability certification badges, execution gaps, and append-only operator intervention log.

---

## 2. Prerequisites & Environment

- **Node.js**: >= 22.0.0
- **Package Manager**: pnpm >= 10.0.0
- **Razor Cloud Backend**: Running on port `5000` (`http://localhost:5000`)

### Configuration

Copy the template configuration:

```bash
cp .env.example .env.local
```

Configurable variables:

| Variable | Description | Default |
|---|---|---|
| `API_BASE_URL` | Base HTTP endpoint for the Cloud REST API | `http://localhost:5000` |
| `NEXT_PUBLIC_API_BASE_URL` | Client-accessible Cloud API base URL | `http://localhost:5000` |
| `MANAGEMENT_API_KEY` | Operator API key for `X-Cloud-Management-Key` header | `""` |
| `PORT` | Local HTTP listening port | `3002` |

---

## 3. Development Commands

Run from monorepo root:

```bash
# Start local dev server (port 3002)
pnpm --filter cloud-dashboard dev

# Execute unit and component test suite (Vitest + Testing Library)
pnpm --filter cloud-dashboard test

# Typecheck and build production bundle
pnpm --filter cloud-dashboard build

# Launch compiled production server
pnpm --filter cloud-dashboard start
```

Or run via Nx:

```bash
nx run cloud-dashboard:build
nx run cloud-dashboard:test
```

---

## 4. Production Container Deployment

Build and run using the optimized multi-stage Alpine Dockerfile:

```bash
# Build container image from repo root
docker build -f frontends/apps/cloud-dashboard/Dockerfile -t razor/cloud-dashboard:latest .

# Run containerized control plane on port 3002
docker run -p 3002:3002 -e API_BASE_URL=http://host.docker.internal:5000 razor/cloud-dashboard:latest
```

---

## 5. Architectural Standards

- **Hexagonal Architecture**: API communications are decoupled via `@razor/api-client` and `@razor/contracts`.
- **Temporal Hygiene**: All dates are ingested as UTC ISO-8601 strings and formatted to the operator's locale and timezone client-side.
- **Accessibility**: Complies with WCAG 2.2 AA (semantic HTML, ARIA labels, focus rings, accessible live toast regions).
- **Zero Raw Exceptions**: Network errors, validation mismatches, and command failures display actionable feedback via the accessible toast system and route-level error boundaries.
