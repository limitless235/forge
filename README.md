# FORGE

**Feedback-Optimized Reinforcement Generation Engine**

FORGE is a silent inference-time quality loop for AI coding tools. It intercepts LLM code generation calls, scores output against configurable reward signals (tests, lint, types, complexity, LLM judge), iterates until quality passes a threshold, and returns only the best-scoring candidate.

> *Every output, forged not drafted.*

## Architecture

```
packages/
├── core/     @forge/core   — Loop engine, types, scoring, multi-provider LLM
├── rewards/  @forge/rewards — Built-in reward functions
└── mcp/      @forge/mcp    — MCP server + CLI + watch daemon
```

## Quick Start

### Prerequisites

- Node.js 20+
- An API key for your chosen LLM provider (see below)

### Install

```bash
npm install
npm run build
```

### Initialize a project

```bash
npx forge init
```

### Register MCP server (auto-enforces via Cursor rules)

```bash
npx forge install --cursor
```

This registers the MCP server in `.cursor/mcp.json`, writes `.cursor/rules/forge.mdc` with `alwaysApply: true`, and passes your API key env var to the MCP process.

**Claude Code:**

```bash
npx forge install --claude-code
```

### Environment

```bash
cp .env.example .env
# Set the API key matching your llm.provider in .forge.json
```

### Auto-run on file saves (no manual tool calls)

```bash
npx forge watch
```

Runs a background quality loop whenever source files are saved. Configure in `.forge.json` under `watch`.

### Verify

```bash
npx forge ping
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `forge.generate` | Generate quality-looped code for a file (required for agent code tasks) |
| `forge.stats` | View quality statistics from `.forge/scores.jsonl` |

## LLM Providers

Configure in `.forge.json`:

```json
{
  "llm": {
    "provider": "openai",
    "apiKeyEnv": "OPENAI_API_KEY",
    "generatorModel": "gpt-4.1",
    "judgeModel": "gpt-4.1-mini"
  }
}
```

| Provider | `llm.provider` | Default env var |
|----------|--------------|-----------------|
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Google | `google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Custom endpoint | `openai-compatible` | `FORGE_API_KEY` + `llm.baseUrl` |

Top-level `generatorModel` / `judgeModel` still work for backward compatibility; `llm.*` takes precedence when set.

## Watch Mode

```json
{
  "watch": {
    "enabled": true,
    "mode": "refine",
    "debounceMs": 2000,
    "include": ["src/**/*.{ts,py}"],
    "exclude": ["node_modules/**", "dist/**"]
  }
}
```

| Mode | Behavior |
|------|----------|
| `refine` | Rewrite files that score below threshold after save |
| `score-only` | Log scores to `.forge/scores.jsonl` without rewriting |

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
