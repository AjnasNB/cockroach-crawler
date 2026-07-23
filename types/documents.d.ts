export interface PdfParseOptions {
  maxBytes?: number;
  maxPages?: number;
  maxTextCharacters?: number;
}

export interface PdfDocument {
  mediaType: "application/pdf";
  pageCount: number;
  text: string;
  truncated: boolean;
  bytes: number;
  contentHash: `sha256:${string}`;
  metadata: {
    title: string | null;
    author: string | null;
    subject: string | null;
    creator: string | null;
    producer: string | null;
    creationDate: string | null;
    modificationDate: string | null;
  };
  warnings: string[];
}

export function parsePdf(input: Uint8Array, options?: PdfParseOptions): Promise<PdfDocument>;
