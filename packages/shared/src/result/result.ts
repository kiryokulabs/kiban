export type Result<TValue, TError extends Error = Error> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

/** Wraps a successful operation value. */
export const success = <TValue>(value: TValue): Result<TValue> => ({ ok: true, value });
/** Wraps a failed operation error. */
export const failure = <TError extends Error>(error: TError): Result<never, TError> => ({ ok: false, error });
