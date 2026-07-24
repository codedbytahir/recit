# RECIT — Screen Recording Tool for AI Agents
## Specification v1.0.0

### Identity
- **Name**: recit (pronounced "rek-it")
- **Tagline**: "Record it. Agents see it."
- **Package**: `@recit/cli` (CLI) + `@recit/mcp` (MCP Server)
- **License**: MIT
- **Philosophy**: $0 cost. Runs 100% locally. No cloud. No API keys.

---

### Core Modules

#### 1. `src/core/recorder.ts` — Screen Recording Engine
- **Purpose**: Wrap ffmpeg for cross-platform screen recording
- **Exports**: `startRecording(opts)`, `stopRecording(id)`, `getRecordingStatus(id)`
- **Behavior**:
  - `startRecording({ output?, window?, region?, fps? })` → spawns ffmpeg child process, returns `{ id, path, pid }`
  - `stopRecording(id)` → sends SIGINT to ffmpeg, returns `{ path, duration, size }`
  - Platform detection: macOS=avfoundation, Windows=gdigrab, Linux=x11grab
  - Default output: `/tmp/recit_<timestamp>.mp4`
  - Default FPS: 15

#### 2. `src/core/screenshot.ts` — Screenshot Capture
- **Purpose**: Instant screenshot capture
- **Exports**: `captureScreenshot(opts)`
- **Behavior**:
  - `captureScreenshot({ output?, window?, region? })` → returns `{ path, width, height, size }`
  - Uses ffmpeg single-frame capture: `-vframes 1`
  - Default output: `/tmp/recit_snap_<timestamp>.png`
  - Supports JSON output for agent consumption

#### 3. `src/core/frames.ts` — Frame Extraction
- **Purpose**: Extract key frames from video recordings
- **Exports**: `extractFrames(opts)`
- **Behavior**:
  - `extractFrames({ video, outputDir?, maxFrames?, interval? })` → returns `{ frames: string[], count }`
  - Scene detection: `select='gt(scene,0.3)'`
  - Outputs PNG frames to specified directory

#### 4. `src/core/events.ts` — Event Logger
- **Purpose**: Log events during recording synced to video clock
- **Exports**: `EventLogger` class
- **Behavior**:
  - Logs: mouse clicks, keystrokes, window switches, custom annotations
  - Output format: JSONL (one JSON object per line)
  - Each entry: `{ t: number, type: string, data: object }`
  - `t` = seconds since recording start (synced to video clock)

#### 5. `src/mcp/server.ts` — MCP Server
- **Purpose**: Expose all capabilities as MCP tools
- **Transport**: stdio (local, no cloud)
- **Tools exposed**:
  - `recit_start` — Start screen recording
  - `recit_stop` — Stop recording, get file path
  - `recit_snap` — Capture screenshot
  - `recit_frames` — Extract frames from video
  - `recit_status` — Get recording status
- **Input validation**: Zod schemas for all tool inputs

#### 6. `src/cli/index.ts` — CLI Entry Point
- **Purpose**: Command-line interface
- **Commands**:
  - `recit start [--output path] [--window title] [--fps n]`
  - `recit stop [id]`
  - `recit snap [--output path] [--window title] [--json]`
  - `recit frames <video> [--max n] [--output dir]`
  - `recit status [id]`

---

### Cross-Platform Matrix

| Platform | ffmpeg input | Screenshot method |
|----------|-------------|-------------------|
| macOS | `-f avfoundation -i "1"` | `-vframes 1` |
| Windows | `-f gdigrab -i desktop` | `-vframes 1` |
| Linux | `-f x11grab -i :0.0` | `-vframes 1` |

---

### Test Requirements

All tests must pass before shipping. Test coverage targets:
- `recorder.ts`: start/stop lifecycle, platform detection, error handling
- `screenshot.ts`: capture output exists, correct format, JSON output structure
- `frames.ts`: frame extraction produces expected count
- `events.ts`: JSONL format correctness, timestamp ordering
- `mcp/server.ts`: tool registration, input validation, response format

---

### File Output Contract

All file outputs follow:
- Default directory: OS temp dir (`os.tmpdir()`)
- Naming: `recit_<type>_<timestamp>.<ext>`
- JSON output mode: stdout returns JSON with `{ path, ...metadata }`
- Stderr: human-readable status messages only

---

### Zero-Cost Guarantee

- No external API calls
- No cloud services
- No paid dependencies
- ffmpeg is the only runtime dependency (bundled via ffmpeg-static or system-installed)
- MCP transport: stdio only (no HTTP server)
