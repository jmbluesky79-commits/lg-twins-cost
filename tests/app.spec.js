// PRD(prd.md) 기준 검토 테스트. 실행: npx playwright test
// 단일 테스트: npx playwright test -g "AC2"
const { test, expect } = require('@playwright/test');
const path = require('path');

const STORAGE_KEY = 'lgTwinsCost.results.v1';
const SHOT_DIR = path.join(__dirname, 'screenshots');

// PRD 6.3 기대값 (유가 1700, 연비 12, 인원 1, 주차 5시간)
const EXPECTED = {
  jamsil:   { count: 10, fuel: 29750, toll: 9400,  parking: 6000,  car: 45150,  transit: 33700 },
  munhak:   { count: 1,  fuel: 31167, toll: 10000, parking: 2000,  car: 43167,  transit: 24100 },
  gocheok:  { count: 1,  fuel: 28333, toll: 9000,  parking: 10000, car: 47333,  transit: 28100 },
  suwon:    { count: 1,  fuel: 21250, toll: 6000,  parking: 5000,  car: 32250,  transit: 22800 },
  daejeon:  { count: 1,  fuel: 26917, toll: 7000,  parking: 0,     car: 33917,  transit: 23000 },
  daegu:    { count: 1,  fuel: 65167, toll: 20000, parking: 2000,  car: 87167,  transit: 68000 },
  gwangju:  { count: 1,  fuel: 65167, toll: 19000, parking: 0,     car: 84167,  transit: 74000 },
  sajik:    { count: 1,  fuel: 96333, toll: 30000, parking: 5000,  car: 131333, transit: 98200 },
  changwon: { count: 1,  fuel: 85000, toll: 27000, parking: 0,     car: 112000, transit: 92000 },
};

// 2026 실제 기록 (date, score 'LG:상대', result)
const RECORDS = {
  H1: ['2026-06-20', '4:2', '승'],  H2: ['2026-04-11', '4:3', '승'],  H3: ['2026-05-23', '5:2', '승'],
  H4: ['2026-03-28', '7:11', '패'], H5: ['2026-07-04', '5:3', '승'],  H6: ['2026-09-05', '3:4', '패'],
  H7: ['2026-05-30', '3:1', '승'],  H8: ['2026-06-13', '5:3', '승'],  H9: ['2026-05-02', '13:5', '승'],
  A1: ['2026-04-25', '7:5', '승'],  A2: ['2026-05-16', '3:4', '패'],  A3: ['2026-04-04', '6:4', '승'],
  A4: ['2026-06-03', '6:7', '패'], A5: ['2026-05-09', '3:11', '패'], A6: ['2026-04-18', '2:7', '패'],
  A7: ['2026-09-26', '1:5', '패'],  A8: ['2026-06-27', '8:7', '승'],  A9: ['2026-06-06', '5:8', '패'],
};

const PARKING_STATUS = {
  jamsil: '공식', munhak: '공식', gocheok: '공식', suwon: '비공식', daejeon: '추정',
  daegu: '비공식', gwangju: '추정', sajik: '비공식', changwon: '비공식',
};

const won = (n) => n.toLocaleString('ko-KR') + '원';
const signed = (n) => (n > 0 ? '+' : '') + won(n);

// type=number 입력란에 임의 문자열을 넣고 input 이벤트 발생 (fill은 숫자 아닌 값을 거부)
async function setSetting(page, id, value) {
  await page.evaluate(([id, value]) => {
    const el = document.getElementById(id);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, [id, value]);
}

async function setGame(page, gameId, field, value) {
  const loc = page.locator(`#game-rows tr[data-id="${gameId}"] [data-field="${field}"]`);
  if (field === 'result') await loc.selectOption(value);
  else { await loc.fill(value); await loc.dispatchEvent('change'); }
}

let consoleErrors;

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto('/index.html');
  await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
  await page.reload();
});

test.afterEach(async () => {
  expect(consoleErrors, '콘솔 에러 없음').toEqual([]);
});

// ---------------- A. PRD 10장 인수 조건 ----------------
test.describe('A. 인수 조건', () => {
  test('AC1: 18경기, 잠실 10회 + 원정 구장 8곳 각 1회', async ({ page }) => {
    await expect(page.locator('#game-rows tr')).toHaveCount(18);
    await expect(page.locator('#game-count')).toHaveText('18');
    await expect(page.locator('#game-rows tr[data-stadium="jamsil"]')).toHaveCount(10);
    await expect(page.locator('#game-rows .badge-home')).toHaveCount(9);
    await expect(page.locator('#game-rows .badge-away')).toHaveCount(9);
    for (const [key, e] of Object.entries(EXPECTED)) {
      await expect(page.locator(`#game-rows tr[data-stadium="${key}"]`)).toHaveCount(e.count);
    }
  });

  test('AC2: 기본값 합계 1,022,834 / 767,200, 추천 대중교통', async ({ page }) => {
    await expect(page.locator('#fuelPrice')).toHaveValue('1700');
    await expect(page.locator('#fuelEfficiency')).toHaveValue('12');
    await expect(page.locator('#people')).toHaveValue('1');
    await expect(page.locator('#total-car')).toHaveText('1,022,834원');
    await expect(page.locator('#total-transit')).toHaveText('767,200원');
    await expect(page.locator('#sum-car')).toHaveText('1,022,834원');
    await expect(page.locator('#sum-transit')).toHaveText('767,200원');
    await expect(page.locator('#recommend-mode')).toHaveText('대중교통');
    await expect(page.locator('#recommend-text')).toContainText('255,634원');
    await expect(page.locator('#total-fuel')).toHaveText('716,834원');
    await expect(page.locator('#total-toll')).toHaveText('222,000원');
    await expect(page.locator('#total-parking')).toHaveText('84,000원');
    await expect(page.locator('#total-diff')).toHaveText('+255,634원');
  });

  test('AC3: 인원 2 → 대중교통 1,534,400, 추천 승용차, 승용차 합계 불변', async ({ page }) => {
    await setSetting(page, 'people', '2');
    await expect(page.locator('#total-transit')).toHaveText('1,534,400원');
    await expect(page.locator('#total-car')).toHaveText('1,022,834원');
    await expect(page.locator('#recommend-mode')).toHaveText('승용차');
    await expect(page.locator('#card-recommend')).toHaveAttribute('data-mode', 'car');
    await expect(page.locator('#recommend-text')).toContainText('511,566원');
  });

  test('AC4: 손익분기 인원 2명', async ({ page }) => {
    await expect(page.locator('#break-even')).toHaveText('2명');
  });

  test('AC5: 유가 변경 시 유류비·승용차 합계만 변경', async ({ page }) => {
    const h1 = page.locator('#game-rows tr[data-id="H1"]');
    await setSetting(page, 'fuelPrice', '2000');
    await expect(h1.locator('.c-fuel')).toHaveText('35,000원');
    await expect(h1.locator('.c-toll')).toHaveText('9,400원');
    await expect(h1.locator('.c-parking')).toHaveText('6,000원');
    await expect(h1.locator('.c-car')).toHaveText('50,400원');
    await expect(h1.locator('.c-transit')).toHaveText('33,700원');
    await expect(page.locator('#total-transit')).toHaveText('767,200원');
    await expect(page.locator('#total-toll')).toHaveText('222,000원');
    await expect(page.locator('#total-parking')).toHaveText('84,000원');
    // 연간 유류비 = Σ round(거리×2/12×2000)
    await expect(page.locator('#total-car')).toHaveText('1,149,334원');
  });

  test('AC6: 기본값은 2026 실제 기록, 수정 → 새로고침 유지 → 되돌리기 시 실제 기록', async ({ page }) => {
    const h1 = page.locator('#game-rows tr[data-id="H1"]');
    for (const [id, rec] of Object.entries(RECORDS)) {
      const r = page.locator(`#game-rows tr[data-id="${id}"]`);
      await expect(r.locator('[data-field="date"]')).toHaveValue(rec[0]);
      await expect(r.locator('[data-field="score"]')).toHaveValue(rec[1]);
      await expect(r.locator('[data-field="result"]')).toHaveValue(rec[2]);
    }

    await setGame(page, 'H1', 'date', '2026-04-04');
    await setGame(page, 'H1', 'score', '0:1');
    await setGame(page, 'H1', 'result', '패');
    await page.reload();
    await expect(h1.locator('[data-field="date"]')).toHaveValue('2026-04-04');
    await expect(h1.locator('[data-field="score"]')).toHaveValue('0:1');
    await expect(h1.locator('[data-field="result"]')).toHaveValue('패');
    await expect(page.locator('#stat-win')).toHaveText('9');

    page.once('dialog', (d) => d.accept());
    await page.click('#reset-results');
    await expect(h1.locator('[data-field="date"]')).toHaveValue('2026-06-20');
    await expect(h1.locator('[data-field="score"]')).toHaveValue('4:2');
    await expect(h1.locator('[data-field="result"]')).toHaveValue('승');
    await expect(page.locator('#stat-win')).toHaveText('10');
    await page.reload();
    await expect(h1.locator('[data-field="result"]')).toHaveValue('승');
  });

  test('AC6-b: 되돌리기 확인창에서 취소하면 유지', async ({ page }) => {
    await setGame(page, 'H1', 'result', '패');
    page.once('dialog', (d) => d.dismiss());
    await page.click('#reset-results');
    await expect(page.locator('#game-rows tr[data-id="H1"] [data-field="result"]')).toHaveValue('패');
  });

  for (const id of ['fuelPrice', 'fuelEfficiency', 'people']) {
    test(`AC7: ${id} 잘못된 값(0, -1, 빈 값, abc) → 안내, NaN/Infinity 없음`, async ({ page }) => {
      for (const bad of ['0', '-1', '', 'abc']) {
        await setSetting(page, id, bad);
        await expect(page.locator(`#${id}-error`)).not.toBeEmpty();
        await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
        await expect(page.locator('#total-car')).toHaveText('1,022,834원');
        await expect(page.locator('#total-transit')).toHaveText('767,200원');
        expect(await page.locator('body').innerText()).not.toMatch(/NaN|Infinity|undefined/);
      }
      await setSetting(page, id, id === 'fuelPrice' ? '1700' : id === 'fuelEfficiency' ? '12' : '1');
      await expect(page.locator(`#${id}-error`)).toBeEmpty();
    });
  }

  test('AC8: 375px에서 페이지 가로 스크롤 없음', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(375);
  });

  test('AC8-b: 1280px에서 경기별 표 가로 스크롤 없음', async ({ page }) => {
    const r = await page.evaluate(() => {
      const w = document.querySelector('#games .table-wrap');
      return { sw: w.scrollWidth, cw: w.clientWidth, page: document.documentElement.scrollWidth };
    });
    expect(r.sw).toBeLessThanOrEqual(r.cw);
    expect(r.page).toBeLessThanOrEqual(1280);
  });
});

// ---------------- B. PRD 6.3 금액 전수 대조 ----------------
test.describe('B. 구장별 금액 대조', () => {
  test('경기별 표의 모든 행 금액이 PRD 6.3과 일치', async ({ page }) => {
    for (const [key, e] of Object.entries(EXPECTED)) {
      const rows = page.locator(`#game-rows tr[data-stadium="${key}"]`);
      const n = await rows.count();
      for (let i = 0; i < n; i++) {
        const r = rows.nth(i);
        await expect(r.locator('.c-fuel')).toHaveText(won(e.fuel));
        await expect(r.locator('.c-toll')).toHaveText(won(e.toll));
        await expect(r.locator('.c-parking')).toHaveText(won(e.parking));
        await expect(r.locator('.c-car')).toHaveText(won(e.car));
        await expect(r.locator('.c-transit')).toHaveText(won(e.transit));
        await expect(r.locator('.c-diff')).toHaveText(signed(e.car - e.transit));
      }
    }
  });

  test('구장별 집계 표와 차트가 PRD 6.3과 일치', async ({ page }) => {
    await expect(page.locator('#stadium-rows tr')).toHaveCount(9);
    for (const [key, e] of Object.entries(EXPECTED)) {
      const cells = page.locator(`#stadium-rows tr[data-stadium="${key}"] td`);
      await expect(cells.nth(1)).toHaveText(e.count + '회');
      await expect(cells.nth(2)).toHaveText(won(e.car * e.count));
      await expect(cells.nth(3)).toHaveText(won(e.transit * e.count));
      await expect(cells.nth(4)).toHaveText(signed((e.car - e.transit) * e.count));
      const chart = page.locator(`#stadium-chart .chart-row[data-stadium="${key}"]`);
      await expect(chart).toContainText('승용차 ' + won(e.car * e.count));
      await expect(chart).toContainText('대중교통 ' + won(e.transit * e.count));
    }
  });

  test('KTX 없는 인천은 시외버스, 나머지는 KTX', async ({ page }) => {
    await expect(page.locator('#game-rows tr[data-stadium="munhak"] .mode')).toHaveText('시외버스');
    const others = page.locator('#game-rows tr:not([data-stadium="munhak"]) .mode');
    await expect(others).toHaveCount(17);
    for (const t of await others.allInnerTexts()) expect(t).toBe('KTX');
  });
});

// ---------------- C. F1~F10 구현 여부 ----------------
test.describe('C. 기능 요구사항', () => {
  test('F1~F10 화면 요소 존재', async ({ page }) => {
    // F1 경기 목록 열
    const heads = await page.locator('#game-table thead th').allInnerTexts();
    for (const h of ['날짜', '구분', '상대', '구장', '스코어', '결과']) expect(heads).toContain(h);
    // F2 입력 + 초기화
    await expect(page.locator('#game-rows input[type="date"]')).toHaveCount(18);
    await expect(page.locator('#game-rows [data-field="score"]')).toHaveCount(18);
    await expect(page.locator('#game-rows select[data-field="result"]')).toHaveCount(18);
    await expect(page.locator('#reset-results')).toBeVisible();
    // F3
    await expect(page.locator('#stat-rate')).toBeVisible();
    // F4, F5, F6
    for (const h of ['유류비', '톨비', '주차비', '승용차 왕복', '대중교통 경로', '대중교통 왕복', '차액']) expect(heads).toContain(h);
    await expect(page.locator('#stadium-table')).toBeVisible();
    // F7
    await expect(page.locator('#recommend-mode')).toBeVisible();
    await expect(page.locator('#break-even')).toBeVisible();
    // F8
    for (const id of ['fuelPrice', 'fuelEfficiency', 'people']) {
      await expect(page.locator(`label[for="${id}"]`)).toBeVisible();
    }
    // F9
    await expect(page.locator('#stadium-chart .chart-row')).toHaveCount(9);
    // F10
    expect(await page.locator('#qualitative li').count()).toBeGreaterThanOrEqual(3);
    await expect(page.locator('#qualitative')).toContainText('막차');
    // 추정치 안내
    await expect(page.locator('#estimate-notice')).toContainText('추정치');
  });

  test('실제 기록: 17경기 토요일, 수원(A4)은 공휴일(6/3 지방선거일) 대체', async ({ page }) => {
    const days = await page.locator('#game-rows .day').allInnerTexts();
    expect(days.filter((d) => d === '(토)')).toHaveLength(17);
    await expect(page.locator('#game-rows .warn')).toHaveCount(0);
    const a4 = page.locator('#game-rows tr[data-id="A4"]');
    await expect(a4.locator('.day')).toHaveText('(수)');
    await expect(a4.locator('.holiday')).toHaveText('공휴일');
    await expect(a4.locator('.holiday')).toHaveAttribute('title', /전국동시지방선거일.*수원 주말 경기 없음/);
    // 토요일이면서 공휴일: 6/6 NC 원정(현충일), 9/26 KIA 원정(추석 연휴)
    await expect(page.locator('#game-rows tr[data-id="A9"] .holiday')).toHaveAttribute('title', '현충일');
    await expect(page.locator('#game-rows tr[data-id="A7"] .holiday')).toHaveAttribute('title', '추석 연휴');
    await expect(page.locator('#game-rows .holiday')).toHaveCount(3);
  });

  test('주말·공휴일이 아닌 날짜만 경고, 공휴일은 공휴일 표시', async ({ page }) => {
    await setGame(page, 'H1', 'date', '2026-04-04'); // 토
    await setGame(page, 'H2', 'date', '2026-04-05'); // 일
    await setGame(page, 'H3', 'date', '2026-04-08'); // 수
    await setGame(page, 'H4', 'date', '2026-05-05'); // 화, 어린이날
    await expect(page.locator('#game-rows tr[data-id="H1"] .day')).toHaveText('(토)');
    await expect(page.locator('#game-rows tr[data-id="H1"] .warn')).toHaveCount(0);
    await expect(page.locator('#game-rows tr[data-id="H2"] .day')).toHaveText('(일)');
    await expect(page.locator('#game-rows tr[data-id="H3"] .warn')).toHaveText('주말·공휴일 아님');
    await expect(page.locator('#game-rows tr[data-id="H4"] .warn')).toHaveCount(0);
    await expect(page.locator('#game-rows tr[data-id="H4"] .holiday')).toHaveAttribute('title', '어린이날');
  });

  test('주차 기준: 구장별 5시간 요금과 출처 상태 표시', async ({ page }) => {
    for (const [key, e] of Object.entries(EXPECTED)) {
      const cell = page.locator(`#stadium-rows tr[data-stadium="${key}"] .cell-parking`);
      await expect(cell.locator('strong')).toHaveText(won(e.parking) + ' ');
      await expect(cell.locator('.status')).toHaveText(PARKING_STATUS[key]);
    }
  });
});

// ---------------- D. 승률 ----------------
test.describe('D. 직관 성적', () => {
  test('2026 실제 기록: 10승 8패 0무, 승률 0.556', async ({ page }) => {
    await expect(page.locator('#stat-win')).toHaveText('10');
    await expect(page.locator('#stat-loss')).toHaveText('8');
    await expect(page.locator('#stat-draw')).toHaveText('0');
    await expect(page.locator('#stat-none')).toHaveText('0');
    await expect(page.locator('#stat-rate')).toHaveText('0.556');
  });

  test('승률은 무승부 제외: 1경기를 무로 바꾸면 9승 8패 1무 → 0.529', async ({ page }) => {
    await setGame(page, 'H1', 'result', '무');
    await expect(page.locator('#stat-win')).toHaveText('9');
    await expect(page.locator('#stat-draw')).toHaveText('1');
    await expect(page.locator('#stat-rate')).toHaveText('0.529');
  });

  test('승·패가 없으면 승률 -', async ({ page }) => {
    for (const id of Object.keys(RECORDS)) await setGame(page, id, 'result', id === 'H1' ? '무' : '미입력');
    await expect(page.locator('#stat-none')).toHaveText('17');
    await expect(page.locator('#stat-rate')).toHaveText('-');
  });

  test('결과 입력은 비용 합계에 영향 없음', async ({ page }) => {
    await setGame(page, 'H1', 'result', '패');
    await expect(page.locator('#total-car')).toHaveText('1,022,834원');
  });
});

// ---------------- E. 스크린샷 ----------------
test.describe('E. 스크린샷', () => {
  test('1280 / 375 / 다크모드', async ({ page }) => {
    await setGame(page, 'H1', 'date', '2026-04-04');
    await setGame(page, 'H1', 'score', '5:3');
    await setGame(page, 'H1', 'result', '승');
    await setGame(page, 'H2', 'result', '패');
    await page.screenshot({ path: path.join(SHOT_DIR, 'desktop-1280.png'), fullPage: true });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: path.join(SHOT_DIR, 'desktop-1280-dark.png'), fullPage: true });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(SHOT_DIR, 'mobile-375.png'), fullPage: true });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: path.join(SHOT_DIR, 'mobile-375-dark.png'), fullPage: true });
  });
});

// ---------------- F. 엣지 케이스 ----------------
test.describe('F. 엣지 케이스', () => {
  test('인원 6 → 대중교통 4,603,200, 손익분기 2명 유지', async ({ page }) => {
    await setSetting(page, 'people', '6');
    await expect(page.locator('#total-transit')).toHaveText('4,603,200원');
    await expect(page.locator('#recommend-mode')).toHaveText('승용차');
    await expect(page.locator('#break-even')).toHaveText('2명');
  });

  test('인원 7, 1.5 → 거부', async ({ page }) => {
    for (const v of ['7', '1.5']) {
      await setSetting(page, 'people', v);
      await expect(page.locator('#people-error')).not.toBeEmpty();
      await expect(page.locator('#total-transit')).toHaveText('767,200원');
    }
  });

  test('연비 100 → 유류비 감소, 추천 갱신', async ({ page }) => {
    await setSetting(page, 'fuelEfficiency', '100');
    // 잠실: round(210/100*1700) = 3570
    await expect(page.locator('#game-rows tr[data-id="H1"] .c-fuel')).toHaveText('3,570원');
    const car = await page.locator('#total-car').innerText();
    const transit = await page.locator('#total-transit').innerText();
    const n = (s) => Number(s.replace(/[^\d]/g, ''));
    expect(await page.locator('#recommend-mode').innerText()).toBe(n(car) < n(transit) ? '승용차' : '대중교통');
  });

  test('손익분기 1명: 승용차가 1인 대중교통보다 싼 경우', async ({ page }) => {
    await setSetting(page, 'fuelEfficiency', '100');
    // 연비 100이면 승용차 합 < 대중교통 1인 합 → 손익분기 1명
    await expect(page.locator('#recommend-mode')).toHaveText('승용차');
    await expect(page.locator('#break-even')).toHaveText('1명');
    expect(await page.locator('#conclusion-text').innerText()).not.toMatch(/NaN|undefined/);
  });

  test('잘못된 값 입력 후 포커스를 벗어나면 적용값으로 되돌리고 안내도 지움', async ({ page }) => {
    const input = page.locator('#fuelPrice');
    await setSetting(page, 'fuelPrice', '0');
    await expect(page.locator('#fuelPrice-error')).not.toBeEmpty();
    await input.dispatchEvent('change');
    await expect(input).toHaveValue('1700');
    await expect(page.locator('#fuelPrice-error')).toBeEmpty();
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('localStorage 접근 불가여도 동작', async ({ page }) => {
    await page.addInitScript(() => {
      const fail = () => { throw new Error('storage disabled'); };
      Object.defineProperty(window, 'localStorage', { get: fail, configurable: true });
    });
    await page.reload();
    await expect(page.locator('#total-car')).toHaveText('1,022,834원');
    await expect(page.locator('#stat-win')).toHaveText('10');
    await setGame(page, 'H1', 'result', '패');
    await expect(page.locator('#stat-win')).toHaveText('9');
    page.once('dialog', (d) => d.accept());
    await page.click('#reset-results');
    await expect(page.locator('#stat-win')).toHaveText('10');
  });

  test('손상된 저장값(JSON 오류, 잘못된 결과·날짜)은 실제 기록으로 대체', async ({ page }) => {
    await page.evaluate((k) => localStorage.setItem(k, '{broken'), STORAGE_KEY);
    await page.reload();
    await expect(page.locator('#stat-win')).toHaveText('10');

    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({
      H1: { date: '2026-13-45', score: 7, result: '이김' },
      H2: null,
      H3: { date: '2026-04-05', score: '1:0', result: '패' },
    })), STORAGE_KEY);
    await page.reload();
    const h1 = page.locator('#game-rows tr[data-id="H1"]');
    await expect(h1.locator('[data-field="date"]')).toHaveValue('2026-06-20');
    await expect(h1.locator('[data-field="score"]')).toHaveValue('4:2');
    await expect(h1.locator('[data-field="result"]')).toHaveValue('승');
    await expect(h1.locator('.day')).toHaveText('(토)');
    const h3 = page.locator('#game-rows tr[data-id="H3"]');
    await expect(h3.locator('[data-field="date"]')).toHaveValue('2026-04-05');
    await expect(h3.locator('[data-field="result"]')).toHaveValue('패');
    await expect(page.locator('#stat-win')).toHaveText('9');
  });

  test('결론 문구: 인원 기준 명확, 조사 어색함 없음', async ({ page }) => {
    const text = page.locator('#conclusion-text');
    await expect(text).toContainText('대중교통을 추천합니다');
    await expect(text).toContainText('본인 포함');
    await expect(text).toContainText('2명 이상이면 승용차가');
    await setSetting(page, 'people', '2');
    await expect(text).toContainText('승용차를 추천합니다');
    expect(await text.innerText()).not.toMatch(/\(를\)|\(을\)|초과이어도/);
  });

  test('스코어에 HTML을 넣어도 실행되지 않음', async ({ page }) => {
    await setGame(page, 'H1', 'score', '<img src=x onerror=alert(1)>');
    await page.reload();
    await expect(page.locator('#game-rows img')).toHaveCount(0);
  });
});
