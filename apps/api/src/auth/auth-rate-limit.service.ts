import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_MESSAGE = "Đăng nhập tạm thời bị giới hạn. Vui lòng thử lại sau.";

type LoginAttemptState = {
  failedAttempts: number;
  windowStartedAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, LoginAttemptState>();

  assertCanAttempt(key: string, now = Date.now()) {
    const state = this.getState(key, now);

    if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      throw new HttpException({ message: RATE_LIMIT_MESSAGE }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  recordFailure(key: string, now = Date.now()) {
    const state = this.getState(key, now);
    state.failedAttempts += 1;
    this.attempts.set(key, state);
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  private getState(key: string, now: number) {
    const current = this.attempts.get(key);

    if (!current || now - current.windowStartedAt > WINDOW_MS) {
      return {
        failedAttempts: 0,
        windowStartedAt: now
      };
    }

    return current;
  }
}
