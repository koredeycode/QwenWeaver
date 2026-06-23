export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'signup_bonus' | 'execution_cost' | 'admin_grant';
  description: string | null;
  executionId: string | null;
  createdAt: string;
}

export const NODE_BASE_COST: Record<string, number> = {
  trigger: 0,
  input_trigger: 0,
  agent: 5,
  supervisor: 15,
  mcp_tool: 2,
  logic: 1,
};

export const FIXED_COST = 5;
export const PROMPT_TOKEN_COST = 0.001;
export const COMPLETION_TOKEN_COST = 0.002;
export const MIN_COST = 5;
export const SIGNUP_CREDITS = 1000;
export const LOW_CREDIT_WARNING = 100;
