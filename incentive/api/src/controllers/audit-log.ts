import { Get, Route } from "tsoa";
import fs from "fs/promises";
import path from "path";

interface AuditLogEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  details: object;
}

@Route("incentives/audit-log")
export class AuditLogController {
  @Get("/")
  public async getAuditLog(): Promise<AuditLogEvent[]> {
    const data = await fs.readFile(
      path.join(__dirname, "../mock/audit-log.json"),
      "utf8",
    );
    const auditLog = JSON.parse(data);

    return auditLog;
  }
}
