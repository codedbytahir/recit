import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSpawnSync = vi.fn(() => ({ status: 0 }));
const mockExistsSync = vi.fn(() => true);
const mockStatSync = vi.fn(() => ({ size: 2048 }));

vi.mock("node:child_process", () => ({
  spawnSync: (...args: any[]) => mockSpawnSync(...args),
  spawn: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  statSync: (...args: any[]) => mockStatSync(...args),
}));

import { captureScreenshot } from "../src/core/screenshot.js";

describe("screenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnSync.mockReturnValue({ status: 0 });
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 2048 });
  });

  it("should call ffmpeg with correct args for single-frame capture", () => {
    captureScreenshot();
    expect(mockSpawnSync).toHaveBeenCalledWith(
      "ffmpeg",
      expect.arrayContaining(["-vframes", "1"]),
      expect.any(Object)
    );
  });

  it("should use custom output path when provided", () => {
    const result = captureScreenshot({ output: "/tmp/my_screenshot.png" });
    expect(result.path).toBe("/tmp/my_screenshot.png");
  });

  it("should auto-generate output path in tmpdir", () => {
    const result = captureScreenshot();
    expect(result.path).toContain("recit_snap_");
    expect(result.path).toMatch(/\/tmp\//);
  });

  it("should return file metadata", () => {
    const result = captureScreenshot();
    expect(result.size).toBe(2048);
    expect(result.format).toBe("png");
  });

  it("should throw if ffmpeg exits with non-zero status", () => {
    mockSpawnSync.mockReturnValueOnce({ status: 1 });
    expect(() => captureScreenshot()).toThrow("Screenshot capture failed");
  });

  it("should throw if output file does not exist after capture", () => {
    mockSpawnSync.mockReturnValueOnce({ status: 0 });
    mockExistsSync.mockReturnValueOnce(false);
    expect(() => captureScreenshot()).toThrow("Screenshot file was not created");
  });

  it("should include region args when region is specified", () => {
    captureScreenshot({ region: { x: 0, y: 0, w: 500, h: 400 } });
    const args = mockSpawnSync.mock.calls[0][1] as string[];
    const argsStr = args.join(" ");
    expect(argsStr.includes("500x400") || argsStr.includes("+0,0") || argsStr.includes("crop=")).toBe(true);
  });

  it("should respect 10 second timeout", () => {
    captureScreenshot();
    const opts = mockSpawnSync.mock.calls[0][2];
    expect(opts.timeout).toBe(10000);
  });
});
