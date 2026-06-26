# FORGE

**Feedback-Optimized Reinforcement Generation Engine**

FORGE is a silent inference-time quality loop for AI coding tools. It intercepts LLM code generation calls, scores output against configurable reward signals (tests, lint, types, complexity, LLM judge), iterates until quality passes a threshold, and returns only the best-scoring candidate.

> *Every output, forged not drafted.*

## Architecture

```
packages/
├── core/     @forge/core   — Loop engine, types, scoring
├── rewards/  @forge/rewards — Built-in reward functions
└── mcp/      @forge/mcp    — MCP server + CLI
```

## Quick Start

### Prerequisites

- Node.js 20+
- `ANTHROPIC_API_KEY` environment variable

### Install

```bash
npm install
npm run build
```

### Initialize a project

```bash
npx forge init
```

### Register MCP server

**Cursor:**

```bash
npx forge install --cursor
```

**Claude Code:**

```bash
npx forge install --claude-code
```

### Environment

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env or your shell environment
```

### Verify

```bash
npx forge ping
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `forge.generate` | Generate quality-looped code for a file |
| `forge.stats` | View quality statistics from `.forge/scores.jsonl` |

## Configuration

Project config lives in `.forge.json`:

```json
{
  "maxIterations": 4,
  "scoreThreshold": 0.82,
  "rewards": {
    "tests": 0.45,
    "linter": 0.20,
    "types": 0.20,
    "complexity": 0.10,
    "llm_judge": 0.05
  }
}
```

See the full spec for reward function details, custom rewards, and glob overrides.

## Development

```bash
npm run build      # Build all packages
npm test           # Run tests
npm run typecheck  # Type-check all packages
```

## License

MIT
