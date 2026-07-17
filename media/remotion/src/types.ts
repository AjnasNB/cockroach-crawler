export type Evidence = {
  capturedAt: string;
  gitCommit: string;
  workingTreeDirty: boolean;
  revisionLabel: string;
  nodeVersion: string;
  packageName: string;
  packageVersion: string;
  doctorLines: string[];
  helpLines: string[];
  testLines: string[];
  testSummary: {
    tests: number;
    pass: number;
    fail: number;
    durationMs: number;
  };
  benchmark: {
    name: string;
    generatedAt: string;
    pages: number;
    measuredRuns: number;
    correctness: string;
    medianPagesPerSecond: number;
    disclaimer: string;
  };
};

export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};
