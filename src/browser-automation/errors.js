export class BrowserAutomationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BrowserAutomationError";
    this.code = code;
  }
}

export function browserAutomationFail(code, message) {
  throw new BrowserAutomationError(code, message);
}
