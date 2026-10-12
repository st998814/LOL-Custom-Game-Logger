type UserLinkErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_REGISTERED'
  | 'LINK_EXPIRED'
  | 'ALREADY_LINKED'
  | 'TG_ALREADY_LINKED';

/** Base for user account / link failures; carries the HTTP status and response code. */
class UserLinkError extends Error {
  readonly status: number;
  readonly code: UserLinkErrorCode;

  constructor(message: string, status: number, code: UserLinkErrorCode) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
  }
}

class InvalidInputError extends UserLinkError {
  constructor(message: string) {
    super(message, 400, 'INVALID_INPUT');
  }
}

/** The PUUID has no players row yet; the link token stays valid for a retry. */
class NotRegisteredError extends UserLinkError {
  constructor(message = 'Player is not registered yet') {
    super(message, 404, 'NOT_REGISTERED');
  }
}

/** The link token is unknown, expired, or already used. */
class LinkExpiredError extends UserLinkError {
  constructor(message = 'Link token is invalid or expired') {
    super(message, 410, 'LINK_EXPIRED');
  }
}

/** The PUUID already has a Telegram id. */
class AlreadyLinkedError extends UserLinkError {
  constructor(message = 'Player is already linked to Telegram') {
    super(message, 409, 'ALREADY_LINKED');
  }
}

/** The Telegram id is already bound to another PUUID. */
class TgAlreadyLinkedError extends UserLinkError {
  constructor(message = 'Telegram account is already linked to another player') {
    super(message, 409, 'TG_ALREADY_LINKED');
  }
}

export {
  UserLinkError,
  InvalidInputError,
  NotRegisteredError,
  LinkExpiredError,
  AlreadyLinkedError,
  TgAlreadyLinkedError,
};
export type { UserLinkErrorCode };
