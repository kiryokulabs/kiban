/** Display-only runtime image metadata; usage is verified again by the backend before deletion. */
export interface ServerImage {
  readonly id: string;
  readonly tags: readonly string[];
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly references: number;
  /** The image is referenced by an internal KibanOS component. */
  readonly isKibanCore: boolean;
  readonly services: readonly { readonly id: string; readonly name: string }[];
}

/** One visible row per tag; several rows may share the same image data and ID. */
export interface ServerImageRow extends ServerImage {
  readonly tag: string | null;
}
