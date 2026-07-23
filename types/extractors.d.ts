export type XPathExtractionSource = "text" | "html" | "attribute";

export interface XPathField {
  xpath: string;
  source?: XPathExtractionSource;
  attribute?: string;
  multiple?: boolean;
  limit?: number;
  resolveUrl?: boolean;
}

export interface XPathExtractionOptions {
  fields: Record<string, string | XPathField>;
  maxFields?: number;
  maxItemsPerField?: number;
  maxInputCharacters?: number;
  maxValueLength?: number;
  maxTotalCharacters?: number;
}

export interface LlmExtractionRequest {
  url: string | null;
  title: string | null;
  content: string;
  schema: object;
  instruction: string;
}

export interface LlmExtractionOptions {
  adapter: (request: Readonly<LlmExtractionRequest>) => unknown | Promise<unknown>;
  schema: object;
  instruction?: string;
  maxInputCharacters?: number;
  maxOutputCharacters?: number;
}

export function extractWithXPath(
  html: string,
  url: string,
  options: XPathExtractionOptions
): { data: Record<string, string | string[] | null>; warnings: string[] };

export function extractWithLlm(
  document: { url?: string; title?: string; text?: string; markdown?: string },
  options: LlmExtractionOptions
): Promise<{
  data: unknown;
  provenance: {
    method: "host-supplied-llm-adapter";
    inputCharacters: number;
    outputCharacters: number;
    schemaValidated: true;
  };
}>;
