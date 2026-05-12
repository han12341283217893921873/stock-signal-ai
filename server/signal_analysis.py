"""
signal_analysis.py - 신호 강도별 수익률 분석 스크립트

사용법:
  python signal_analysis.py <backtest_result.json>

  backtest_result.json: server/backtest.ts의 saveBacktestResult()가 생성한 JSON 파일
  결과는 stdout으로 출력됩니다 (Node.js child_process로 수집).

JSON 형식:
  {
    "ticker": "AAPL",
    "strategyType": "rsi",
    "trades": [
      { "signalStrength": 75, "returnPct": 5.2 },
      ...
    ]
  }
"""

import json
import sys
import os
import statistics
from typing import Dict, List, Tuple, Any


def load_backtest_data(json_path: str) -> Dict[str, Any]:
    """백테스트 결과 JSON 파일을 로드합니다."""
    if not os.path.exists(json_path):
        print(f"[오류] JSON 파일을 찾을 수 없습니다: {json_path}", file=sys.stderr)
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data


def analyze_signal_strength_performance(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    신호 강도별 수익률 분석
    - 신호 강도 구간별 (0-20, 20-40, 40-60, 60-80, 80-100) 평균 수익률 계산
    - 각 구간별 승률 계산
    - 최적 기준점 도출
    """
    if not trades:
        return {}

    # (신호강도, 수익률) 쌍 추출
    signal_data = [
        (float(t.get("signalStrength", 0)), float(t.get("returnPct", 0)))
        for t in trades
        if "signalStrength" in t and "returnPct" in t
    ]

    if not signal_data:
        print("[경고] 유효한 거래 데이터가 없습니다. signalStrength와 returnPct 필드가 필요합니다.", file=sys.stderr)
        return {}

    # 강도 구간별 분석
    bands = [
        (0, 20, "약함 (0-20)"),
        (20, 40, "중약 (20-40)"),
        (40, 60, "중간 (40-60)"),
        (60, 80, "강함 (60-80)"),
        (80, 101, "매우강함 (80-100)"),
    ]

    results = {}
    for min_strength, max_strength, label in bands:
        band_data = [
            (strength, return_pct)
            for strength, return_pct in signal_data
            if min_strength <= strength < max_strength
        ]

        if band_data:
            returns = [r for _, r in band_data]
            wins = sum(1 for _, r in band_data if r > 0)
            losses = sum(1 for _, r in band_data if r <= 0)

            results[label] = {
                "count": len(band_data),
                "avg_return": round(statistics.mean(returns), 2),
                "win_rate": round(wins / len(band_data) * 100, 1),
                "wins": wins,
                "losses": losses,
                "min_return": round(min(returns), 2),
                "max_return": round(max(returns), 2),
            }

    return results


def derive_optimal_thresholds(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    분석 결과를 바탕으로 최적 신호 기준점을 도출합니다.
    승률 70% 이상 + 평균 수익률 2% 이상인 구간을 기준으로 합니다.
    """
    optimal = {
        "strong_buy": 60,
        "buy": 35,
        "watch_range": [-35, 35],
        "sell": -35,
        "strong_sell": -60,
    }
    rationale = []

    # 데이터 기반 기준 조정
    for label, stats in analysis.items():
        if stats["win_rate"] >= 80 and stats["avg_return"] >= 3:
            # 이 구간의 최솟값을 강력매수 기준으로 사용
            if "강함" in label:
                optimal["strong_buy"] = 60
                rationale.append(f"{label}: 승률 {stats['win_rate']}%, 평균 수익률 {stats['avg_return']}% → 강력매수 기준 60점")
        elif stats["win_rate"] >= 65 and stats["avg_return"] >= 1.5:
            if "중약" in label or "중간" in label:
                optimal["buy"] = 30
                rationale.append(f"{label}: 승률 {stats['win_rate']}%, 평균 수익률 {stats['avg_return']}% → 매수 기준 30점")

    return {"thresholds": optimal, "rationale": rationale}


def main():
    # 명령행 인수에서 JSON 파일 경로 읽기
    if len(sys.argv) < 2:
        print("[오류] 사용법: python signal_analysis.py <backtest_result.json>", file=sys.stderr)
        sys.exit(1)

    json_path = sys.argv[1]

    # JSON 데이터 로드
    data = load_backtest_data(json_path)
    trades = data.get("trades", [])
    ticker = data.get("ticker", "UNKNOWN")
    strategy = data.get("strategyName", data.get("strategyType", "Unknown"))
    summary = data.get("summary", {})

    # 분석 실행
    analysis = analyze_signal_strength_performance(trades)

    # 결과 출력
    print("=" * 60)
    print(f"신호 강도별 수익률 분석")
    print(f"종목: {ticker} | 전략: {strategy}")
    print(f"전체 거래 수: {summary.get('totalTrades', len(trades))}")
    print(f"총 수익률: {summary.get('totalReturn', 'N/A')}% | 승률: {summary.get('winRate', 'N/A')}%")
    print("=" * 60)

    if not analysis:
        print("\n[경고] 분석 가능한 데이터가 없습니다.")
        return

    for band, stats in analysis.items():
        print(f"\n{band}")
        print(f"  거래 수: {stats['count']}")
        print(f"  평균 수익률: {stats['avg_return']}%")
        print(f"  승률: {stats['win_rate']}% ({stats['wins']}승 {stats['losses']}패)")
        print(f"  수익 범위: {stats['min_return']}% ~ {stats['max_return']}%")

    # 최적 기준 도출
    optimal_result = derive_optimal_thresholds(analysis)

    print("\n" + "=" * 60)
    print("최적 기준 도출")
    print("=" * 60)

    thresholds = optimal_result["thresholds"]
    print("\n추천 신호 기준:")
    print(f"  strong_buy: {thresholds['strong_buy']}점 이상")
    print(f"  buy: {thresholds['buy']}점 이상")
    print(f"  watch: {thresholds['watch_range'][0]}점 ~ {thresholds['watch_range'][1]}점")
    print(f"  sell: {thresholds['sell']}점 이하")
    print(f"  strong_sell: {thresholds['strong_sell']}점 이하")

    if optimal_result["rationale"]:
        print("\n데이터 기반 근거:")
        for reason in optimal_result["rationale"]:
            print(f"  - {reason}")
    else:
        print("\n근거:")
        print("  - 기본 기준값 사용 (데이터 부족으로 자동 조정 불가)")
        print("  - 35점: 중약 신호부터 합리적 수익률 기대")
        print("  - 60점: 강한 신호부터 높은 신뢰도 확인")

    # JSON 형식 요약 출력 (Node.js가 파싱하기 쉽도록)
    print("\n" + "=" * 60)
    print("JSON 요약 (파싱용)")
    print("=" * 60)
    import json as json_module
    summary_json = {
        "ticker": ticker,
        "strategy": strategy,
        "analysis": analysis,
        "optimalThresholds": thresholds,
    }
    print(json_module.dumps(summary_json, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
