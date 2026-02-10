// Smartlead API rate limiter
// Enforces two windows: 10 requests per 2 seconds, 60 requests per 60 seconds.
// On 429 response, retries with exponential backoff (max 3 retries).

type TokenBucket = {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillIntervalMs: number;
};

function createBucket(maxTokens: number, refillIntervalMs: number): TokenBucket {
  return {
    tokens: maxTokens,
    lastRefill: Date.now(),
    maxTokens,
    refillIntervalMs,
  };
}

function refillBucket(bucket: TokenBucket): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= bucket.refillIntervalMs) {
    bucket.tokens = bucket.maxTokens;
    bucket.lastRefill = now;
  }
}

function hasToken(bucket: TokenBucket): boolean {
  refillBucket(bucket);
  return bucket.tokens > 0;
}

function consume(bucket: TokenBucket): void {
  bucket.tokens--;
}

function msUntilRefill(bucket: TokenBucket): number {
  const elapsed = Date.now() - bucket.lastRefill;
  return Math.max(0, bucket.refillIntervalMs - elapsed);
}

// Two-window rate limiter: short (10 req / 2s) and long (60 req / 60s)
const shortBucket = createBucket(10, 2_000);
const longBucket = createBucket(60, 60_000);

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTokens(): Promise<void> {
  while (true) {
    if (hasToken(shortBucket) && hasToken(longBucket)) {
      consume(shortBucket);
      consume(longBucket);
      return;
    }

    const shortWait = hasToken(shortBucket) ? 0 : msUntilRefill(shortBucket);
    const longWait = hasToken(longBucket) ? 0 : msUntilRefill(longBucket);
    const waitMs = Math.max(shortWait, longWait, 50);

    console.log(`[smartlead-rate-limiter] Waiting ${waitMs}ms for rate limit window`);
    await sleep(waitMs);
  }
}

export async function rateLimitedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  await waitForTokens();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    if (attempt === MAX_RETRIES) {
      console.log(
        `[smartlead-rate-limiter] Rate limit hit after ${MAX_RETRIES} retries, giving up`,
      );
      return response;
    }

    const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
    console.log(
      `[smartlead-rate-limiter] 429 received, retry ${attempt + 1}/${MAX_RETRIES} after ${backoffMs}ms`,
    );
    await sleep(backoffMs);
  }

  // Unreachable, but satisfies TypeScript
  throw new Error("Unexpected state in rateLimitedFetch");
}

export function _resetBucketsForTesting(): void {
  shortBucket.tokens = shortBucket.maxTokens;
  shortBucket.lastRefill = Date.now();
  longBucket.tokens = longBucket.maxTokens;
  longBucket.lastRefill = Date.now();
}
