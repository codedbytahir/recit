import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSpawn = vi.fn(() => ({
  pid: 12345,
  kill: vi.fn(),
  on: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: (...args: any[]) => mockSpawn(...args),
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
  statSync: vi.fn(() => ({ size: 1024 })),
  appendFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { startRecording, stopRecording, getRecordingStatus, getActiveCount } from "../src/core/recorder.js";

describe("recorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawn.mockImplementation(() => ({
      pid: 12345,
      kill: vi.fn(),
      on: vi.fn(),
    }));
  });

  describe("startRecording", () => {
    it("should spawn ffmpeg with correct args on current platform", () => {
      const result = startRecording({ fps: 25 });
      expect(result.id).toMatch(/^rec_\d+_\d+$/);
      expect(result.path).toMatch(/\.mp4$/);
      expect(result.pid).toBe(12345);
      expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining(["-y", "-framerate", "25"]), expect.any(Object));
    });

    it("should use custom output path when provided", () => {
      const result = startRecording({ output: "/tmp/my_recording.mp4" });
      expect(result.path).toBe("/tmp/my_recording.mp4");
    });

    it("should auto-generate output path in tmpdir when not provided", () => {
      const result = startRecording();
      expect(result.path).toContain("recit_rec_");
      expect(result.path).toMatch(/\/tmp\//);
    });

    it("should use default fps of 15 when not specified", () => {
      startRecording();
      expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining(["-framerate", "15"]), expect.any(Object));
    });

    it("should include region args when region is specified", () => {
      startRecording({ region: { x: 10, y: 20, w: 800, h: 600 } });
      const callArgs = mockSpawn.mock.calls[0][1] as string[];
      const argsStr = callArgs.join(" ");
      expect(argsStr.includes("800x600") || argsStr.includes("crop=") || argsStr.includes("+10,20")).toBe(true);
    });

    it("should throw if ffmpeg fails to spawn (no pid)", () => {
      mockSpawn.mockReturnValueOnce({ pid: undefined, kill: vi.fn(), on: vi.fn() } as any);
      expect(() => startRecording()).toThrow("Failed to start ffmpeg");
    });

    it("should track recording in active map", () => {
      startRecording();
      expect(getActiveCount()).toBeGreaterThanOrEqual(1);
    });

    it("should generate unique IDs for each recording", () => {
      const r1 = startRecording({ output: "/tmp/r1.mp4" });
      const r2 = startRecording({ output: "/tmp/r2.mp4" });
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe("stopRecording", () => {
    it("should throw for non-existent recording ID", () => {
      expect(() => stopRecording("nonexistent")).toThrow("No active recording");
    });

    it("should send SIGINT to the ffmpeg process", () => {
      const mockProc = { pid: 99999, kill: vi.fn(), on: vi.fn() };
      mockSpawn.mockReturnValueOnce(mockProc as any);
      const result = startRecording();
      stopRecording(result.id);
      expect(mockProc.kill).toHaveBeenCalledWith("SIGINT");
    });

    it("should return path, duration, and size", () => {
      const result = startRecording();
      const stopResult = stopRecording(result.id);
      expect(stopResult.path).toBeDefined();
      expect(typeof stopResult.duration).toBe("number");
      expect(typeof stopResult.size).toBe("number");
    });
  });

  describe("getRecordingStatus", () => {
    it("should return status for active recording", () => {
      const result = startRecording();
      const status = getRecordingStatus(result.id);
      expect(status.id).toBe(result.id);
      expect(status.path).toBe(result.path);
      expect(status.pid).toBe(result.pid);
      expect(status.running).toBe(true);
      expect(typeof status.startedAt).toBe("number");
    });

    it("should throw for unknown ID", () => {
      expect(() => getRecordingStatus("fake_id")).toThrow("No recording with id");
    });
  });

  describe("getActiveCount", () => {
    it("should return a number", () => {
      expect(typeof getActiveCount()).toBe("number");
    });
  });
});
