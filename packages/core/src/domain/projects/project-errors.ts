export class ProjectValidationError extends Error {
  public constructor(message: string) { super(message); }
}

export class ProjectNotFoundError extends Error {
  public constructor() { super('Project was not found.'); }
}
