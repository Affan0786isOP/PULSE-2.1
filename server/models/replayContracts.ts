import type { ExperimentSessionRecord } from './sessionModels';

export class SessionAlreadyConsumedError extends Error {
  constructor(public readonly sessionData: ExperimentSessionRecord) {
    super('SESSION_ALREADY_CONSUMED');
    Object.setPrototypeOf(this, SessionAlreadyConsumedError.prototype);
  }
}

export class LeaderboardAlreadySubmittedError extends Error {
  constructor(public readonly sessionData: ExperimentSessionRecord) {
    super('LEADERBOARD_ALREADY_SUBMITTED');
    Object.setPrototypeOf(this, LeaderboardAlreadySubmittedError.prototype);
  }
}

export class AppError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
