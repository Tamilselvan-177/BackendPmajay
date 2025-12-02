import { PMJAY_DOMAINS } from "../config/pmjayDomains.js";

export function computeIndicatorScore(indicator) {
  if (indicator.answerType === "yes_no") {
    return indicator.answer === "yes" ? 2 : 0;
  }
  if (indicator.answerType === "percentage") {
    const pct = indicator.percentage ?? 0;
    if (pct > 75) return 2;
    if (pct >= 50 && pct <= 75) return 1;
    return 0;
  }
  return 0;
}

export function computeDomainScores(indicators) {
  const scores = {};
  Object.keys(PMJAY_DOMAINS).forEach(domainKey => {
    scores[domainKey] = indicators
      .filter(ind => ind.domain === domainKey)
      .reduce((sum, ind) => sum + (ind.score || 0), 0);
  });
  return scores;
}
