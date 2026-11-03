# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

LG 트윈스 직관 이동비용 비교 정적 웹앱. 2026년 승용차 왕복 비용(유류비·톨비·공영주차장비)과 2027년 KTX/대중교통 왕복 비용을 비교해 이동수단을 추천한다. 요구사항의 기준은 `prd.md`, 단계별 작업 지시는 `prompts.md`(1~4단계)에 있다. 기능을 바꿀 때는 PRD 5장(계산 규칙)과 10장(인수 조건)을 먼저 확인한다.

## 실행 / 검증

앱 자체는 빌드·린트·런타임 의존성이 없는 순수 HTML/CSS/JS다. `package.json`은 테스트 도구(`@playwright/test`)용이다.

```bash
python -m http.server 8080          # http://localhost:8080 에서 확인 (npm run serve)
npm install                         # 처음 한 번
npx playwright test                 # 전체 테스트 (npm test)
npx playwright test -g "AC2"        # 이름으로 테스트 하나만 실행
```

- `playwright.config.js`는 설치된 Chrome(`channel: 'chrome'`)을 쓴다. 그래서 `npx playwright install`이 필요 없다. 8080 포트 서버가 없으면 테스트가 자동으로 띄우고, 이미 떠 있으면 그 서버를 쓴다.
- `tests/app.spec.js`의 `afterEach`는 콘솔 에러가 1건이라도 있으면 테스트를 실패시킨다.
- 설정 입력은 `type=number`라서 `fill('abc')`가 거부된다. 그래서 테스트는 `setSetting` 헬퍼로 값을 직접 넣고 `input` 이벤트를 발생시킨다. 경기 입력은 `setGame` 헬퍼로 넣고 `change` 이벤트를 발생시킨다.
- 스크린샷 테스트는 `tests/screenshots/`를 덮어쓴다. `test-results/`는 실행할 때마다 생기는 산출물이다.
- 검토 결과와 버그 수정 이력은 `review.md`에 있다. 기능을 바꾸면 테스트를 다시 실행하고 이 파일도 갱신한다.

계산 로직은 Node에서 바로 검증할 수 있다 (`data.js`, `calc.js`는 Node에서 `module.exports`로 동작):

```bash
node -e "const D=require('./js/data.js'),C=require('./js/calc.js');console.log(C.annualTotals(D.GAMES,D.STADIUMS,D.DEFAULT_SETTINGS))"
```

기본 설정(유가 1700, 연비 12, 인원 1, 주차 300분)의 기대값: 승용차 1,022,834원(주차 합계 84,000원) / 대중교통 767,200원. 인원 2명이면 대중교통 1,534,400원이다. 2026 실제 기록은 10승 8패, 승률 0.556이다.

**`js/data.js`의 기준값을 실제 값으로 바꿀 때는 세 곳을 함께 고친다:** `js/data.js`, `prd.md` 6.1~6.3 표와 10장 금액, `tests/app.spec.js`의 `EXPECTED` 표와 AC2·AC3·AC5·F 엣지 케이스에 하드코딩된 합계. 위 Node 명령으로 새 합계를 구해 반영한다.

Playwright MCP 실행 후 생기는 `.playwright-mcp/` 로그 폴더는 산출물이 아니다.

## 구조

스크립트는 ES module이 아니라 `index.html`에서 순서대로 로드한다: `data.js` → `calc.js` → `app.js`. 각 파일은 UMD 형태의 IIFE로 작성한다. 브라우저에서는 `window.APP_DATA`와 `window.CALC`로, Node에서는 `module.exports`로 내보낸다. 이 형태를 유지해야 `file://`로 열어도, Node 검증에서도 동작한다.

- `js/data.js`: 모든 기준값(구장별 편도거리·편도 톨비·주차 요금 규칙, 1인 편도 대중교통 요금)과 18경기 목록. 거리·톨비·KTX 요금은 **추정치**이고, 사용자가 실제 값으로 교체하는 지점이다.
  - 경기 목록은 `TEAMS`와 `HOME_RECORDS`·`AWAY_RECORDS`(같은 순서)로 생성한다. 홈 9경기는 모두 `jamsil`이고 원정은 `awayStadium`이다. 두산 원정도 잠실이라 잠실은 총 10회다.
  - 기록은 **2026 KBO 실제 결과**다. 각 구장의 시즌 첫 토·일 경기를 골랐고, 토·일 경기가 없으면 첫 공휴일 경기를 골랐다. 예외로 A4(KT 원정, 수원)는 2026년 수원 주말 경기가 없어서 6/3(수, 지방선거일) 경기로 대체했고, `note`에 그 이유를 적어 두었다.
  - `HOLIDAYS`는 2026 법정 공휴일(대체공휴일 포함)이다. 날짜 칸에서 공휴일이면 `.holiday`("공휴일", title에 공휴일 이름) 표시를, 토·일도 공휴일도 아니면 `.warn`("주말·공휴일 아님") 경고를 띄운다. 연도가 바뀌면 이 목록도 갱신해야 한다. 화면에서 수정한 값은 `localStorage`에 저장되지만, 이 파일의 값이 초기값이자 되돌리기 기준이다.
  - 주차는 `car.parking = { lot, status, rule, desc }` 형태다. `rule.type`은 경기일 정액인 `flat`과 시간 요금인 `time`(baseMin/baseFee/unitMin/unitFee/dailyMax) 두 가지다. 주차 시간은 `PARKING_STAY`(1시간 전 도착 + 경기 180분 + 1시간 후 출발)에서 계산해 `DEFAULT_SETTINGS.parkingMinutes`(300분)에 넣는다. 화면에서 바꾸는 설정은 아니다. `status`(공식/비공식/추정)는 구장별 표에 배지로 표시된다.
- `js/calc.js`: DOM을 쓰지 않는 순수 함수만 둔다. 입력은 데이터와 settings다.
  - 승용차는 차 1대 기준이라 인원수와 무관하다.
  - 대중교통은 `1인 편도 × 2 × 인원수`다.
  - 유류비만 `Math.round`로 반올림한다.
  - 주차비는 `parkingFee(rule, minutes)`로 계산한다.
  - 추천(`recommend`), 손익분기 인원(`breakEvenPeople`, 1~6명), 승률(`winStats`, 무승부 제외), 설정값 검증(`validateSetting` + `SETTING_RULES`)도 여기에 둔다. 범위·라벨을 바꿀 때는 `SETTING_RULES`만 수정한다.
- `js/app.js`: 렌더링과 이벤트만 담당하고 계산은 `CALC`에 위임한다.
  - 사용자가 입력한 경기 결과(날짜·스코어·결과)는 `localStorage`의 `lgTwinsCost.results.v1`에 `{경기id: {...}}` 형태로 저장한다. 경기 id(`H1~H9` 홈, `A1~A9` 원정)를 바꾸면 기존 저장값과 연결이 끊긴다. 저장소 접근은 모두 try/catch로 감싼다. 불러온 값은 항목마다 검증한다. 결과는 `RESULTS` 목록에 있는 값만, 날짜는 `dayOf`가 실제 날짜로 확인한 값만 받고, 잘못된 값은 해당 항목만 data.js의 실제 기록으로 대체한다. 날짜를 빈 값으로 지운 경우(`""`)는 그대로 유지한다.
  - `dayOf`는 연·월·일을 다시 비교해서 `2026-13-45`처럼 JS `Date`가 다음 해로 넘겨 해석하는 날짜를 걸러낸다. 이 검증을 지우지 않는다.
  - 설정(유가·연비·인원)은 저장하지 않는다. 잘못된 값이 들어오면 `input` 이벤트에서는 직전 값으로 계산을 유지하고 `#<key>-error`에 안내를 표시한다. `change` 이벤트(포커스 이탈)에서는 입력칸을 직전 값으로 되돌리고, 안내 문구와 `aria-invalid`도 함께 지운다.
  - 사용자 입력은 `textContent`/`value`로만 출력한다. `innerHTML`에 문자열을 넣지 않는다 (`innerHTML = ''`로 비우는 것만 허용).
  - 다시 그리는 범위를 둘로 나눈다. 설정이 바뀌면 `renderCosts`(비용 표·합계·추천), 결과만 바뀌면 `renderStats`만 호출한다. 날짜를 바꿀 때는 요일 표시 때문에 경기 표도 다시 그린다.
  - 테스트는 DOM id와 `data-*` 속성으로 값을 찾는다 (`#total-car`, `#total-transit`, `#recommend-mode`, `#break-even`, `tr[data-id]`, `tr[data-stadium]`, `.c-fuel` 등). 3단계 디자인 작업에서도 이 이름들은 유지한다.

## 스타일 (`css/style.css`)

- 색은 모두 `:root` 토큰으로 쓴다. 승용차는 `--car`(버건디), 대중교통은 `--transit`(파랑)이고, 카드·표 머리글·차트에서 같은 색을 쓴다.
- 다크모드 토큰은 두 곳에 똑같이 정의돼 있다: `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`와 `:root[data-theme="dark"]`. 하나를 바꾸면 다른 하나도 함께 바꾼다. 추천 카드(`.card-recommend[data-mode]`)의 다크 배경도 같은 방식으로 두 번 정의돼 있다.
- 경기별 표는 1280px 화면에서 13개 열이 가로 스크롤 없이 들어가도록 폭을 맞춰 두었다. 관련 값은 셀 패딩 6px, 글자 .82rem, 경로 열 140~180px, 날짜·스코어 입력칸 폭이다. 열을 추가하거나 이 값들을 키우면 `#games .table-wrap`의 `scrollWidth`가 `clientWidth`를 넘지 않는지 다시 확인한다.
- 구장별 막대 차트(F9)는 `app.js`의 `renderChart`가 div로 그린다. 막대 폭은 `calc((100% - 6.5rem) * 비율)`이고, 6.5rem은 금액 라벨 자리다.

## 규칙

- 모든 비용은 왕복 기준이다. 편도 값은 `data.js`에만 둔다.
- 금액 표시는 `CALC.formatWon` (`toLocaleString('ko-KR')` + '원')을 쓴다.
- KTX가 없는 구장(인천 문학)은 `transit.mode`를 KTX가 아닌 수단으로 표기한다.
- 앱에는 외부 라이브러리·CDN을 쓰지 않는다. 차트도 직접 그린다. (테스트용 `@playwright/test`는 예외)
- 화면 문구에 `을(를)` 같은 병기 조사를 쓰지 않는다. 받침 유무에 따라 조사를 골라 쓴다 (예: 대중교통을 / 승용차를). 인원수 문구에는 "본인 포함"을 밝힌다.
