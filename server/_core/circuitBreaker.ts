/**
 * Circuit Breaker + Exponential Backoff Retry
 *
 * 외부 API 호출 실패 시 자동 재시도 및 장애 격리를 제공합니다.
 * - Closed: 정상 호출
 * - Open: 연속 실패 후 즉시 에러 반환 (복구 대기)
 * - Half-Open: 복구 타임아웃 후 테스트 호출 1회
 */

interface CircuitBreakerOptions {
  /** 서킷이 열리기까지 허용되는 연속 실패 횟수 (기본: 5) */
  failureThreshold?: number;
  /** 서킷이 열린 후 Half-Open 상태로 전환까지 대기 시간(ms) (기본: 30s) */
  recoveryTimeMs?: number;
}

interface RetryOptions {
  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries?: number;
  /** 초기 대기 시간(ms) (기본: 500ms, 이후 2배씩 증가) */
  baseDelayMs?: number;
  /** 최대 대기 시간(ms) (기본: 10s) */
  maxDelayMs?: number;
}

type CircuitState = "closed" | "open" | "half-open";

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;
  readonly name: string;

  constructor(name: string, opts: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.recoveryTimeMs = opts.recoveryTimeMs ?? 30_000;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeMs) {
        this.state = "half-open";
        console.log(`[CircuitBreaker:${this.name}] Half-open — testing recovery`);
      } else {
        throw new Error(
          `[CircuitBreaker:${this.name}] Circuit is OPEN. Service unavailable.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === "half-open") {
      console.log(`[CircuitBreaker:${this.name}] Recovery confirmed — closing circuit`);
    }
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold || this.state === "half-open") {
      if (this.state !== "open") {
        console.warn(
          `[CircuitBreaker:${this.name}] Circuit OPENED after ${this.failures} failures`
        );
      }
      this.state = "open";
    }
  }

  getState() {
    return this.state;
  }
}

/** 전역 서킷 브레이커 인스턴스 (API별) */
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  opts?: CircuitBreakerOptions
): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, opts));
  }
  return breakers.get(name)!;
}

/**
 * 지수 백오프 재시도 래퍼
 * 네트워크 오류, 5xx 에러 등 일시적 장애에 자동 재시도합니다.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 10_000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries) break;

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * 서킷 브레이커 + 재시도를 결합한 안전한 API 호출 래퍼
 *
 * @param breakerName  서킷 브레이커 식별자 (예: "finnhub", "yahoo")
 * @param fn           실행할 비동기 함수
 * @param retryOpts    재시도 옵션 (선택)
 * @param breakerOpts  서킷 브레이커 옵션 (선택)
 */
export async function safeApiCall<T>(
  breakerName: string,
  fn: () => Promise<T>,
  retryOpts?: RetryOptions,
  breakerOpts?: CircuitBreakerOptions
): Promise<T> {
  const breaker = getCircuitBreaker(breakerName, breakerOpts);
  return breaker.call(() => withRetry(fn, retryOpts));
}
