# Razor Marketplace (`marketplace`)

Institutional Extension Ecosystem & Publisher Portal for the **Razor Trading Platform**. Built with Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons, and `@razor/ui-kit`.

---

## 1. Overview & Capabilities

The Razor Marketplace provides quantitative researchers, algorithm developers, and execution operators with a secure, curated ecosystem to discover, inspect, test, and hot-deploy zero-allocation trading extensions:

- **Discovery & Catalogue (`/`, `/explore`)**: Categorised discovery across Strategy, Adapter, Indicator, NeuralNetwork, and HookPlugin slots. Instant search, multi-factor sorting (Popularity, Highest Rated, Newest, Name, Price), and interactive tag filtering (`#zero-alloc`, `#hft`, `#crypto`, `#equities`, `#onnx`).
- **Extension Specification View (`/extensions/[id]`)**: Deep manifest inspection, permission declarations (`MarketData:Read`, `OrderExecution:Write`, `SharedMemory:ZeroCopy`), author credentials, semver release history, operator ratings breakdown, and interactive documentation preview.
- **Direct Engine Deployment Modal**: Select active connected Razor execution engines (via Cloud API `/api/instances`) and hot-deploy the extension directly to designated engine profile slots.
- **Operator Review & Rating Dialog**: Interactive 5-star rating and verification modal for hedge funds and proprietary trading operators to rate extension stability and execution metrics.
- **Publisher Submission Portal (`/publish`)**: End-to-end manifest validator and publication portal for quantitative developers to publish new algorithm packages with live JSON schema preview.

---

## 2. Prerequisites & Environment

- **Node.js**: >= 22.0.0
- **Package Manager**: pnpm >= 10.0.0
- **Razor Cloud Backend**: Running on port `5000` (`http://localhost:5000`)

### Configuration

Copy the configuration template:

```bash
cp .env.example .env.local
```

Configurable environment variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local HTTP listening port | `3001` |
| `API_BASE_URL` | Base HTTP endpoint for the Cloud REST API | `http://localhost:5000` |
| `NEXT_PUBLIC_API_BASE_URL` | Client-accessible Cloud API base URL | `http://localhost:5000` |
| `NEXT_PUBLIC_MANAGEMENT_API_KEY` | Operator API key for `X-Cloud-Management-Key` header | `""` |

---

## 3. Development Commands

Run from monorepo root:

```bash
# Start local dev server (port 3001)
pnpm --filter marketplace dev

# Execute component and integration test suite (Vitest + Testing Library)
pnpm --filter marketplace test

# Typecheck and build standalone production bundle
pnpm --filter marketplace build

# Launch compiled production server
pnpm --filter marketplace start
```

Or run via Nx:

```bash
nx run marketplace:build
nx run marketplace:test
nx run marketplace:lint
```

---

## 4. Production Container Deployment

Build and run using the optimized multi-stage Alpine Dockerfile:

```bash
# Build container image from monorepo root
docker build -f frontends/apps/marketplace/Dockerfile -t razor/marketplace:latest .

# Run containerized marketplace on port 3001
docker run -p 3001:3001 -e API_BASE_URL=http://host.docker.internal:5000 razor/marketplace:latest
```

---

## 5. Architectural Standards

- **Hexagonal Architecture**: API communications are decoupled via `@razor/api-client` and `@razor/contracts`.
- **Apple Design & Frontend Design Principles**: Fluid feedback, restrained elevation, dark glassmorphic surfaces, accessible WCAG 2.2 AA contrast ratios, and tactile active press responses (`active:scale-[0.98]`).
- **Resilient Fallbacks**: Graceful degradation when network disconnects or API endpoints return errors, with full error boundaries and user-friendly diagnostics.
