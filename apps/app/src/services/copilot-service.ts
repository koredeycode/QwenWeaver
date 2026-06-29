import { client, authHeaders, withRefresh } from '../lib/api-client.js';

export async function sendCopilotMessage(
  message: string,
  model: string,
  graphActions: any[],
): Promise<any> {
  try {
    const res = await withRefresh(() =>
      client.api.copilot.$post(
        {
          json: { message, model, actions: graphActions } as any,
        },
        { headers: authHeaders },
      ),
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
