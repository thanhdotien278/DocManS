import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_TRACKED_KEYS = 10_000;
const RATE_LIMIT_MESSAGE = "Đăng nhập tạm thời bị giới hạn. Vui lòng thử lại sau.";

type LoginAttemptState = {
  failedAttempts: number;
  windowStartedAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, LoginAttemptState>();
  private readonly trusted = new Set<string>();

  assertCanAttempt(key: string, now = Date.now(), message = RATE_LIMIT_MESSAGE, maxFailedAttempts = MAX_FAILED_ATTEMPTS) {
    const state = this.getState(key, now);

    if (state.failedAttempts >= maxFailedAttempts) {
      throw new HttpException({ message }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  recordFailure(key: string, now = Date.now()) {
    const state = this.getState(key, now);
    state.failedAttempts += 1;
    this.attempts.set(key, state);
    // Keys come from unauthenticated input (usernames, addresses): drop expired ones so the map cannot grow without bound.
    if (this.attempts.size > MAX_TRACKED_KEYS) {
      for (const [trackedKey, tracked] of this.attempts) if (now - tracked.windowStartedAt > WINDOW_MS) this.attempts.delete(trackedKey);
    }
  }

  /** Marks a key that has completed a successful login; callers may exempt it from wider caps. */
  markTrusted(key: string) {
    if (this.trusted.size >= MAX_TRACKED_KEYS) this.trusted.clear();
    this.trusted.add(key);
  }

  isTrusted(key: string) {
    return this.trusted.has(key);
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
