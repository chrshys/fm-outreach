/**
 * Pure formatting functions for the campaign-status CLI report.
 * No Convex or network dependencies — testable in isolation.
 */

export interface CampaignStatusRow {
  _id: string;
  name: string;
  status: "draft" | "pushed" | "active" | "paused" | "completed";
  leadCount: number;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
  };
  updatedAt: number;
}

function pad(str: string, len: number): string {
  return str.padEnd(len);
}

function padNum(n: number, len: number): string {
  return String(n).padStart(len);
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "  —";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function statusBadge(status: string): string {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "paused":
      return "PAUSED";
    case "draft":
      return "DRAFT";
    case "pushed":
      return "PUSHED";
    case "completed":
      return "DONE";
    default:
      return status.toUpperCase();
  }
}

export function formatCampaignStatusReport(campaigns: CampaignStatusRow[]): string {
  if (campaigns.length === 0) {
    return "\nCAMPAIGN STATUS\n" + "─".repeat(40) + "\n  (no campaigns)\n";
  }

  const lines: string[] = [
    "",
    "CAMPAIGN STATUS",
    "═".repeat(72),
  ];

  for (const c of campaigns) {
    const sent = c.stats?.sent ?? 0;
    const opened = c.stats?.opened ?? 0;
    const replied = c.stats?.replied ?? 0;
    const bounced = c.stats?.bounced ?? 0;

    lines.push("");
    lines.push(`  ${c.name}`);
    lines.push("  " + "─".repeat(68));
    lines.push(
      `  ${pad("Status", 14)} ${statusBadge(c.status)}`,
    );
    lines.push(
      `  ${pad("Leads", 14)} ${padNum(c.leadCount, 6)}`,
    );
    lines.push(
      `  ${pad("Sent", 14)} ${padNum(sent, 6)}`,
    );
    lines.push(
      `  ${pad("Opened", 14)} ${padNum(opened, 6)}   (${pct(opened, sent)})`,
    );
    lines.push(
      `  ${pad("Replied", 14)} ${padNum(replied, 6)}   (${pct(replied, sent)})`,
    );
    lines.push(
      `  ${pad("Bounced", 14)} ${padNum(bounced, 6)}   (${pct(bounced, sent)})`,
    );
    lines.push(
      `  ${pad("Last Sync", 14)} ${formatTimestamp(c.updatedAt)}`,
    );
  }

  lines.push("");
  lines.push("═".repeat(72));
  lines.push(`  ${campaigns.length} campaign(s) total`);
  lines.push("");

  return lines.join("\n");
}
