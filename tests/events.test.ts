import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EventLogger } from "../src/core/events.js";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("EventLogger", () => {
  let logger: EventLogger;
  let filePath: string;

  beforeEach(() => {
    filePath = join(tmpdir(), `recit_test_events_${Date.now()}.jsonl`);
    logger = new EventLogger(filePath);
  });

  afterEach(() => {
    logger.destroy();
    if (existsSync(filePath)) unlinkSync(filePath);
  });

  it("should create a JSONL file on construction", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it("should log a generic event with correct JSONL format", () => {
    logger.log("test_event", { foo: "bar" });
    const content = readFileSync(filePath, "utf-8").trim();
    const parsed = JSON.parse(content);
    expect(parsed.type).toBe("test_event");
    expect(parsed.data.foo).toBe("bar");
    expect(typeof parsed.t).toBe("number");
    expect(parsed.t).toBeGreaterThanOrEqual(0);
  });

  it("should log multiple events in order", () => {
    logger.log("first", { n: 1 });
    logger.log("second", { n: 2 });
    logger.log("third", { n: 3 });

    const lines = readFileSync(filePath, "utf-8").trim().split("\n");
    expect(lines.length).toBe(3);

    const entries = lines.map((l) => JSON.parse(l));
    expect(entries[0].type).toBe("first");
    expect(entries[1].type).toBe("second");
    expect(entries[2].type).toBe("third");
  });

  it("should have monotonically increasing timestamps", () => {
    logger.log("a");
    logger.log("b");
    logger.log("c");

    const entries = logger.getEntries();
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].t).toBeGreaterThanOrEqual(entries[i - 1].t);
    }
  });

  it("should log clicks with correct data", () => {
    logger.logClick(100, 200, "right");
    const entries = logger.getEntries();
    expect(entries[0].type).toBe("click");
    expect(entries[0].data.x).toBe(100);
    expect(entries[0].data.y).toBe(200);
    expect(entries[0].data.button).toBe("right");
  });

  it("should log keypresses", () => {
    logger.logKeypress("Enter");
    const entries = logger.getEntries();
    expect(entries[0].type).toBe("keypress");
    expect(entries[0].data.key).toBe("Enter");
  });

  it("should log window switches", () => {
    logger.logWindowSwitch("VS Code");
    const entries = logger.getEntries();
    expect(entries[0].type).toBe("window_switch");
    expect(entries[0].data.title).toBe("VS Code");
  });

  it("should log annotations", () => {
    logger.logAnnotation("Bug happens here");
    const entries = logger.getEntries();
    expect(entries[0].type).toBe("annotation");
    expect(entries[0].data.message).toBe("Bug happens here");
  });

  it("should return correct file path", () => {
    expect(logger.getFilePath()).toBe(filePath);
  });

  it("should track start time", () => {
    const now = Date.now();
    expect(logger.getStartTime()).toBeLessThanOrEqual(now);
    expect(logger.getStartTime()).toBeGreaterThan(now - 1000);
  });

  it("should return all entries via getEntries", () => {
    logger.log("a");
    logger.log("b");
    expect(logger.getEntries().length).toBe(2);
  });

  it("should clear entries on destroy", () => {
    logger.log("a");
    logger.destroy();
    expect(logger.getEntries().length).toBe(0);
  });

  it("should write valid JSON on each line (JSONL format)", () => {
    logger.log("test1", { a: 1 });
    logger.log("test2", { b: [1, 2, 3] });
    logger.log("test3", { c: { nested: true } });

    const lines = readFileSync(filePath, "utf-8").trim().split("\n");
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
