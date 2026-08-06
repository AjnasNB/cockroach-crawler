export type ExportRow = Record<string, unknown>;

export type ExportFormat = "csv" | "xml" | "jsonl" | "json";

export interface CsvOptions {
  columns?: string[];
  delimiter?: string;
  header?: boolean;
  newline?: "\n" | "\r\n";
  bom?: boolean;
  injectionGuard?: boolean;
}

export interface XmlOptions {
  columns?: string[];
  rootName?: string;
  rowName?: string;
  indent?: number;
  declaration?: boolean;
}

export interface JsonOptions {
  columns?: string[];
  indent?: number;
}

export interface JsonlOptions {
  columns?: string[];
}

export function toCsv(rows: ExportRow[], options?: CsvOptions): string;

export function toXml(rows: ExportRow[], options?: XmlOptions): string;

export function toJsonl(rows: ExportRow[], options?: JsonlOptions): string;

export function toJson(rows: ExportRow[], options?: JsonOptions): string;

export const exportFormats: readonly ExportFormat[];

export function exportRecords(
  rows: ExportRow[],
  format: ExportFormat,
  options?: CsvOptions | XmlOptions | JsonOptions | JsonlOptions
): string;
