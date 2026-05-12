import { useEffect } from "react";
import { REFERRAL_LINK } from "@/const";

/**
 * 초대 링크 추적 훅
 * - URL에서 초대 코드 추출 (ref, referral, utm_source 등)
 * - 로컬 스토리지에 저장
 * - 회원가입 시 사용
 */
export function useReferralTracking() {
  useEffect(() => {
    // URL 파라미터에서 초대 정보 추출
    const params = new URLSearchParams(window.location.search);

    // 다양한 초대 파라미터 확인
    const referralCode =
      params.get("ref") ||
      params.get("referral") ||
      params.get("utm_source") ||
      params.get("invitation");

    // 초대 정보가 있으면 로컬 스토리지에 저장
    if (referralCode) {
      localStorage.setItem("referral_code", referralCode);
      localStorage.setItem("referral_timestamp", new Date().toISOString());
    }

    // 초대 링크 자체에서 온 경우 (manus.im/invitation/...)
    if (window.location.href.includes("manus.im/invitation")) {
      const invitationMatch = window.location.href.match(
        /invitation\/([A-Z0-9]+)/
      );
      if (invitationMatch) {
        localStorage.setItem("referral_code", invitationMatch[1]);
        localStorage.setItem("referral_timestamp", new Date().toISOString());
      }
    }
  }, []);

  // 저장된 초대 코드 반환
  const getReferralCode = () => {
    return localStorage.getItem("referral_code");
  };

  // 초대 정보 초기화
  const clearReferral = () => {
    localStorage.removeItem("referral_code");
    localStorage.removeItem("referral_timestamp");
  };

  return {
    getReferralCode,
    clearReferral,
  };
}
