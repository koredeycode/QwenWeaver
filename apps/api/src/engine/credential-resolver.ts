import type { MCPAuthConfig, NodePayload } from '@qwenweaver/types';
import { getQueryProvider } from '@qwenweaver/database';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/credential-resolver');

export async function resolveCredentialAuth(
  authConfig: NonNullable<NodePayload['data']['mcpAuthConfig']>,
  userId: string,
  provider?: ReturnType<typeof getQueryProvider>,
): Promise<MCPAuthConfig> {
  if (!authConfig.credentialId) {
    return authConfig as MCPAuthConfig;
  }

  const p = provider || getQueryProvider();
  const credential = await p.getCredential(authConfig.credentialId, userId);
  if (!credential?.value) {
    log.warn(
      { credentialId: authConfig.credentialId },
      'Credential not found for MCP auth, falling back to inline config',
    );
    return authConfig as MCPAuthConfig;
  }

  return {
    ...authConfig,
    apiKey: credential.value,
    token: credential.value,
    username: authConfig.username,
    password: authConfig.password,
  } as MCPAuthConfig;
}
