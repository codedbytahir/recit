import { platform } from "node:os";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, statSync } from "node:fs";

export interface RecordingOptions {
  output?: string;
  window?: string;
  region?: { x: number; y: number; w: number; h: number };
  fps?: number;
}

export interface RecordingResult {
  id: string;
  path: string;
  pid: number;
}

export interface RecordingStatus {
  id: string;
  path: string;
  pid: number;
  running: boolean;
  startedAt: number;
}

const activeRecordings = new Map<string, { process: ChildProcess; path: string; pid: number; startedAt: number }>();

let counter = 0;

function getPlatformArgs(output: string, fps: number, region?: { x: number; y: number; w: number; h: number }): string[] {
  const os = platform();
  const base = ["-y"];

  if (region) {
    const { x, y, w, h } = region;
    if (os === "darwin") {
      return [...base, "-f", "avfoundation", "-framerate", String(fps), "-video_size", `${w}x${h}`, "-i", `1`, "-vf", `crop=${w}:${h}:${x}:${y}`, output];
    }
    if (os === "win32") {
      return [...base, "-f", "gdigrab", "-framerate", String(fps), "-offset_x", String(x), "-offset_y", String(y), "-video_size", `${w}x${h}`, "-i", "desktop", output];
    }
    return [...base, "-f", "x11grab", "-framerate", String(fps), "-video_size", `${w}x${h}`, "-i", `:0.0+${x},${y}`, output];
  }

  if (os === "darwin") {
    return [...base, "-f", "avfoundation", "-framerate", String(fps), "-i", "1", output];
  }
  if (os === "win32") {
    return [...base, "-f", "gdigrab", "-framerate", String(fps), "-i", "desktop", output];
  }
  return [...base, "-f", "x11grab", "-framerate", String(fps), "-i", ":0.0", output];
}

function generateOutputPath(output?: string): string {
  if (output) return output;
  const ts = Date.now();
  return join(tmpdir(), `recit_rec_${ts}.mp4`);
}

function generateId(): string {
  counter++;
  return `rec_${counter}_${Date.now()}`;
}

export function startRecording(opts: RecordingOptions = {}): RecordingResult {
  const output = generateOutputPath(opts.output);
  const fps = opts.fps ?? 15;
  const args = getPlatformArgs(output, fps, opts.region);
  const proc = spawn("ffmpeg", args, { stdio: "ignore" });

  if (!proc.pid) {
    throw new Error("Failed to start ffmpeg process. Is ffmpeg installed?");
  }

  const id = generateId();
  activeRecordings.set(id, {
    process: proc,
    path: output,
    pid: proc.pid,
    startedAt: Date.now(),
  });

  proc.on("close", () => {
    activeRecordings.delete(id);
  });

  return { id, path: output, pid: proc.pid };
}

export function stopRecording(id: string): { path: string; duration: number; size: number } {
  const rec = activeRecordings.get(id);
  if (!rec) {
    throw new Error(`No active recording with id: ${id}`);
  }

  rec.process.kill("SIGINT");
  const duration = (Date.now() - rec.startedAt) / 1000;

  let size = 0;
  try {
    if (existsSync(rec.path)) {
      size = statSync(rec.path).size;
    }
  } catch {
    // file might not exist if recording was very short
  }

  return { path: rec.path, duration: Math.round(duration * 10) / 10, size };
}

export function getRecordingStatus(id: string): RecordingStatus {
  const rec = activeRecordings.get(id);
  if (!rec) {
    throw new Error(`No recording with id: ${id}`);
  }
  return {
    id,
    path: rec.path,
    pid: rec.pid,
    running: true,
    startedAt: rec.startedAt,
  };
}

export function getActiveCount(): number {
  return activeRecordings.size;
}
