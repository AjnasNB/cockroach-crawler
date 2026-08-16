const SECRET_KEY = /(?:auth|cookie|token|secret|password|passcode|api.?key|csrf|session)/i;
const SECRET_TEXT = /((?:authorization|proxy-authorization|cookie|set-cookie|bearer|token|secret|password|passcode|api[_ -]?key|csrf|session)(?:\s*[:=]\s*|\s+))(?:(?:basic|bearer)\s+)?[^\s,;]+/gi;

export function browserAutomationSecretKey(value) {
  return SECRET_KEY.test(String(value));
}

export function redactBrowserAutomationText(value, maximum = Number.MAX_SAFE_INTEGER) {
  return String(value).replace(SECRET_TEXT, "$1[redacted]").slice(0, maximum);
}
