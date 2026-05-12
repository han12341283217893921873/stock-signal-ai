export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 사용자의 초대 링크 (Manus 초대 - 더 이상 사용하지 않음)
export const REFERRAL_LINK =
  "https://manus.im/invitation/HZ1US57SIU3XEI?utm_source=invitation&utm_medium=social&utm_campaign=system_share";

/**
 * Google OAuth 로그인 URL 반환
 * 서버의 /api/auth/google 엔드포인트로 이동하면 자동으로 Google 로그인 페이지로 리다이렉트됩니다.
 */
export const getLoginUrl = () => {
  return `${window.location.origin}/api/auth/google`;
};

/**
 * 로그아웃 후 홈으로 이동하는 URL
 */
export const getSignUpUrl = (_returnUrl?: string) => {
  // Google OAuth에서는 별도 회원가입 없이 로그인으로 통합
  return getLoginUrl();
};
