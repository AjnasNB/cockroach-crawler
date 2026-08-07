export type BoilerplatePreset = "off" | "structural" | "balanced" | "aggressive";

export interface BoilerplateOptionsInput {
  mode?: BoilerplatePreset;
  /** An element holding more than this share of the root text is never removed. */
  maxTextShare?: number;
  /** Match class, id, and data-testid against known boilerplate names. */
  labels?: boolean;
  /** Remove blocks whose anchor text exceeds this share of their own text. */
  linkDensity?: number;
}

export interface BoilerplateOptions {
  mode: BoilerplatePreset;
  maxTextShare: number;
  labels: boolean;
  linkDensity: number;
}

export interface BoilerplateResult {
  removed: number;
  reasons: Readonly<Record<string, number>>;
}

export function normalizeBoilerplateOptions(
  value?: BoilerplatePreset | BoilerplateOptionsInput | boolean | null
): BoilerplateOptions;

export function stripBoilerplate(
  $: unknown,
  root: unknown,
  options: BoilerplateOptions | BoilerplatePreset | BoilerplateOptionsInput
): BoilerplateResult;

export const boilerplateDefaults: {
  readonly presets: readonly BoilerplatePreset[];
  readonly structuralSelectors: readonly string[];
  readonly labelPatternCount: number;
};
