export class AdminRegistrationClosedError extends Error {
  public constructor() { super('Admin registration is closed because an admin account already exists.'); }
}

export class InvalidCredentialsError extends Error {
  public constructor() { super('Invalid email or password.'); }
}

export class UnauthenticatedError extends Error {
  public constructor() { super('Authentication is required.'); }
}
