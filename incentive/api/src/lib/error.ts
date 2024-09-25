// make error handling more generic than this ofc
export function hasError(error: unknown): [Error, boolean] {
  if (error instanceof Error) {
    return [error as Error, true];
  }
  return [new Error("Internal server error"), false];
}
