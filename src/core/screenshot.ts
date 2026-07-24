import { platform } from "node:os";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, statSync } from "node:fs";

export interface ScreenshotOptions {
  output?: string;
  window?: string;
  region?: { x: number; y: number; w: number; h: number };
}

export interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

function generateOutputPath(output?: string): string {
  if (output) return output;
  const ts = Date.now();
  return join(tmpdir(), `recit_snap_${ts}.png`);
}

function getScreenshotArgs(output: string, region?: { x: number; y: number; w: number; h: number }): string[] {
  const os = platform();

  if (region) {
    const { x, y, w, h } = region;
    if (os === "darwin") {
      return ["-y", "-f", "avfoundation", "-i", "1", "-vframes", "1", "-vf", `crop=${w}:${h}:${x}:${y}`, output];
    }
    if (os === "win32") {
      return ["-y", "-f", "gdigrab", "-offset_x", String(x), "-offset_y", String(y), "-video_size", `${w}x${h}`, "-i", "desktop", "-vframes", "1", output];
    }
    return ["-y", "-f", "x11grab", "-video_size", `${w}x${h}`, "-i", `:0.0+${x},${y}`, "-vframes", "1", output];
  }

  if (os === "darwin") {
    return ["-y", "-f", "avfoundation", "-i", "1", "-vframes", "1", output];
  }
  if (os === "win32") {
    return ["-y", "-f", "gdigrab", "-i", "desktop", "-vframes", "1", output];
  }
  return ["-y", "-f", "x11grab", "-i", ":0.0", "-vframes", "1", output];
}

export function captureScreenshot(opts: ScreenshotOptions = {}): ScreenshotResult {
  const output = generateOutputPath(opts.output);
  const args = getScreenshotArgs(output, opts.region);

  const result = spawnSync("ffmpeg", args, { stdio: "ignore", timeout: 10000 });

  if (result.status !== 0) {
    throw new Error(`Screenshot capture failed (exit code ${result.status}). Is ffmpeg installed?`);
  }

  if (!existsSync(output)) {
    throw new Error(`Screenshot file was not created at: ${output}`);
  }

  const stat = statSync(output);

  return {
    path: output,
    width: 0, // would need ffprobe to determine
    height: 0,
    size: stat.size,
    format: output.endsWith(".png") ? "png" : "jpg",
  };
}
