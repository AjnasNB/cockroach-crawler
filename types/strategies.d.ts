export type TraversalMode = "bfs" | "dfs" | "best-first" | "adaptive";

export interface RelevanceRecord {
  url: string;
  title?: string;
  description?: string;
  text?: string;
}

export interface TraversalOptions {
  mode?: TraversalMode;
  query?: string | string[];
  scorer?: (record: Readonly<RelevanceRecord>) => number;
  depthPenalty?: number;
  minimumScore?: number;
  maxScoreInputCharacters?: number;
}

export interface TraversalQueueItem extends RelevanceRecord {
  depth?: number;
  discoveredFrom?: string | null;
  scoreContext?: RelevanceRecord;
  score?: number;
}

export interface TraversalQueue {
  readonly mode: TraversalMode;
  readonly length: number;
  push(item: TraversalQueueItem): boolean;
  shift(): TraversalQueueItem | null;
}

export function normalizeTraversalOptions(options?: TraversalOptions | TraversalMode): Readonly<Required<Omit<TraversalOptions, "minimumScore">> & { minimumScore: number | null }>;
export function scoreRelevance(
  record: RelevanceRecord,
  query: string | string[],
  options?: Pick<TraversalOptions, "maxScoreInputCharacters">
): number;
export function createTraversalQueue(options?: TraversalOptions | TraversalMode): TraversalQueue;
