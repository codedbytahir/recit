import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSpawnSync = vi.fn(() => ({ status: 0 }));
const mockExistsSync = vi.fn(() => true);
const mockMkdirSync = vi.fn();
const mockReaddirSync = vi.fn(() => ["frame_0001.png", "frame_0002.png", "frame_0003.png"]);

vi.mock("node:child_process", () => ({
  spawnSync: (...args: any[]) => mockSpawnSync(...args),
  spawn: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  readdirSync: (...args: any[]) => mockReaddirSync(...args),
}));

import { extractFrames } from "../src/core/frames.js";

describe("frames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue({ status: 0 });
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockImplementation(() => {});
    mockReaddirSync.mockReturnValue(["frame_0001.png", "frame_0002.png", "frame_0003.png"]);
  });

  it("should throw if video file does not exist", () => {
    mockExistsSync.mockReturnValueOnce(false);
    expect(() => extractFrames({ video: "/nonexistent/video.mp4" })).toThrow("Video file not found");
  });

  it("should call ffmpeg with scene detection filter", () => {
    extractFrames({ video: "/tmp/test.mp4" });
    expect(mockSpawnSync).toHaveBeenCalledWith(
      "ffmpeg",
      expect.arrayContaining(["-vf", expect.stringContaining("scene")]),
      expect.any(Object)
    );
  });

  it("should return extracted frame paths", () => {
    const result = extractFrames({ video: "/tmp/test.mp4" });
    expect(result.frames.length).toBe(3);
    expect(result.count).toBe(3);
    expect(result.frames[0]).toContain("frame_0001.png");
  });

  it("should respect maxFrames parameter", () => {
    extractFrames({ video: "/tmp/test.mp4", maxFrames: 5 });
    const args = mockSpawnSync.mock.calls[0][1] as string[];
    expect(args).toContain("-frames:v");
    const idx = args.indexOf("-frames:v");
    expect(args[idx + 1]).toBe("5");
  });

  it("should use custom scene threshold", () => {
    extractFrames({ video: "/tmp/test.mp4", sceneThreshold: 0.5 });
    expect(mockSpawnSync).toHaveBeenCalledWith(
      "ffmpeg",
      expect.arrayContaining(["-vf", expect.stringContaining("0.5")]),
      expect.any(Object)
    );
  });

  it("should create output directory", () => {
    extractFrames({ video: "/tmp/test.mp4" });
    expect(mockMkdirSync).toHaveBeenCalled();
  });

  it("should return outputDir in result", () => {
    const result = extractFrames({ video: "/tmp/test.mp4" });
    expect(result.outputDir).toBeDefined();
    expect(typeof result.outputDir).toBe("string");
  });

  it("should use custom outputDir when provided", () => {
    const result = extractFrames({ video: "/tmp/test.mp4", outputDir: "/tmp/my_frames" });
    expect(result.outputDir).toBe("/tmp/my_frames");
  });
});
