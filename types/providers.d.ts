export interface EscalationProvider<TRequest = unknown, TResponse = unknown> {
  id: string;
  authority?: string;
  credentialed?: boolean;
  execute(
    request: Readonly<TRequest>,
    context: { signal?: AbortSignal }
  ): TResponse | Promise<TResponse>;
}

export interface EscalationRouterOptions<TRequest = unknown, TResponse = unknown> {
  providers: Array<EscalationProvider<TRequest, TResponse>>;
  maxAttempts?: number;
  escalationStatuses?: number[];
  allowChallengeProvider?: boolean;
}

export function detectAccessChallenge(response: {
  status?: number;
  body?: string;
  text?: string;
}): {
  challenge: boolean;
  retryable: boolean;
  status: number;
  reason: "access-challenge" | "retryable-transport" | "none";
};

export function createEscalationRouter<TRequest = unknown, TResponse = unknown>(
  options: EscalationRouterOptions<TRequest, TResponse>
): {
  providers: Array<{ id: string; authority: string; credentialed: boolean }>;
  execute(
    request: TRequest,
    execution?: { signal?: AbortSignal }
  ): Promise<{
    response: TResponse;
    provider: string;
    attempts: Array<Record<string, unknown>>;
  }>;
};
