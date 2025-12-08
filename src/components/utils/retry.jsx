export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export async function with429Retry(fn, retries = 5, backoffMs = 3000) {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err?.message || err || "");
    const responseDetail = err?.response?.data?.detail || err?.response?.data?.message || "";
    const responseStr = typeof responseDetail === 'string' ? responseDetail : JSON.stringify(responseDetail);
    const status = err?.response?.status;
    
    const is429 = status === 429 || 
                  msg.includes("429") || 
                  msg.toLowerCase().includes("rate limit") ||
                  responseStr.toLowerCase().includes("rate limit");
    
    if (retries > 0 && is429) {
      console.log(`Rate limit hit, retrying in ${backoffMs}ms... (${retries} retries left)`);
      await sleep(backoffMs);
      // Increase backoff more aggressively: multiply by 3 instead of 2.5
      return with429Retry(fn, retries - 1, Math.floor(backoffMs * 3));
    }
    throw err;
  }
}