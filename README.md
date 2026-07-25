# recit

> **Record it. Agents see it.**

Free, open-source screen recording CLI + MCP server for AI agents. Zero cost. 100% local. No cloud. No API keys.

## Features

- **Screen Recording** — Capture full screen, windows, or regions via ffmpeg
- **Screenshots** — Instant PNG capture with JSON metadata output
- **MCP Server** — 5 tools exposed via Model Context Protocol (stdio)
- **Frame Extraction** — Scene-detection key frames for vision model analysis
- **Event Logging** — JSONL event log synced to video clock (clicks, keystrokes, annotations)
- **Cross-Platform** — macOS, Windows, Linux
- **$0 Cost** — No APIs, no cloud, no hosting, no subscriptions

## Quick Start

```bash
# For Claude Code
claude mcp add recit -- npx -y @codedbytahir/recit

# For Cursor / VS Code — add to mcp.json:
{
  "mcpServers": {
    "recit": {
      "command": "npx",
      "args": ["-y", "recit"]
    }
  }
}

# Prerequisites (both free)
brew install ffmpeg       # macOS
sudo apt install ffmpeg   # Ubuntu/Debian
winget install ffmpeg     # Windows
```

## CLI Usage

```bash
# Start recording
recit start [--output path] [--fps 15] [--json]

# Stop recording
recit stop <id> [--json]

# Capture screenshot
recit snap [--output path] [--json]

# Extract frames from video
recit frames <video> [--max 20] [--output dir]

# Check recording status
recit status [id]

# Start MCP server
recit mcp
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `recit_start` | Start screen recording |
| `recit_stop` | Stop recording, get file path |
| `recit_snap` | Capture screenshot |
| `recit_frames` | Extract key frames from video |
| `recit_status` | Get recording status or active count |

## Architecture

```
AI Agent (Claude/Codex/Cursor)
    │
    │ stdio (stdin/stdout)
    ▼
recit MCP Server (Node.js, local)
    │
    │ child_process
    ▼
ffmpeg (free, local)
    │
    ▼
.mp4 / .png saved to user's disk
```

**$0 spent. Nothing uploaded. Everything local.**

## Development

```bash
git clone https://github.com/recit-ai/recit.git
cd recit
npm install
npm test        # Run 43 tests
npm run build   # Build TypeScript
```

## Tech Stack

| Layer | Tool | Cost |
|-------|------|------|
| Recording | ffmpeg | $0 |
| Agent Integration | MCP SDK (stdio) | $0 |
| Distribution | npm | $0 |
| Code Hosting | GitHub | $0 |
| Runtime | Node.js | $0 |
| Testing | Vitest | $0 |

## License

Apache 2.0
