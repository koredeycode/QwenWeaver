import { client2, withRefresh } from '../lib/api-client.js';

export async function listCredentials(): Promise<any[]> {
  try {
    const res = await client2.api.credentials.$get();
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return data.credentials || [];
  } catch {
    return [];
  }
}

export async function createCredential(data: {
  type: string;
  name: string;
  value: string;
}): Promise<any | null> {
  try {
    const res = await withRefresh(() => client2.api.credentials.$post({ json: data as any }));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteCredential(credentialId: string): Promise<boolean> {
  try {
    const res = (await withRefresh(() =>
      (client2.api.credentials as any)[':credentialId'].$delete({
        param: { credentialId },
      }),
    )) as any;
    return res.ok;
  } catch {
    return false;
  }
}
