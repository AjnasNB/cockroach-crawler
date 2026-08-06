export type ResourceType =
  | "document" | "stylesheet" | "image" | "media" | "font" | "script"
  | "texttrack" | "xhr" | "fetch" | "eventsource" | "websocket" | "manifest" | "other";

export type ResourcePreset = "none" | "media" | "assets" | "text";

export interface RequestPolicyInput {
  blockResources?: ResourcePreset | ResourceType[];
  blockDomains?: string | string[];
  allowDomains?: string | string[];
  blockTrackers?: boolean;
}

export interface RequestPolicy {
  blockResources: readonly ResourceType[];
  blockDomains: readonly string[];
  allowDomains: readonly string[];
  blockTrackers: boolean;
}

export interface BlockDecision {
  blocked: true;
  reason: "resource-type" | "blocked-domain" | "tracker";
  detail: string;
}

export function normalizeRequestPolicy(value?: RequestPolicyInput | false | null): RequestPolicy;

export function shouldBlockRequest(
  url: string | URL,
  resourceType: ResourceType | null,
  policy: RequestPolicy | RequestPolicyInput | false | null
): BlockDecision | null;

export const requestPolicyDefaults: {
  readonly resourceTypes: readonly ResourceType[];
  readonly presets: readonly ResourcePreset[];
  readonly trackerDomainCount: number;
  readonly trackerDomains: readonly string[];
};
