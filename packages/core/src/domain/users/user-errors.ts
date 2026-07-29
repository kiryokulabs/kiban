export class ForbiddenUserActionError extends Error {
  public constructor() { super('The current user is not allowed to perform this action.'); }
}

export class CannotDeleteAdminUserError extends Error {
  public constructor() { super('The administrator account cannot be deleted.'); }
}

export class UserNotFoundError extends Error {
  public constructor() { super('User was not found.'); }
}
