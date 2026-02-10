/**
 * Pure formatting functions for the outreach-stats CLI report.
 * No Convex or network dependencies — testable in isolation.
 */

export interface PipelineStats {
  new_lead: number;
  enriched: number;
  outreach_started: number;
  replied: number;
  meeting_booked: number;
  onboarded: number;
  no_email: number;
  declined: number;
  not_interested: number;
  bounced: number;
  no_response: number;
}

export interface EmailActivityCounts {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

export interface EmailStats {
  last7Days: EmailActivityCounts;
  last30Days: EmailActivityCounts;
}

export interface SocialActivityCounts {
  dmsSent: number;
  dmReplies: number;
  follows: number;
}

export interface SocialStats {
  last7Days: SocialActivityCounts;
  last30Days: SocialActivityCounts;
}

export interface ActiveCampaign {
  _id: string;
  name: string;
  status: "active" | "paused";
  leadCount: number;
  stats: {
    sent: number;
    openRate: number;
    replyRate: number;
  };
}

export interface FollowUpItem {
  _id: string;
  name: string;
  city: string;
  type: string;
  nextFollowUpAt: number;
}

export interface FollowUpsDue {
  dueToday: FollowUpItem[];
  overdue: FollowUpItem[];
}

export interface OutreachData {
  pipeline: PipelineStats;
  email: EmailStats;
  social: SocialStats;
  campaigns: ActiveCampaign[];
  followUps: FollowUpsDue;
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function pad(str: string, len: number): string {
  return str.padEnd(len);
}

function padNum(n: number, len: number): string {
  return String(n).padStart(len);
}

export function formatPipelineFunnel(p: PipelineStats): string {
  const total =
    p.new_lead +
    p.enriched +
    p.outreach_started +
    p.replied +
    p.meeting_booked +
    p.onboarded +
    p.no_email +
    p.declined +
    p.not_interested +
    p.bounced +
    p.no_response;

  const lines = [
    "PIPELINE FUNNEL",
    "─".repeat(40),
    `  ${pad("New Lead", 20)} ${padNum(p.new_lead, 6)}`,
    `  ${pad("Enriched", 20)} ${padNum(p.enriched, 6)}`,
    `  ${pad("Outreach Started", 20)} ${padNum(p.outreach_started, 6)}`,
    `  ${pad("Replied", 20)} ${padNum(p.replied, 6)}`,
    `  ${pad("Meeting Booked", 20)} ${padNum(p.meeting_booked, 6)}`,
    `  ${pad("Onboarded", 20)} ${padNum(p.onboarded, 6)}`,
    "─".repeat(40),
    `  ${pad("No Email", 20)} ${padNum(p.no_email, 6)}`,
    `  ${pad("Declined", 20)} ${padNum(p.declined, 6)}`,
    `  ${pad("Not Interested", 20)} ${padNum(p.not_interested, 6)}`,
    `  ${pad("Bounced", 20)} ${padNum(p.bounced, 6)}`,
    `  ${pad("No Response", 20)} ${padNum(p.no_response, 6)}`,
    "─".repeat(40),
    `  ${pad("TOTAL", 20)} ${padNum(total, 6)}`,
  ];
  return lines.join("\n");
}

export function formatEmailStats(e: EmailStats): string {
  const lines = [
    "EMAIL STATS",
    "─".repeat(40),
    `  ${"".padEnd(12)} ${"7d".padStart(6)}  ${"30d".padStart(6)}`,
    `  ${pad("Sent", 12)} ${padNum(e.last7Days.sent, 6)}  ${padNum(e.last30Days.sent, 6)}`,
    `  ${pad("Opened", 12)} ${padNum(e.last7Days.opened, 6)}  ${padNum(e.last30Days.opened, 6)}`,
    `  ${pad("Clicked", 12)} ${padNum(e.last7Days.clicked, 6)}  ${padNum(e.last30Days.clicked, 6)}`,
    `  ${pad("Replied", 12)} ${padNum(e.last7Days.replied, 6)}  ${padNum(e.last30Days.replied, 6)}`,
  ];
  return lines.join("\n");
}

export function formatSocialStats(s: SocialStats): string {
  const lines = [
    "SOCIAL STATS",
    "─".repeat(40),
    `  ${"".padEnd(12)} ${"7d".padStart(6)}  ${"30d".padStart(6)}`,
    `  ${pad("DMs Sent", 12)} ${padNum(s.last7Days.dmsSent, 6)}  ${padNum(s.last30Days.dmsSent, 6)}`,
    `  ${pad("DM Replies", 12)} ${padNum(s.last7Days.dmReplies, 6)}  ${padNum(s.last30Days.dmReplies, 6)}`,
    `  ${pad("Follows", 12)} ${padNum(s.last7Days.follows, 6)}  ${padNum(s.last30Days.follows, 6)}`,
  ];
  return lines.join("\n");
}

export function formatActiveCampaigns(campaigns: ActiveCampaign[]): string {
  if (campaigns.length === 0) {
    return "ACTIVE CAMPAIGNS\n" + "─".repeat(40) + "\n  (none)";
  }

  const lines = [
    "ACTIVE CAMPAIGNS",
    "─".repeat(64),
    `  ${pad("Name", 24)} ${pad("Status", 8)} ${"Leads".padStart(6)}  ${"Sent".padStart(6)}  ${"Open%".padStart(6)}  ${"Reply%".padStart(6)}`,
  ];

  for (const c of campaigns) {
    lines.push(
      `  ${pad(c.name.slice(0, 24), 24)} ${pad(c.status, 8)} ${padNum(c.leadCount, 6)}  ${padNum(c.stats.sent, 6)}  ${pct(c.stats.openRate).padStart(6)}  ${pct(c.stats.replyRate).padStart(6)}`,
    );
  }

  return lines.join("\n");
}

export function formatFollowUpsDue(f: FollowUpsDue): string {
  const lines = [
    "FOLLOW-UPS DUE",
    "─".repeat(40),
    `  Overdue:   ${f.overdue.length}`,
    `  Due Today: ${f.dueToday.length}`,
  ];

  if (f.overdue.length > 0) {
    lines.push("");
    lines.push("  Overdue:");
    for (const item of f.overdue) {
      lines.push(`    - ${item.name} (${item.city})`);
    }
  }

  if (f.dueToday.length > 0) {
    lines.push("");
    lines.push("  Due Today:");
    for (const item of f.dueToday) {
      lines.push(`    - ${item.name} (${item.city})`);
    }
  }

  return lines.join("\n");
}

export function formatOutreachReport(data: OutreachData): string {
  const sections = [
    formatPipelineFunnel(data.pipeline),
    formatEmailStats(data.email),
    formatSocialStats(data.social),
    formatActiveCampaigns(data.campaigns),
    formatFollowUpsDue(data.followUps),
  ];

  return "\n" + sections.join("\n\n") + "\n";
}
