import { PostHog } from "posthog-node";

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || "";
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

let client = null;

function getClient() {
  if (!POSTHOG_API_KEY) return null;
  if (!client) {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
    });
  }
  return client;
}

export function captureInstallerRequest(req, url) {
  const ph = getClient();
  if (!ph) return;

  const userAgent = req.headers["user-agent"] || "unknown";
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

  ph.capture({
    distinctId: ip,
    event: "installer_request",
    properties: {
      userAgent,
      path: url.pathname,
      method: req.method,
    },
  });
}

export async function shutdownAnalytics() {
  const ph = getClient();
  if (ph) {
    await ph.shutdownAsync();
  }
}
