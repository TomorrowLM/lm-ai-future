/**
 * Swagger 模块日志工具
 * 统一通过 MCP Logging 能力发送日志到 Inspector
 */

import { server } from "@/server-instance.js";

/**
 * 发送日志消息到 Inspector 的 Server Notifications
 * @param message 日志消息
 * @param data 附加数据
 * @param level 日志级别，默认 "info"
 */
export async function logSwagger(
  message: string,
  data?: unknown,
  level: "debug" | "info" | "warning" | "error" = "info",
): Promise<void> {
  await server.sendLoggingMessage({
    level,
    logger: "swagger",
    data: data !== undefined ? { message, ...toDataObj(data) } : { message },
  });
}

function toDataObj(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { value: data };
}
