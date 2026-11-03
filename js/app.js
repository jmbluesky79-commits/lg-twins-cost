// 렌더링·이벤트·localStorage. 계산은 모두 CALC에 위임한다.
(function () {
  'use strict';

  const D = window.APP_DATA;
  const C = window.CALC;
  const STORAGE_KEY = 'lgTwinsCost.results.v1';
  const RESULTS = ['미입력', '승', '패', '무'];
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  const settings = Object.assign({}, D.DEFAULT_SETTINGS);
  let games = loadGames();

  // ---------- 저장소 ----------
  function loadGames() {
    const base = D.GAMES.map(function (g) { return Object.assign({}, g); });
    let saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      saved = null;
    }
    if (!saved || typeof saved !== 'object') return base;
    return base.map(function (g) {
      const s = saved[g.id];
      if (!s) return g;
      // 항목별로 검증하고, 잘못된 값은 data.js의 2026 실제 기록을 유지한다
      return Object.assign(g, {
        date: s.date === '' || dayOf(s.date) != null ? s.date : g.date,
        score: typeof s.score === 'string' ? s.score : g.score,
        result: RESULTS.indexOf(s.result) >= 0 ? s.result : g.result,
      });
    });
  }

  function saveGames() {
    const out = {};
    games.forEach(function (g) { out[g.id] = { date: g.date, score: g.score, result: g.result }; });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch (e) {
      // 저장 불가 환경(시크릿 모드 등): 현재 화면에서만 유지
    }
  }

  function resetGames() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 무시 */ }
    games = D.GAMES.map(function (g) { return Object.assign({}, g); });
  }

  function baseGame(id) {
    return D.GAMES.find(function (g) { return g.id === id; });
  }

  // ---------- 유틸 ----------
  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function numCell(value, cls) {
    return el('td', { class: 'num' + (cls ? ' ' + cls : '') }, C.formatWon(value));
  }

  function signedWon(n) {
    return (n > 0 ? '+' : '') + C.formatWon(n);
  }

  function diffClass(n) {
    return n > 0 ? 'diff-plus' : n < 0 ? 'diff-minus' : 'diff-zero';
  }

  // 'YYYY-MM-DD' → 요일 (로컬 기준). 존재하지 않는 날짜(2026-13-45 등)면 null
  function dayOf(dateStr) {
    if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const p = dateStr.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    if (d.getFullYear() !== p[0] || d.getMonth() !== p[1] - 1 || d.getDate() !== p[2]) return null;
    return d.getDay();
  }

  // ---------- 렌더 ----------
  function renderGameRows() {
    const rows = C.gameCosts(games, D.STADIUMS, settings);
    const tbody = document.getElementById('game-rows');
    tbody.innerHTML = '';

    rows.forEach(function (r) {
      const g = r.game;
      const st = D.STADIUMS[g.stadium];
      const tr = el('tr', { 'data-id': g.id, 'data-stadium': g.stadium });

      // 날짜 + 요일
      const dateTd = el('td', { class: 'cell-date' });
      const dateInput = el('input', { type: 'date', 'data-field': 'date', 'aria-label': g.id + ' 날짜' });
      dateInput.value = g.date;
      const day = dayOf(g.date);
      const dayLabel = el('span', { class: 'day' }, day == null ? '' : '(' + DAY_NAMES[day] + ')');
      dateTd.appendChild(dateInput);
      dateTd.appendChild(dayLabel);
      const holiday = D.HOLIDAYS[g.date];
      if (holiday) {
        const tag = el('span', { class: 'holiday', title: holiday }, '공휴일');
        if (g.note && g.date === baseGame(g.id).date) tag.title = holiday + ' · ' + g.note;
        dateTd.appendChild(tag);
      } else if (day != null && day !== 0 && day !== 6) {
        dateTd.appendChild(el('span', { class: 'warn' }, '주말·공휴일 아님'));
      }
      if (g.start) dateTd.title = g.start + ' 경기' + (g.note ? ' · ' + g.note : '');
      tr.appendChild(dateTd);

      const typeTd = el('td', { class: 'cell-type' });
      typeTd.appendChild(el('span', { class: 'badge ' + (g.type === '홈' ? 'badge-home' : 'badge-away') }, g.type));
      tr.appendChild(typeTd);
      tr.appendChild(el('td', null, g.opponent));
      tr.appendChild(el('td', null, st.name));

      const scoreTd = el('td');
      const scoreInput = el('input', { type: 'text', 'data-field': 'score', placeholder: '예: 5:3', maxlength: '9', 'aria-label': g.id + ' 스코어' });
      scoreInput.value = g.score;
      scoreTd.appendChild(scoreInput);
      tr.appendChild(scoreTd);

      const resultTd = el('td');
      const select = el('select', { 'data-field': 'result', 'data-result': g.result, 'aria-label': g.id + ' 결과' });
      RESULTS.forEach(function (v) {
        const opt = el('option', { value: v }, v);
        if (v === g.result) opt.selected = true;
        select.appendChild(opt);
      });
      resultTd.appendChild(select);
      tr.appendChild(resultTd);

      tr.appendChild(numCell(r.car.fuel, 'c-fuel'));
      tr.appendChild(numCell(r.car.toll, 'c-toll'));
      tr.appendChild(numCell(r.car.parking, 'c-parking'));
      tr.appendChild(numCell(r.car.total, 'c-car'));
      const routeTd = el('td', { class: 'cell-route' });
      routeTd.appendChild(el('span', { class: 'mode', 'data-mode': st.transit.mode }, st.transit.mode));
      routeTd.appendChild(document.createTextNode(st.transit.route));
      tr.appendChild(routeTd);
      tr.appendChild(numCell(r.transit.total, 'c-transit'));
      const diffTd = el('td', { class: 'num c-diff ' + diffClass(r.diff) }, signedWon(r.diff));
      tr.appendChild(diffTd);

      tbody.appendChild(tr);
    });

    document.getElementById('game-count').textContent = rows.length;
  }

  function renderTotals() {
    const t = C.annualTotals(games, D.STADIUMS, settings);
    const diff = t.car - t.transit;
    setText('total-fuel', C.formatWon(t.fuel));
    setText('total-toll', C.formatWon(t.toll));
    setText('total-parking', C.formatWon(t.parking));
    setText('total-car', C.formatWon(t.car));
    setText('total-transit', C.formatWon(t.transit));
    const diffEl = document.getElementById('total-diff');
    diffEl.textContent = signedWon(diff);
    diffEl.className = 'num ' + diffClass(diff);

    setText('sum-car', C.formatWon(t.car));
    setText('sum-transit', C.formatWon(t.transit));

    // F7 추천
    const rec = C.recommend(t);
    setText('recommend-mode', rec.label);
    document.getElementById('card-recommend').setAttribute('data-mode', rec.mode);
    const recText = rec.mode === 'same'
      ? '두 수단의 연간 비용이 같습니다.'
      : rec.label + ' 추천 (연간 ' + C.formatWon(rec.saving) + ' 절약)';
    setText('recommend-text', recText);

    const be = C.breakEvenPeople(games, D.STADIUMS, settings, C.SETTING_RULES.people.max);
    const beText = be == null ? C.SETTING_RULES.people.max + '명 초과' : be + '명';
    setText('break-even', beText);

    const conclusion = rec.mode === 'same'
      ? settings.people + '명 기준 승용차와 대중교통의 연간 왕복 비용이 같습니다.'
      : settings.people + '명 기준 18경기 왕복 비용은 승용차 ' + C.formatWon(t.car) + ', 대중교통 ' + C.formatWon(t.transit) +
        '으로 2027년에는 ' + rec.label + (rec.mode === 'car' ? '를' : '을') + ' 추천합니다. (연간 ' + C.formatWon(rec.saving) + ' 절약)';
    const beSentence = be == null
      ? '함께 가는 인원(본인 포함)이 ' + C.SETTING_RULES.people.max + '명이어도 대중교통이 더 저렴합니다.'
      : '함께 가는 인원(본인 포함)이 ' + be + '명 이상이면 승용차가 같거나 더 저렴합니다.';
    setText('conclusion-text', conclusion + ' ' + beSentence);
  }

  function renderStadiums() {
    const tbody = document.getElementById('stadium-rows');
    tbody.innerHTML = '';
    C.stadiumSummary(games, D.STADIUMS, settings).forEach(function (s) {
      const tr = el('tr', { 'data-stadium': s.stadium });
      tr.appendChild(el('td', null, s.name));
      tr.appendChild(el('td', { class: 'num' }, s.count + '회'));
      tr.appendChild(numCell(s.car));
      tr.appendChild(numCell(s.transit));
      tr.appendChild(el('td', { class: 'num ' + diffClass(s.diff) }, signedWon(s.diff)));

      // 주차 기준 (공영주차장, 체류 시간 가정)
      const p = D.STADIUMS[s.stadium].car.parking;
      const fee = C.parkingFee(p.rule, settings.parkingMinutes);
      const pTd = el('td', { class: 'cell-parking' });
      pTd.appendChild(el('strong', null, C.formatWon(fee) + ' '));
      pTd.appendChild(el('span', { class: 'status status-' + p.status }, p.status));
      pTd.appendChild(el('div', { class: 'parking-lot' }, p.lot));
      pTd.appendChild(el('div', { class: 'parking-desc' }, p.desc));
      tr.appendChild(pTd);
      tbody.appendChild(tr);
    });
  }

  // F9 구장별 가로 막대 차트 (외부 라이브러리 없음)
  function renderChart() {
    const chart = document.getElementById('stadium-chart');
    chart.innerHTML = '';
    const list = C.stadiumSummary(games, D.STADIUMS, settings);
    const max = list.reduce(function (m, s) { return Math.max(m, s.car, s.transit); }, 0) || 1;
    const labelSpace = '6.5rem'; // 금액 라벨 자리

    list.forEach(function (s) {
      const row = el('div', { class: 'chart-row', 'data-stadium': s.stadium });
      const name = el('div', { class: 'chart-name', title: s.name }, s.name + ' ');
      name.appendChild(el('small', null, s.count + '회'));
      row.appendChild(name);

      const bars = el('div', { class: 'chart-bars' });
      [['car', '승용차', s.car], ['transit', '대중교통', s.transit]].forEach(function (b) {
        const line = el('div', { class: 'bar-line' });
        const bar = el('div', { class: 'bar bar-' + b[0], 'aria-hidden': 'true' });
        bar.style.width = 'calc((100% - ' + labelSpace + ') * ' + (b[2] / max).toFixed(4) + ')';
        line.appendChild(bar);
        line.appendChild(el('span', { class: 'bar-label' }, b[1] + ' ' + C.formatWon(b[2])));
        bars.appendChild(line);
      });
      row.appendChild(bars);
      chart.appendChild(row);
    });
  }

  function renderStats() {
    const s = C.winStats(games);
    setText('stat-win', s.win);
    setText('stat-loss', s.loss);
    setText('stat-draw', s.draw);
    setText('stat-none', s.none);
    setText('stat-rate', s.winRate == null ? '-' : s.winRate.toFixed(3));
  }

  function setText(id, text) {
    document.getElementById(id).textContent = text;
  }

  function renderCosts() {
    renderGameRows();
    renderTotals();
    renderStadiums();
    renderChart();
  }

  function renderAll() {
    renderCosts();
    renderStats();
  }

  // ---------- 이벤트 ----------
  function bindSettings() {
    Object.keys(C.SETTING_RULES).forEach(function (key) {
      const input = document.getElementById(key);
      const error = document.getElementById(key + '-error');
      input.value = settings[key];
      input.addEventListener('input', function () {
        const v = C.validateSetting(key, input.value);
        if (!v.ok) {
          error.textContent = v.message + ' (현재 적용값: ' + settings[key] + ')';
          input.setAttribute('aria-invalid', 'true');
          return;
        }
        error.textContent = '';
        input.removeAttribute('aria-invalid');
        settings[key] = v.value;
        renderCosts();
      });
      // 포커스를 벗어날 때 잘못된 값이면 적용값으로 되돌린다
      input.addEventListener('change', function () {
        if (!C.validateSetting(key, input.value).ok) {
          input.value = settings[key];
          error.textContent = '';
          input.removeAttribute('aria-invalid');
        }
      });
    });
  }

  function bindGameTable() {
    const tbody = document.getElementById('game-rows');
    tbody.addEventListener('change', function (e) {
      const field = e.target.getAttribute('data-field');
      if (!field) return;
      const id = e.target.closest('tr').getAttribute('data-id');
      const game = games.find(function (g) { return g.id === id; });
      if (!game) return;
      game[field] = field === 'score' ? e.target.value.trim() : e.target.value;
      if (field === 'result') e.target.setAttribute('data-result', game.result);
      saveGames();
      if (field === 'date') renderGameRows(); // 요일·주말 경고 갱신
      renderStats();
    });

    document.getElementById('reset-results').addEventListener('click', function () {
      if (!window.confirm('수정한 날짜·스코어·결과를 지우고 2026 실제 기록으로 되돌릴까요?')) return;
      resetGames();
      renderAll();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindSettings();
    bindGameTable();
    renderAll();
  });
})();
