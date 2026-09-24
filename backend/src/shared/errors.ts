export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
  }
}

export function asError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value));
}
