const MODES = new Set(["bfs", "dfs", "best-first", "adaptive"]);
const MAX_QUERY_TERMS = 64;
const MAX_QUERY_TERM_LENGTH = 128;

function ownRecord(value, label) {
  if (value === undefined || value === null) return Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string") throw new TypeError(`${label} cannot contain symbol properties.`);
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label}.${key} must be an own enumerable data property.`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function integer(value, label, fallback, minimum, maximum) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} must be a safe integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

export function normalizeTraversalOptions(value = {}) {
  if (typeof value === "string") value = { mode: value };
  const input = ownRecord(value, "traversal");
  const allowed = new Set([
    "mode",
    "query",
    "scorer",
    "depthPenalty",
    "minimumScore",
    "maxScoreInputCharacters"
  ]);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) throw new TypeError(`Unknown traversal option(s): ${unknown.join(", ")}.`);

  const mode = input.mode ?? "bfs";
  if (!MODES.has(mode)) {
    throw new TypeError(`traversal.mode must be one of: ${[...MODES].join(", ")}.`);
  }

  const rawQuery = Array.isArray(input.query)
    ? input.query
    : (typeof input.query === "string" ? input.query.split(/\s+/) : []);
  if (rawQuery.length > MAX_QUERY_TERMS) {
    throw new TypeError(`traversal.query accepts at most ${MAX_QUERY_TERMS} terms.`);
  }
  const query = [...new Set(rawQuery.map((term) => {
    if (typeof term !== "string") throw new TypeError("traversal.query terms must be strings.");
    const normalized = term.normalize("NFKC").trim().toLowerCase();
    if (!normalized || normalized.length > MAX_QUERY_TERM_LENGTH) {
      throw new TypeError(
        `traversal.query terms must contain 1-${MAX_QUERY_TERM_LENGTH} normalized characters.`
      );
    }
    return normalized;
  }))];

  if (input.scorer !== undefined && input.scorer !== null && typeof input.scorer !== "function") {
    throw new TypeError("traversal.scorer must be a trusted function.");
  }
  const depthPenalty = Number(input.depthPenalty ?? 0.15);
  if (!Number.isFinite(depthPenalty) || depthPenalty < 0 || depthPenalty > 10) {
    throw new TypeError("traversal.depthPenalty must be a finite number from 0 to 10.");
  }
  const minimumScore = input.minimumScore === undefined || input.minimumScore === null
    ? null
    : Number(input.minimumScore);
  if (minimumScore !== null && !Number.isFinite(minimumScore)) {
    throw new TypeError("traversal.minimumScore must be a finite number.");
  }

  return Object.freeze({
    mode,
    query: Object.freeze(query),
    scorer: input.scorer ?? null,
    depthPenalty,
    minimumScore,
    maxScoreInputCharacters: integer(
      input.maxScoreInputCharacters,
      "traversal.maxScoreInputCharacters",
      20_000,
      256,
      262_144
    )
  });
}

function boundedText(value, maximum) {
  if (value === undefined || value === null) return "";
  return String(value).normalize("NFKC").slice(0, maximum).toLowerCase();
}

export function scoreRelevance(record, query, options = {}) {
  const terms = Array.isArray(query) ? query : String(query || "").split(/\s+/);
  const normalizedTerms = terms
    .map((term) => String(term).normalize("NFKC").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_QUERY_TERMS);
  if (!normalizedTerms.length) return 0;

  const maximum = integer(
    options.maxScoreInputCharacters,
    "maxScoreInputCharacters",
    20_000,
    256,
    262_144
  );
  const url = boundedText(record?.url, Math.min(maximum, 4_096));
  const title = boundedText(record?.title, Math.min(maximum, 4_096));
  const description = boundedText(record?.description, Math.min(maximum, 8_192));
  const text = boundedText(record?.text, maximum);

  let score = 0;
  for (const term of normalizedTerms) {
    if (url.includes(term)) score += 5;
    if (title.includes(term)) score += 4;
    if (description.includes(term)) score += 2;
    const first = text.indexOf(term);
    if (first >= 0) {
      score += 1;
      const second = text.indexOf(term, first + term.length);
      if (second >= 0) score += 0.5;
    }
  }
  return score;
}

export function createTraversalQueue(value = {}) {
  const options = normalizeTraversalOptions(value);
  const items = [];
  let sequence = 0;

  const calculateScore = (item) => {
    const context = item.scoreContext || item;
    const base = options.scorer
      ? Number(options.scorer(Object.freeze({ ...context })))
      : scoreRelevance(context, options.query, options);
    if (!Number.isFinite(base)) {
      throw new TypeError("traversal.scorer must return a finite number.");
    }
    return base - ((item.depth || 0) * options.depthPenalty);
  };

  return {
    get mode() {
      return options.mode;
    },
    get length() {
      return items.length;
    },
    push(item) {
      if (!item || typeof item !== "object" || typeof item.url !== "string") {
        throw new TypeError("Traversal queue items require a URL.");
      }
      const score = calculateScore(item);
      if (options.minimumScore !== null && score < options.minimumScore) return false;
      items.push({ ...item, score, sequence: sequence++ });
      return true;
    },
    shift() {
      if (!items.length) return null;
      if (options.mode === "dfs") return items.pop();
      if (options.mode === "bfs") return items.shift();
      let selected = 0;
      for (let index = 1; index < items.length; index += 1) {
        const candidate = items[index];
        const current = items[selected];
        if (
          candidate.score > current.score
          || (candidate.score === current.score && candidate.sequence < current.sequence)
        ) {
          selected = index;
        }
      }
      return items.splice(selected, 1)[0];
    }
  };
}
