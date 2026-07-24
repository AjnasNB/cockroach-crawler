export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface CrawlerJob<T = unknown> {
  id: string;
  status: JobStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result?: T;
  error?: { code: string; message: string };
}

export interface BoundedJobQueueOptions<TInput = unknown, TResult = unknown> {
  execute(
    input: TInput,
    context: { id: string; signal: AbortSignal }
  ): TResult | Promise<TResult>;
  concurrency?: number;
  maxPending?: number;
  maxRetained?: number;
  maxResultBytes?: number;
}

export function createBoundedJobQueue<TInput = unknown, TResult = unknown>(
  options: BoundedJobQueueOptions<TInput, TResult>
): {
  submit(input: TInput): CrawlerJob<TResult>;
  get(id: string): CrawlerJob<TResult> | null;
  cancel(id: string): boolean;
  stats(): Record<JobStatus, number> & {
    concurrency: number;
    maxPending: number;
    maxRetained: number;
    maxResultBytes: number;
  };
  close(): void;
};
