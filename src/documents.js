import { createHash } from "node:crypto";

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}
function inputBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError("PDF input must be a Buffer or Uint8Array. URL fetching remains under crawler policy.");
}

export async function parsePdf(input, options = {}) {
  const bytes = inputBytes(input);
  const maxBytes = integer(options.maxBytes, "maxBytes", 20 * 1024 * 1024, 1_024, 100 * 1024 * 1024);
  const maxPages = integer(options.maxPages, "maxPages", 250, 1, 10_000);
  const maxTextCharacters = integer(
    options.maxTextCharacters,
    "maxTextCharacters",
    2_000_000,
    1,
    20_000_000
  );
  if (bytes.byteLength > maxBytes) {
    throw new RangeError(`PDF input exceeds maxBytes (${bytes.byteLength} > ${maxBytes}).`);
  }
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new TypeError("PDF input does not start with the %PDF- signature.");
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const pageCount = Number(info?.total || info?.numPages || 0);
    if (pageCount > maxPages) {
      throw new RangeError(`PDF exceeds maxPages (${pageCount} > ${maxPages}).`);
    }
    const result = await parser.getText();
    const rawText = String(result?.text || "");
    const truncated = rawText.length > maxTextCharacters;
    const text = rawText.slice(0, maxTextCharacters);
    return {
      mediaType: "application/pdf",
      pageCount,
      text,
      truncated,
      bytes: bytes.byteLength,
      contentHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
      metadata: {
        title: typeof info?.info?.Title === "string" ? info.info.Title : null,
        author: typeof info?.info?.Author === "string" ? info.info.Author : null,
        subject: typeof info?.info?.Subject === "string" ? info.info.Subject : null,
        creator: typeof info?.info?.Creator === "string" ? info.info.Creator : null,
        producer: typeof info?.info?.Producer === "string" ? info.info.Producer : null,
        creationDate: typeof info?.info?.CreationDate === "string" ? info.info.CreationDate : null,
        modificationDate: typeof info?.info?.ModDate === "string" ? info.info.ModDate : null
      },
      warnings: truncated
        ? [`PDF text was truncated at maxTextCharacters (${maxTextCharacters}).`]
        : []
    };
  } finally {
    await parser.destroy();
  }
}
