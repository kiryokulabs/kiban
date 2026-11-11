/** Runtime-maintenance metadata, with usage counted across all existing workloads. */
export interface RuntimeImage {
  readonly id: string;
  readonly tags: readonly string[];
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly references: number;
  /** The image is referenced by an internal KibanOS component. */
  readonly isKibanCore: boolean;
  /** Installed Kiban services associated with actual runtime references. */
  readonly services: readonly { readonly id: string; readonly name: string }[];
}

/** Infrastructure boundary for inspecting and safely removing runtime images. */
export interface RuntimeImagesProvider {
  list(): Promise<readonly RuntimeImage[]>;
  /** Rechecks all references and never forces removal of a referenced image. */
  remove(id: string, tag?: string): Promise<void>;
}

export class RuntimeImageValidationError extends Error {}
export class RuntimeImageNotFoundError extends Error {}
export class RuntimeImageInUseError extends Error {}
export class RuntimeImageConflictError extends Error {}
export class RuntimeImagesUnavailableError extends Error {}
