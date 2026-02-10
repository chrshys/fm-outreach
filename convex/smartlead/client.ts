const BASE_URL = "https://server.smartlead.ai/api/v1";

function getApiKey(): string {
  const key = process.env.SMARTLEAD_API_KEY;
  if (!key) {
    throw new Error("SMARTLEAD_API_KEY is not configured");
  }
  return key;
}

type SmartleadErrorResponse = {
  error?: string;
  message?: string;
};

async function smartleadFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${path}${separator}api_key=${apiKey}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 429) {
    throw new Error("Smartlead rate limit exceeded");
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as SmartleadErrorResponse;
      detail = body.error ?? body.message ?? "";
    } catch {
      // ignore parse errors
    }
    throw new Error(
      `Smartlead API error ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

// --- Types ---

export type SmartleadCampaign = {
  id: number;
  name: string;
};

export type SmartleadSequence = {
  seq_number: number;
  seq_delay_details: { delay_in_days: number };
  subject: string;
  email_body: string;
};

export type SmartleadLead = {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  [key: string]: string | undefined;
};

export type SmartleadLeadUploadResponse = {
  status: string;
  upload_count?: number;
};

export type SmartleadCampaignStatus = "START" | "PAUSE" | "STOP";

export type SmartleadAnalytics = {
  id: number;
  name: string;
  sent_count?: number;
  open_count?: number;
  click_count?: number;
  reply_count?: number;
  bounce_count?: number;
};

export type SmartleadLeadStatus = {
  email: string;
  status?: string;
  open_count?: number;
  click_count?: number;
};

// --- API Functions ---

export async function createCampaign(
  name: string,
): Promise<SmartleadCampaign> {
  return smartleadFetch<SmartleadCampaign>("/campaigns/create", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateCampaignSequence(
  campaignId: number,
  sequences: SmartleadSequence[],
): Promise<unknown> {
  return smartleadFetch(`/campaigns/${campaignId}/sequences`, {
    method: "POST",
    body: JSON.stringify({ sequences }),
  });
}

const MAX_LEADS_PER_REQUEST = 100;

export async function addLeadsToCampaign(
  campaignId: number,
  leads: SmartleadLead[],
): Promise<SmartleadLeadUploadResponse> {
  if (leads.length > MAX_LEADS_PER_REQUEST) {
    throw new Error(
      `Cannot add more than ${MAX_LEADS_PER_REQUEST} leads per request (got ${leads.length})`,
    );
  }

  return smartleadFetch<SmartleadLeadUploadResponse>(
    `/campaigns/${campaignId}/leads`,
    {
      method: "POST",
      body: JSON.stringify({ lead_list: leads }),
    },
  );
}

export async function updateCampaignStatus(
  campaignId: number,
  status: SmartleadCampaignStatus,
): Promise<unknown> {
  return smartleadFetch(`/campaigns/${campaignId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function getCampaignAnalytics(
  campaignId: number,
): Promise<SmartleadAnalytics> {
  return smartleadFetch<SmartleadAnalytics>(
    `/campaigns/${campaignId}/analytics`,
  );
}

export async function getLeadStatus(
  campaignId: number,
  leadEmail: string,
): Promise<SmartleadLeadStatus> {
  const encodedEmail = encodeURIComponent(leadEmail);
  return smartleadFetch<SmartleadLeadStatus>(
    `/campaigns/${campaignId}/leads?email=${encodedEmail}`,
  );
}
