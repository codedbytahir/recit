import { appendFileSync, writeFileSync, existsSync } from "node:fs";

export interface EventEntry {
  t: number;
  type: string;
  data: Record<string, unknown>;
}

export class EventLogger {
  private startTime: number;
  private filePath: string;
  private entries: EventEntry[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;
    this.startTime = Date.now();
    // Initialize file
    writeFileSync(filePath, "");
  }

  log(type: string, data: Record<string, unknown> = {}): void {
    const t = (Date.now() - this.startTime) / 1000;
    const entry: EventEntry = { t: Math.round(t * 1000) / 1000, type, data };
    this.entries.push(entry);
    appendFileSync(this.filePath, JSON.stringify(entry) + "\n");
  }

  logClick(x: number, y: number, button: string = "left"): void {
    this.log("click", { x, y, button });
  }

  logKeypress(key: string): void {
    this.log("keypress", { key });
  }

  logWindowSwitch(windowTitle: string): void {
    this.log("window_switch", { title: windowTitle });
  }

  logAnnotation(message: string): void {
    this.log("annotation", { message });
  }

  getEntries(): EventEntry[] {
    return [...this.entries];
  }

  getStartTime(): number {
    return this.startTime;
  }

  getFilePath(): string {
    return this.filePath;
  }

  destroy(): void {
    this.entries = [];
  }
}
