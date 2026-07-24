import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { startRecording, stopRecording, getRecordingStatus, getActiveCount } from "../core/recorder.js";
import { captureScreenshot } from "../core/screenshot.js";
import { extractFrames } from "../core/frames.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "recit",
    version: "1.0.0",
  });

  // Tool: Start Recording
  server.registerTool(
    "recit_start",
    {
      title: "Start Screen Recording",
      description:
        "Start recording the screen or a specific region. Returns a recording ID and file path. Use recit_stop to end the recording.",
      inputSchema: z.object({
        output: z.string().optional().describe("Output file path for the recording (default: auto-generated in /tmp)"),
        fps: z.number().optional().describe("Frames per second (default: 15)"),
        region: z
          .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
          .optional()
          .describe("Specific region to record {x, y, width, height}"),
      }),
    },
    async ({ output, fps, region }) => {
      try {
        const result = startRecording({ output, fps, region });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...result }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: (err as Error).message }) }],
          isError: true,
        };
      }
    }
  );

  // Tool: Stop Recording
  server.registerTool(
    "recit_stop",
    {
      title: "Stop Screen Recording",
      description: "Stop an active screen recording. Returns the file path, duration, and file size.",
      inputSchema: z.object({
        id: z.string().describe("Recording ID returned by recit_start"),
      }),
    },
    async ({ id }) => {
      try {
        const result = stopRecording(id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...result }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: (err as Error).message }) }],
          isError: true,
        };
      }
    }
  );

  // Tool: Capture Screenshot
  server.registerTool(
    "recit_snap",
    {
      title: "Capture Screenshot",
      description: "Capture a screenshot of the screen or a specific region. Returns file path and metadata.",
      inputSchema: z.object({
        output: z.string().optional().describe("Output file path for the screenshot (default: auto-generated PNG in /tmp)"),
        region: z
          .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
          .optional()
          .describe("Specific region to capture {x, y, width, height}"),
      }),
    },
    async ({ output, region }) => {
      try {
        const result = captureScreenshot({ output, region });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...result }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: (err as Error).message }) }],
          isError: true,
        };
      }
    }
  );

  // Tool: Extract Frames
  server.registerTool(
    "recit_frames",
    {
      title: "Extract Frames from Video",
      description: "Extract key frames from a video recording using scene detection. Returns paths to extracted PNG frames.",
      inputSchema: z.object({
        video: z.string().describe("Path to the video file"),
        outputDir: z.string().optional().describe("Output directory for frames (default: auto-generated in /tmp)"),
        maxFrames: z.number().optional().describe("Maximum number of frames to extract (default: 20)"),
        sceneThreshold: z.number().optional().describe("Scene change threshold 0-1 (default: 0.3)"),
      }),
    },
    async ({ video, outputDir, maxFrames, sceneThreshold }) => {
      try {
        const result = extractFrames({ video, outputDir, maxFrames, sceneThreshold });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...result }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: (err as Error).message }) }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get Status
  server.registerTool(
    "recit_status",
    {
      title: "Get Recording Status",
      description: "Check the status of an active recording or get count of active recordings.",
      inputSchema: z.object({
        id: z.string().optional().describe("Recording ID to check. Omit to get active count."),
      }),
    },
    async ({ id }) => {
      try {
        if (id) {
          const status = getRecordingStatus(id);
          return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...status }) }] };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, activeRecordings: getActiveCount() }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: (err as Error).message }) }],
          isError: true,
        };
      }
    }
  );

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("recit MCP server running on stdio\n");
}
