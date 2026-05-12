# Project TODO

## 인프라 및 설정
- [x] 다크 테마 기반 디자인 시스템 설정 (index.css 테마 변수, 폰트)
- [x] DB 스키마 설계 (watchlist, signal_history 테이블)
- [x] DB 마이그레이션 실행

## 백엔드 - 데이터 수집 및 캐싱
- [x] yfinance 서버사이드 데이터 수집 모듈 구현 (시세, 과거 데이터)
- [x] TTL 기반 인메모리 캐싱 시스템 구현 (과도한 호출 방지)
- [x] 기술적 지표 계산 모듈 (RSI, MACD, MA5/MA20/MA60)
- [x] 매수/매도/중립 신호 자동 생성 로직

## 백엔드 - tRPC API
- [x] 종목 시세 조회 API (캐싱 적용)
- [x] 종목 과거 데이터 + 기술적 지표 조회 API
- [x] 관심 종목 CRUD API (추가/삭제/목록)
- [x] 매매 신호 히스토리 조회 API
- [x] AI 분석 코멘트 생성 API (LLM 연동)

## 프론트엔드 - 레이아웃 및 네비게이션
- [x] DashboardLayout 사이드바 네비게이션 커스터마이징
- [x] 대시보드 홈 (종목 요약 카드, 신호 배지)
- [x] 종목 상세 분석 페이지 (캔들스틱 차트 + 지표)

## 프론트엔드 - 차트 및 시각화
- [x] Recharts 캔들스틱 차트 구현
- [x] RSI 차트 서브패널
- [x] MACD 차트 서브패널
- [x] 이동평균선 오버레이 (MA5/MA20/MA60)

## 프론트엔드 - 기능 UI
- [x] 관심 종목 관리 UI (추가/삭제)
- [x] 매수/매도/중립 신호 배지 표시
- [x] AI 분석 코멘트 표시 (자연어 인사이트)
- [x] 신호 알림 배지 (대시보드 실시간 반영)
- [x] 신호 히스토리 조회 페이지

## 테스트
- [x] 기술적 지표 계산 로직 단위 테스트
- [x] tRPC API 엔드포인트 테스트

## 한국 주식(KRX) 지원
- [x] 한국 종목 티커 포맷 지원 (.KS 코스피, .KQ 코스닥)
- [x] 한국 주식 한글 검색 지원 (삼성전자, 네이버 등)
- [x] 원화(₩) 통화 표시 지원
- [x] KOSPI/KOSDAQ 시장 배지 표시
- [x] 인기 한국 종목 빠른 검색 로컬 DB

## 백테스팅 시뮬레이션
- [x] 백테스팅 엔진 구현 (RSI/MACD/MA/복합 전략)
- [x] 전략 파라미터 설정 UI (RSI 임계값, MA 기간, 자본금 등)
- [x] 수익률 및 성과 지표 시각화 (에쿼티 커브, 낙폭 차트)
- [x] 거래 내역 표시 (매수/매도 시점, 가격, 사유)
- [x] Buy & Hold 대비 전략 수익률 비교
- [x] 샤프 비율, 승률, MDD 등 성과 지표 계산
- [x] 백테스팅 페이지 UI 및 사이드바 네비게이션 추가
- [x] tRPC backtest.run API 엔드포인트
- [x] 백테스팅 엔진 단위 테스트

## AI 코멘트 정확성 개선
- [x] LLM 프롬프트에 신호 강도(strength) 비례 톤 가이드 추가
- [x] 신호 강도 5구간 톤 가이드: <=20 관망, <=40 분할, <=60 고려, <=80 적극, >80 강한 신호
- [x] MACD 절대값 맥락 설명 (한국 주식 단위 고려)
- [x] 투자 위험 경고 문구 의무 포함
- [x] 신호 근거와 권장 행동 수준(actionTone)을 AI 프롬프트에 명시적으로 포함

## 종목 스캐너 기능
- [x] 미국 주요 종목 리스트 (S&P500 대표 100개 + 나스닥 100 포함)
- [x] 한국 주요 종목 리스트 (KOSPI200 대표 100개)
- [x] 배치 스캔 엔진: 순차 처리 + TTL 캐싱으로 Yahoo Finance 차단 방지
- [x] 신호 강도 순 정렬 및 매수/매도/중립 필터
- [x] 스캐너 결과 페이지 UI (테이블 형태, 실시간 진행률 표시)
- [x] 사이드바에 스캐너 메뉴 추가

## 진입/청산 가이드 기능
- [x] 기술적 지표 기반 진입가(매수 적정가) 계산 로직
- [x] 목표가(1차/2차) 계산 로직 (저항선, ATR 기반)
- [x] 손절가 계산 로직 (지지선, ATR 기반)
- [x] 리스크/리워드 비율 계산
- [x] 종목 상세 페이지에 매매 가이드 섹션 추가
- [x] 스캐너 결과에 간략 매매 가이드 표시

## 파라미터 자동 최적화 (그리드 서치)
- [x] 그리드 서치 엔진 구현 (RSI 임계값, MA 기간, MACD 설정 조합 자동 탐색)
- [x] 최적화 목표 지표 선택 (최대 수익률 / 최대 승률 / 최대 샤프비율)
- [x] 상위 N개 최적 파라미터 조합 결과 반환
- [x] tRPC backtest.optimize API 엔드포인트
- [x] 백테스팅 페이지에 "자동 최적화" 탭 추가
- [x] 최적 파라미터 자동 적용 버튼 (원클릭으로 백테스트에 반영)
- [x] 최적화 진행률 표시 (몇 개 조합 중 몇 개 완료)
- [x] 파라미터 최적화 단위 테스트

## 최적화 기능 보완
- [x] 최적화 진행률 상태를 서버/클라이언트에 구현 (자동 최적화 탭 로딩 스피너 + 전체 조합 수 표시)
- [x] runGridSearch/backtest.optimize 전용 단위 테스트 추가 (9개 테스트 추가, 49개 전체 통과)

## 기능 고도화 - 원클릭 자동 최적화
- [x] 가중치 기반 스코어링 로직: Score = (연환산수익률*0.4) + (승률*0.4) - (MDD*0.2)
- [x] optimize API에서 AI 추천 전략(최고 스코어 조합) 별도 반환
- [x] 백테스팅 페이지 [자동 최적화 시작] 버튼 및 자동 적용 UI
- [x] AI 추천 전략 배지/하이라이트 카드 UI (파란색 Bot 아이콘, 복합 스코어 표시)

## 기능 고도화 - AI 뉴스 감성 분석
- [x] yahoo-finance2 news 메서드로 종목 최신 기사 5~10개 수집
- [x] LLM으로 뉴스 텍스트 분석 → -1~1 감성 점수 + 요약 코멘트 생성
- [x] tRPC stock.newsSentiment API 엔드포인트
- [x] 종목 상세 페이지 AI 뉴스 감성 게이지 UI (게이지 바, 점수, 요약 코멘트)

## 기능 고도화 - 거시경제 대시보드 위젯
- [x] 거시경제 티커 수집: USD/KRW(KRW=X), 미국 10년물(^TNX), 코스피(^KS11), S&P500(^GSPC)
- [x] tRPC macro.indices API 엔드포인트 (TTL 캐싱 적용)
- [x] 사이드바 하단 거시경제 미니 위젯 UI (가격, 등락률 실시간 표시)

## 기능 고도화 - 볼린저 밴드
- [x] 볼린저 밴드 계산 로직 추가 (20일 MA ± 2표준편차)
- [x] 캔들스틱 차트에 볼린저 밴드 상/하한선 오버레이 (토글 버튼)
- [x] 백테스팅 엔진에 볼린저 밴드 전략 추가 (하단 터치 매수, 상단 터치 매도)
- [x] 백테스팅 UI에 볼린저 밴드 전략 옵션 추가 (수동 탭 + 자동 최적화 탭)

## AI 차트 패턴 인식 (Pattern Recognition)
- [x] shared/types.ts에 ChartPattern 인터페이스 추가 (patternName, direction, confidence, description, keyPoints)
- [x] server/routers.ts에 chartPattern.analyze API 추가 (60일 OHLC → LLM 패턴 분석)
- [x] StockDetail.tsx 차트 아래 AI 패턴 인식 섹션 UI (배지, 완성도 게이지, 설명, 핵심 관찰 포인트)

## AI 뉴스 감성 분석 개선
- [x] news.sentiment API에서 3단계 fallback 전략 추가 (다이렉트 티커 → 클린 티커 → 회사명 검색)
- [x] 뉴스 없을 때 LLM이 주가 추세 데이터 기반으로 시장 심리 분석 제공 ("현재 분석 가능한 뉴스가 없습니다" 메시지 제거)
- [x] StockDetail.tsx 뉴스 섹션에 뉴스 링크 및 날짜 표시 개선 (클릭 가능한 외부 링크)

## 타입 안전성 및 테스트 강화
- [x] shared/types.ts의 NewsSentiment.headlines 타입을 NewsHeadlineItem[] 객체 배열로 수정 (title, link?, publishedAt?)
- [x] chartPattern.analyze 및 news.sentiment 전용 단위 테스트 6개 추가 (총 55개 테스트 통과)
- [x] StockDetail.tsx 뉴스 헤드라인 any 캐스팅 제거 - 타입 안전한 렌더링 적용

## 포트폴리오 손익 추적
- [x] DB 스키마: portfolio_positions 테이블 (userId, ticker, name, quantity, avgPrice, addedAt)
- [x] DB 마이그레이션 실행
- [x] portfolio CRUD API (add/remove/list/update with P&L 계산)
- [x] 포트폴리오 탭 페이지 UI (보유 종목, 매수가, 현재가, 수익률, 손익 금액)
- [x] 포트폴리오 전체 평가금액 및 총 수익률 요약 카드
- [x] 사이드바 네비게이션에 포트폴리오 메뉴 추가

## 신호 알림 자동화 (Alert Conditions)
- [x] DB 스키마: alert_conditions 테이블 (userId, ticker, conditionType, threshold, isActive)
- [x] DB 마이그레이션 실행
- [x] alert CRUD API (create/delete/list/toggle)
- [x] 알림 조건 평가 로직 (RSI 임계값, 신호 강도, 가격 돌파 등)
- [x] 조건 충족 시 notifyOwner 알림 발송
- [x] Alerts.tsx 알림 조건 관리 페이지 (조건 추가/삭제/토글)
- [x] 사이드바 알림 조건 관리 메뉴 추가

## 전략 비교 차트 (Strategy Comparison)
- [x] 백테스팅 페이지에 "전략 비교" 탭 추가
- [x] 여러 전략 동시 실행 후 에쿼티 커브 오버레이 차트 (5개 전략 색상 구분)
- [x] 전략별 핵심 성과 지표 비교 테이블 (수익률, 승률, MDD, 복합 스코어, 크라운 배지)

## 스캐너 결과 히스토리
- [x] DB 스키마: scan_history 테이블 (id, market, scannedAt, topBuys JSON, topSells JSON)
- [x] DB 마이그레이션 실행
- [x] 스캔 완료 시 상위 결과 DB 자동 저장
- [x] 스캐너 페이지 하단 이전 스캔 히스토리 섹션 (매수/매도 상위 종목 배지 표시)

## UX 보완
- [x] Yahoo Finance 오류 시 stale 캐시 데이터 반환 + "X분 전 데이터" 노란 배지 (StockDetail + Home 카드)
- [x] 차트 기간 선택 localStorage 저장 (페이지 이동 후 복원)
- [x] 빈 관심 목록 온보딩 UI (인기 종목 12개 원클릭 추가 그리드)
- [x] 종목 메모 기능 (StockDetail 하단 메모 작성/수정/삭제)
- [x] 스캐너 자동 실행 옵션 - 스캔 히스토리 섹션으로 자동 저장 구현 (scanner.start 실행 시 DB 저장)

## 포트폴리오 UX 개선
- [x] 대시보드 종목 카드에 포트폴리오 원클릭 추가 버튼 (현재가 자동 입력)
- [x] StockDetail 페이지 상단에 포트폴리오 추가 버튼 (현재가 자동 입력)
- [x] 스캐너 결과 테이블 행에 포트폴리오 추가 버튼
- [x] 포트폴리오 추가 시 수량만 입력하는 간소화 모달 (가격은 현재가 자동 세팅)
- [x] 이미 포트폴리오에 있는 종목은 버튼 상태 변경 (추가됨 표시)

## 추가 UX 개선
- [x] 알림 조건 자동 평가 스케줄러 (10분 간격, 30분 재발송 방지, 서버 시작 1분 후 시작)
- [x] 포트폴리오 페이지 정렬/필터 기능 (수익률순, 손익금액순, 티커순, 수익/손실 필터)
- [x] 대시보드 홈 포트폴리오 미니 요약 위젯 (클릭 시 포트폴리오 페이지로 이동)
- [x] Portfolio.tsx 관심 종목 빠른 추가 섹션 (이미 등록된 종목 제외)
- [x] StockDetail 페이지 - 포트폴리오 보유 중인 종목이면 현재 손익 배지 표시 (헤더 종목명 옆 녹색/빨간색 배지)
- [x] 스캐너 결과에서 포트폴리오 보유 종목 강조 표시 (행 좌측 녹색 라인 + "✓ 보유 중" 배지)

## 신호 강도 체계 완전 재설계
- [x] generateSignal 함수 재설계: 순간 크로스 의존 제거, 연속 추세 강도 반영
- [x] 점수 항목 확장: RSI 위치/방향성, MACD 히스토그램 연속 증가, 이동평균 배열, 볼린저 밴드 위치, 거래량 급증, 가격 모멘텀
- [x] 5단계 투자 등급 도입: 강력매수(80+) / 매수(55+) / 관망(35+) / 매도(15+) / 강력매도(0+)
- [x] 초보자 친화적 이유 설명: 전문 용어 없이 "RSI가 낮아 저평가 구간입니다" 형태로 변환
- [x] 각 지표별 기여도 분해 표시 (레이더 차트 또는 바 차트)
- [x] 대시보드 카드 신호 등급 배지 UI 개선
- [x] StockDetail 신호 강도 시각화 개선 (등급 + 점수 분해)
- [x] 스캐너 결과 테이블 신호 등급 컬럼 개선
- [x] 신호 강도 관련 테스트 업데이트


## 실시간 상승/하락 주식 순위 (Top Movers)
- [x] 백엔드: 미국 주식 상위 100개 중 상승/하락 주식 스캠답 API (등락률 기준 정렬)
- [x] 백엔드: tRPC stock.topMovers API 엔드포인트 (상승 상위 10개, 하락 상위 10개 반환)
- [x] 백엔드: 5분 TTL 캠싱으로 Yahoo Finance 호출 최소화
- [x] 프론트엔드: 사이드바 하단에 "실시간 순위" 센션 추가
- [x] 프론트엔드: 상승/하락 탭 토글 (기본값: 상승)
- [x] 프론트엔드: 순위 리스트 UI (순위 번호, 티커, 등락률%, 현재가, 변동액)
- [x] 프론트엔드: 순위 항목 클릭 시 StockDetail 페이지로 이동
- [x] 프론트엔드: 10초 간격 자동 갱신 (useEffect + polling)
- [x] 테스트: topMovers API 단위 테스트 추가 (마른 스타일 동적 데이터 내려주기 때문에 마른 스타일로 리단 내려주기)


## 초대 링크 기반 랜등 페이지 및 자동 리다이렉트
- [x] 공개 랜등 페이지 (Landing.tsx) - 로그인 없이 접근 가능
- [x] 랜등 페이지 UI: 기능 설명, 주요 지표 미리보기, "지금 시작하기" CTA
- [x] "지금 시작하기" 버튼: 사용자의 초대 링크로 리다이렉트
- [x] RootPage 생성: 로그인 상태에 따라 Landing 또는 Home 리단린기
- [x] 초대 링크 쿠키 저장: 방문자가 초대 링크를 통해 온 경우 기록
- [x] useReferralTracking 후 생성: 초대 코드 추적 및 로컬 스토리지 저장
- [x] const.ts 업데이트: REFERRAL_LINK 및 getSignUpUrl 초대 링크 함수 추가
- [x] 모바일 반응형 랜등 페이지 디자인
- [x] 테스트: 초대 링크 → 회원가입 → 초대자 인식 확인 (로컬 스토리지 추적 및 리다이렉트 동작 검증)


## 신호 강도 기준 통일 및 수익화 준비
- [x] 데이터 기반 신호 기준 최적화: 60점 강력매수, 35점 매수, -35점 관망, -60점 매도 (신호 강도별 수익률 분석 기반)
- [x] server/yahoo.ts gradeFromScore 함수 업데이트: 60점 강력매수, 35점 매수 기준 적용
- [x] Landing 페이지 신호 기준 수정: 60점 강력매수, 35점 매수로 통일
- [x] 테스트 및 검증: 72개 테스트 모두 통과
- [x] 신호 정확도 추적 데이터베이스 추가: signal_performance 테이블 (신호별 수익률, 정확도 추적)
- [x] 구독 시스템 기초 구조: subscriptions 테이블 (배연 중)
- [x] Migration SQL 생성: drizzle-kit generate로 마이그레이션 파일 생성
- [x] 신호 정확도 대시보드: 향후 유료 기능으로 배정 (현재 스코프 외)


## Manus 가입 후 자동 리다이렉트 구현
- [x] 초대 링크에 return_url 파라미터 추가 - Manus 가입 후 Stock Signal AI로 돌아올 주소 포함
- [x] Manus OAuth callback 처리 개선 - 가입 후 자동으로 Stock Signal AI 대시보드로 리다이렉트
- [x] Landing 페이지 "지금 시작하기" 버튼 수정 - return_url 파라미터 포함해서 초대 링크 생성
- [x] 테스트: 초대 링크 → Manus 가입 → Stock Signal AI 자동 리다이렉트 및 로그인 검증 (72개 테스트 모두 통과)


## 로그인 버튼 근본 원인 수정
- [x] Landing 페이지 "무료로 시작하기" / "로그인" 버튼을 getLoginUrl() OAuth 흐름으로 변경
- [x] Landing 페이지에 "Manus 계정 만들기" 버튼 추가 (초대 링크로 연결, 신규 가입자용)
- [x] 로그인 후 대시보드로 자동 이동 확인 (RootPage.tsx 로그인 상태 분기 동작 확인)


## 실시간 데이터 표시 수정 (4월 17일 고정 문제)
- [x] 원인 확인: 현재가/등락률은 실시간 quote 사용 중, 기술적 지표(RSI/MACD)가 히스토리 마지막 종가 기준으로 계산됨
- [x] getStockSummary 함수 수정: 오늘 실시간 가격으로 오늘 캔들 생성 후 지표 재계산
- [x] 오늘 캔들이 없으면 추가, 있으면 실시간 가격으로 업데이트 후 enrichWithIndicators 재실행
- [x] 테스트 72개 모두 통과


## 실시간 데이터 갱신 속도 최적화 (Yahoo Finance 제한 내)
- [x] 서버: quote 캐시 TTL을 장중 15초, 장외 5분으로 스마트하게 조정
- [x] 서버: 백그라운드 프리페치 - 워치리스트 종목을 주기적으로 미리 갱신
- [x] 서버: registerPrefetchTicker/unregisterPrefetchTicker API - 워치리스트 등록/해제
- [x] 프론트: 대시보드 카드 폴링 간격 20초로 단축 (스테일 15초)
- [x] 프론트: StockDetail 페이지 폴링 간격 20초로 단축
- [x] 프론트: 매크로 지표 폴링 30초로 단축
- [x] 프론트: Top Movers 폴링 30초로 조정 (서버 캐시 TTL과 맞춰)
- [x] 프론트: 가격 변동 시 카드 플래시 애니메이션 (올라가면 초록, 내려가면 빨강)
- [x] 프론트: 마지막 갱신 시간 표시 ("방금 전", "15초 전" 등) - 대시보드 및 StockDetail
- [x] 테스트: 72개 모두 통과


## 한국 주식 실시간 갱신 수정
- [x] isKRMarketOpen() 함수 추가 - 한국 장 개장 시간(UTC 00:00~06:30) 감지
- [x] getQuoteTTL/getSummaryTTL에서 미국+한국 장 모두 감지하여 장중 15초 TTL 적용
- [x] stock.marketStatus API 추가 - 장 상태, 다음 개장 시간 힌트 반환
- [x] 대시보드 헤더에 장 상태 배지 UI 추가 (미국 장 / 한국 장 / 장 마감 + 다음 개장 시간)
- [x] 테스트 72개 모두 통과

## 한국 주식 Top Movers 탭 추가
- [x] 백엔드: getKRTopMovers() 함수 추가 (한국 주요 30개 종목 스캔, 등락률 기준 정렬)
- [x] 백엔드: stock.topMovers API에 market 파라미터 추가 ('US' | 'KR')
- [x] 프론트엔드: TopMoversWidget에 US/KR 탭 토글 추가
- [x] 프론트엔드: KR 탭에서 한국 장 개장 여부 표시
- [x] 테스트: KR topMovers API 단위 테스트 추가 (75개 테스트 모두 통과)


## 전면 개선 (분석 보고서 기반)

### 즉시 버그 수정
- [x] PARA 등 상장폐지 종목 제거 (scanner.ts + yahoo.ts)
- [x] scanner.ts 중복 종목 정리 (한국 9개, 미국 1개)
- [x] yahoo.ts 중복 종목 리스트 정리

### 코드 구조 리팩토링
- [ ] yahoo.ts 분리: indicators.ts, signal.ts, marketHours.ts, cache.ts
- [x] routers.ts 분리: stock.ts, watchlist.ts, portfolio.ts, alerts.ts, ai.ts 등

### 차트 개선
- [x] TradingView Lightweight Charts 도입
- [x] 캔들스틱 차트 구현
- [x] 줌/팬 기능
- [x] 크로스헤어 + 가격 표시
- [x] 기술적 지표 오버레이 (MA, 볼린저밴드)
- [x] 거래량 하단 바 차트

### 신호 성과 자동 기록
- [x] 신호 생성 시 signalPerformance 테이블에 자동 기록
- [x] 7일/14일/30일 후 수익률 자동 업데이트 (30분 간격 스케줄러)
- [x] 신호 정확도 통계 API 추가 (signalPerformance.stats, signalPerformance.recent)
- [x] 대시보드에 신호 성과 요약 위젯 표시

### 알림 시스템 개선
- [x] 알림 평가 간격 10분 → 2분으로 단축
- [x] 알림 안내 문구 업데이트 (2분 간격, 10분 중복 방지)
- [ ] 사용자별 알림 (owner 전용 → 모든 사용자) - 향후 과제

### 모바일 반응형 개선
- [x] Scanner.tsx 모바일 반응형 전면 개선 (카드형 레이아웃, 테이블 overflow)
- [x] StockDetail.tsx 헤더 모바일 레이아웃 개선 (버튼 두 줄 분리)
- [ ] 차트 터치 제스처 지원 - TradingView 기본 지원
- [x] 테이블 가로 스크롤 처리

### 보안 및 안정성
- [x] tRPC rate limiting 미들웨어 추가 (AI: 10회/분, Scanner: 3회/분)
- [x] 티커 입력 형식 검증 강화 (영문대문자 + .KS/.KQ 패턴, ai.ts + scanner.ts)

### 프론트엔드 테스트 및 정리
- [x] ComponentShowcase.tsx 프로덕션 라우트에서 제거 (이미 없음 확인)
- [x] signalPerformance 라우터 테스트 추가 (82개 테스트 모두 통과)
- [x] 티커 검증 테스트 추가
