import { z } from 'zod';

export const DiscoverToolsQuery = z.object({
  serverId: z.string().min(1),
});

export const SaveServerBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  transport: z.enum(['http', 'stdio']),
  url: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
});
