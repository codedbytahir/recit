#!/usr/bin/env node

import { startRecording, stopRecording, getRecordingStatus, getActiveCount } from "../core/recorder.js";
import { captureScreenshot } from "../core/screenshot.js";
import { extractFrames } from "../core/frames.js";

const args = process.argv.slice(2);
const command = args[0];

function parseFlags(args: string[]): Record<string, string | number | boolean | undefined> {
  const flags: Record<string, string | number | boolean | undefined> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith("--")) {
        flags[key] = isNaN(Number(val)) ? val : Number(val);
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function output(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    if (typeof data === "object" && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        process.stderr.write(`  ${key}: ${value}\n`);
      }
    } else {
      process.stderr.write(String(data) + "\n");
    }
  }
}

async function main(): Promise<void> {
  const json = args.includes("--json");
  const flags = parseFlags(args);

  switch (command) {
    case "start": {
      const result = startRecording({
        output: flags.output as string | undefined,
        fps: flags.fps as number | undefined,
      });
      output({ action: "recording_started", ...result }, json);
      break;
    }

    case "stop": {
      const id = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
      if (!id) {
        process.stderr.write("Error: recording ID required. Usage: recit stop <id>\n");
        process.exit(1);
      }
      const result = stopRecording(id);
      output({ action: "recording_stopped", id, ...result }, json);
      break;
    }

    case "snap": {
      const result = captureScreenshot({
        output: flags.output as string | undefined,
      });
      output({ action: "screenshot_captured", ...result }, json);
      break;
    }

    case "frames": {
      const video = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
      if (!video) {
        process.stderr.write("Error: video path required. Usage: recit frames <video> [--max 10]\n");
        process.exit(1);
      }
      const result = extractFrames({
        video,
        maxFrames: flags.max as number | undefined,
        outputDir: flags.output as string | undefined,
      });
      output({ action: "frames_extracted", ...result }, json);
      break;
    }

    case "status": {
      const id = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
      if (id) {
        const status = getRecordingStatus(id);
        output(status, json);
      } else {
        output({ activeRecordings: getActiveCount() }, json);
      }
      break;
    }

    case "mcp": {
      const { startMcpServer } = await import("../mcp/server.js");
      await startMcpServer();
      break;
    }

    case "--help":
    case "-h":
    case undefined: {
      console.log(`
  recit — Screen recording tool for AI agents
  
  Usage:
    recit start [--output path] [--fps 15] [--json]
    recit stop <id> [--json]
    recit snap [--output path] [--json]
    recit frames <video> [--max 20] [--output dir]
    recit status [id]
    recit mcp                    # Start MCP server (stdio)
  
  As MCP server:
    claude mcp add recit -- npx -y recit
  
  Examples:
    recit start --output ./demo.mp4 --json
    recit snap --json
    recit frames ./demo.mp4 --max 10
    recit status

  $0 cost. No cloud. No API keys. 100% local.
`);
      break;
    }

    default:
      process.stderr.write(`Unknown command: ${command}\nRun 'recit --help' for usage.\n`);
      process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
