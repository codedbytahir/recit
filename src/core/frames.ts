import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, mkdirSync, readdirSync } from "node:fs";

export interface FrameExtractionOptions {
  video: string;
  outputDir?: string;
  maxFrames?: number;
  interval?: number;
  sceneThreshold?: number;
}

export interface FrameExtractionResult {
  frames: string[];
  count: number;
  outputDir: string;
}

function generateOutputDir(outputDir?: string): string {
  if (outputDir) return outputDir;
  const ts = Date.now();
  const dir = join(tmpdir(), `recit_frames_${ts}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function extractFrames(opts: FrameExtractionOptions): FrameExtractionResult {
  if (!existsSync(opts.video)) {
    throw new Error(`Video file not found: ${opts.video}`);
  }

  const outputDir = generateOutputDir(opts.outputDir);
  const threshold = opts.sceneThreshold ?? 0.3;
  const maxFrames = opts.maxFrames ?? 20;

  const args = [
    "-y",
    "-i", opts.video,
    "-vf", `select='gt(scene,${threshold})',setpts=N/FRAME_RATE/TB`,
    "-vsync", "vfr",
    "-frames:v", String(maxFrames),
    "-q:v", "2",
    join(outputDir, "frame_%04d.png"),
  ];

  const result = spawnSync("ffmpeg", args, { stdio: "ignore", timeout: 60000 });

  if (result.status !== 0) {
    throw new Error(`Frame extraction failed (exit code ${result.status})`);
  }

  const frames = readdirSync(outputDir)
    .filter((f: string) => f.endsWith(".png"))
    .sort()
    .map((f: string) => join(outputDir, f));

  return { frames, count: frames.length, outputDir };
}
