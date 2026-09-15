import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    openapi: "3.1.0",
    info: { title: "Command Center API", version: "0.1.0", description: "Private API for Dave's Command Center." },
    servers: [{ url: origin }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/assistant/today": { get: { operationId: "getToday", summary: "Get today's tasks, runtime state and waiting items", responses: { "200": { description: "Today's state" } } } },
      "/api/assistant/tasks": {
        get: { operationId: "listTasks", summary: "List all tasks", responses: { "200": { description: "Tasks" } } },
        post: { operationId: "createTask", summary: "Create a task", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title"], properties: { title: { type: "string" }, notes: { type: "string" }, status: { type: "string" }, priority: { type: "integer" }, project: { type: "string" }, estimateMinutes: { type: "integer" }, dueAt: { type: "string" }, scheduledStart: { type: "string" }, scheduledEnd: { type: "string" }, waitingOn: { type: "string" }, followUpAt: { type: "string" } } } } } }, responses: { "201": { description: "Created task" } } }
      },
      "/api/assistant/tasks/{id}/action": { post: { operationId: "actOnTask", summary: "Edit, schedule, complete, block, defer, wait, drop or plan a task", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["action"], properties: { action: { type: "string", enum: ["edit","schedule","complete","block","defer","wait","drop","plan"] }, reason: { type: "string" }, title: { type: "string" }, notes: { type: "string" }, status: { type: "string" }, priority: { type: "integer" }, project: { type: "string" }, estimateMinutes: { type: "integer" }, dueAt: { type: "string" }, scheduledStart: { type: "string" }, scheduledEnd: { type: "string" }, waitingOn: { type: "string" }, followUpAt: { type: "string" } } } } } }, responses: { "200": { description: "Action result" } } } }
    }
  });
}
