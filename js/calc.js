// 비용 계산 순수 함수 (PRD 5장). DOM을 사용하지 않는다.
(function (root) {
  'use strict';

  // 공영주차장 요금 (경기 1회). rule.type: 'flat'(경기일 정액) | 'time'(시간 요금)
  function parkingFee(rule, minutes) {
    if (rule.type === 'flat') return rule.fee;
    if (rule.type === 'time') {
      const extra = Math.max(0, minutes - rule.baseMin);
      let fee = rule.baseFee + Math.ceil(extra / rule.unitMin) * rule.unitFee;
      if (rule.dailyMax != null) fee = Math.min(fee, rule.dailyMax);
      return fee;
    }
    throw new Error('알 수 없는 주차 요금 유형: ' + rule.type);
  }

  // 승용차 1회 왕복 — 인원수와 무관 (차 1대)
  function carRoundTrip(stadium, settings) {
    const c = stadium.car;
    const fuel = Math.round((c.distanceKm * 2 / settings.fuelEfficiency) * settings.fuelPrice);
    const toll = c.toll * 2;
    const parking = parkingFee(c.parking.rule, settings.parkingMinutes);
    return { fuel: fuel, toll: toll, parking: parking, total: fuel + toll + parking };
  }

  // 대중교통 1회 왕복 = 1인 편도 × 2 × 인원수
  function transitRoundTrip(stadium, settings) {
    const t = stadium.transit;
    const oneWay = t.access + t.main + t.local;
    return { oneWay: oneWay, total: oneWay * 2 * settings.people };
  }

  // 경기별 비용 행
  function gameCosts(games, stadiums, settings) {
    return games.map(function (g) {
      const s = stadiums[g.stadium];
      const car = carRoundTrip(s, settings);
      const transit = transitRoundTrip(s, settings);
      return { game: g, car: car, transit: transit, diff: car.total - transit.total };
    });
  }

  // 연간 합계
  function annualTotals(games, stadiums, settings) {
    return gameCosts(games, stadiums, settings).reduce(function (acc, r) {
      acc.fuel += r.car.fuel;
      acc.toll += r.car.toll;
      acc.parking += r.car.parking;
      acc.car += r.car.total;
      acc.transit += r.transit.total;
      return acc;
    }, { fuel: 0, toll: 0, parking: 0, car: 0, transit: 0 });
  }

  // 구장별 집계 (첫 등장 순서 유지)
  function stadiumSummary(games, stadiums, settings) {
    const map = {};
    const order = [];
    gameCosts(games, stadiums, settings).forEach(function (r) {
      const key = r.game.stadium;
      if (!map[key]) {
        map[key] = { stadium: key, name: stadiums[key].name, count: 0, car: 0, transit: 0, diff: 0 };
        order.push(key);
      }
      map[key].count += 1;
      map[key].car += r.car.total;
      map[key].transit += r.transit.total;
      map[key].diff += r.diff;
    });
    return order.map(function (k) { return map[k]; });
  }

  // 추천 (PRD 5.3): 차액 = 승용차 − 대중교통
  function recommend(totals) {
    const diff = totals.car - totals.transit;
    if (diff > 0) return { mode: 'transit', label: '대중교통', saving: diff };
    if (diff < 0) return { mode: 'car', label: '승용차', saving: -diff };
    return { mode: 'same', label: '동일', saving: 0 };
  }

  // 손익분기 인원: 대중교통 합 ≥ 승용차 합이 되는 최소 인원 (1~maxPeople), 없으면 null
  function breakEvenPeople(games, stadiums, settings, maxPeople) {
    const max = maxPeople || 6;
    for (let n = 1; n <= max; n++) {
      const t = annualTotals(games, stadiums, Object.assign({}, settings, { people: n }));
      if (t.transit >= t.car) return n;
    }
    return null;
  }

  // 직관 성적: 승률 = 승 ÷ (승+패), 무승부 제외. 표본 없으면 null
  function winStats(games) {
    const s = { win: 0, loss: 0, draw: 0, none: 0 };
    games.forEach(function (g) {
      if (g.result === '승') s.win++;
      else if (g.result === '패') s.loss++;
      else if (g.result === '무') s.draw++;
      else s.none++;
    });
    const decided = s.win + s.loss;
    s.winRate = decided > 0 ? s.win / decided : null;
    return s;
  }

  // 설정값 검증. 성공: { ok: true, value }, 실패: { ok: false, message }
  const SETTING_RULES = {
    fuelPrice: { label: '유가', min: 1, max: 10000, integer: false },
    fuelEfficiency: { label: '연비', min: 1, max: 100, integer: false },
    people: { label: '인원수', min: 1, max: 6, integer: true },
  };

  function validateSetting(key, raw) {
    const rule = SETTING_RULES[key];
    if (!rule) return { ok: false, message: '알 수 없는 설정입니다.' };
    const text = String(raw == null ? '' : raw).trim();
    if (text === '') return { ok: false, message: rule.label + ': 값을 입력하세요.' };
    const value = Number(text);
    if (!Number.isFinite(value)) return { ok: false, message: rule.label + ': 숫자만 입력할 수 있습니다.' };
    if (rule.integer && !Number.isInteger(value)) return { ok: false, message: rule.label + ': 정수로 입력하세요.' };
    if (value < rule.min || value > rule.max) {
      return { ok: false, message: rule.label + ': ' + rule.min + '~' + rule.max + ' 사이로 입력하세요.' };
    }
    return { ok: true, value: value };
  }

  function formatWon(n) {
    return n.toLocaleString('ko-KR') + '원';
  }

  const CALC = {
    parkingFee: parkingFee,
    carRoundTrip: carRoundTrip,
    transitRoundTrip: transitRoundTrip,
    gameCosts: gameCosts,
    annualTotals: annualTotals,
    stadiumSummary: stadiumSummary,
    recommend: recommend,
    breakEvenPeople: breakEvenPeople,
    winStats: winStats,
    validateSetting: validateSetting,
    SETTING_RULES: SETTING_RULES,
    formatWon: formatWon,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CALC;
  else root.CALC = CALC;
})(this);
