// 기준 데이터 (PRD 4·6장)
// - 경기 기록: 2026 KBO 정규시즌 실제 결과 (KBO 공식 기록·네이버 스포츠 교차 확인)
// - 거리·톨비·KTX 요금: 추정치 → 실제 값으로 교체 가능
// - 주차비: 공영주차장 요금 구조로 계산 (경기 1시간 전 도착 ~ 종료 1시간 후 출발)
(function (root) {
  'use strict';

  // 주차 체류 시간 가정 (PRD 5.1): 1시간 전 도착 + 경기 3시간 + 종료 1시간 후 출발
  const PARKING_STAY = { beforeMin: 60, gameMin: 180, afterMin: 60 };

  // 기본 설정 (PRD 5장)
  const DEFAULT_SETTINGS = {
    fuelPrice: 1700, // 원/L (가솔린)
    fuelEfficiency: 12, // km/L
    people: 1, // 인원수
    parkingMinutes: PARKING_STAY.beforeMin + PARKING_STAY.gameMin + PARKING_STAY.afterMin, // 300분
  };

  // 주차 요금 규칙
  //   flat: 경기일 정액/선불 (체류 시간 무관)
  //   time: 기본 baseMin분 baseFee원 + 이후 unitMin분당 unitFee원, 1일 최대 dailyMax원
  // status: '공식'(기관 페이지 확인) | '비공식'(복수 비공식 출처 일치) | '추정'(출처 엇갈림)
  const STADIUMS = {
    jamsil: {
      name: '잠실야구장', region: '서울 송파',
      car: {
        distanceKm: 105, toll: 4700,
        parking: {
          lot: '잠실종합운동장 부설주차장', status: '공식',
          rule: { type: 'flat', fee: 6000 },
          desc: '경기일 선불 6,000원 (경기 2시간 30분 전~시작 후 30분 징수)',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→서울 KTX → 지하철 2호선', access: 1500, main: 13800, local: 1550 },
    },
    munhak: {
      name: '인천SSG랜더스필드', region: '인천',
      car: {
        distanceKm: 110, toll: 5000,
        parking: {
          lot: '문학경기장 주차장', status: '공식',
          rule: { type: 'flat', fee: 2000 },
          desc: '대규모 행사일 전일 주차권 선불 2,000원',
        },
      },
      transit: { mode: '시외버스', route: '아산터미널→인천 시외버스 → 인천지하철 (KTX 없음)', access: 1500, main: 9000, local: 1550 },
    },
    gocheok: {
      name: '고척스카이돔', region: '서울 구로',
      car: {
        distanceKm: 100, toll: 4500,
        parking: {
          lot: '중앙유통단지 주차장 (돔 주차장은 경기일 일반 주차 불가)', status: '공식',
          rule: { type: 'time', baseMin: 30, baseFee: 1000, unitMin: 30, unitFee: 1000, dailyMax: null },
          desc: '30분당 1,000원 (업체 사정에 따라 변동)',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→광명 KTX → 버스/지하철', access: 1500, main: 11000, local: 1550 },
    },
    suwon: {
      name: '수원KT위즈파크', region: '수원',
      car: {
        distanceKm: 75, toll: 3000,
        parking: {
          lot: '수원종합운동장 부설주차장', status: '비공식',
          rule: { type: 'flat', fee: 5000 },
          desc: '경기일 100% 사전예약 선불 5,000원',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→수원 KTX → 버스', access: 1500, main: 8400, local: 1500 },
    },
    daejeon: {
      name: '대전 한화생명볼파크', region: '대전',
      car: {
        distanceKm: 95, toll: 3500,
        parking: {
          lot: '한화생명볼파크 주차장', status: '추정',
          rule: { type: 'flat', fee: 0 },
          desc: '경기일 무료 (경기 3시간 전~종료 1시간 후). 1회 5,000원이라는 자료도 있음',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→대전 KTX → 버스', access: 1500, main: 8500, local: 1500 },
    },
    daegu: {
      name: '대구삼성라이온즈파크', region: '대구',
      car: {
        distanceKm: 230, toll: 10000,
        parking: {
          lot: '전설로 주차장', status: '비공식',
          rule: { type: 'flat', fee: 2000 },
          desc: '경기당 선불 2,000원',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→동대구 KTX → 지하철', access: 1500, main: 31000, local: 1500 },
    },
    gwangju: {
      name: '광주-기아챔피언스필드', region: '광주',
      car: {
        distanceKm: 230, toll: 9500,
        parking: {
          lot: '챔피언스필드 지상·지하 주차장', status: '추정',
          rule: { type: 'flat', fee: 0 },
          desc: '경기일 무료 개방 (유료화 시행 시 3,000~5,000원)',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→광주송정 KTX → 버스', access: 1500, main: 34000, local: 1500 },
    },
    sajik: {
      name: '사직야구장', region: '부산',
      car: {
        distanceKm: 340, toll: 15000,
        parking: {
          lot: '사직종합운동장 부설주차장', status: '비공식',
          rule: { type: 'time', baseMin: 10, baseFee: 0, unitMin: 10, unitFee: 200, dailyMax: 5000 },
          desc: '최초 10분 무료, 10분당 200원, 1일 최대 5,000원',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→부산 KTX → 지하철', access: 1500, main: 46000, local: 1600 },
    },
    changwon: {
      name: '창원NC파크', region: '창원',
      car: {
        distanceKm: 300, toll: 13500,
        parking: {
          lot: 'NC파크 철골·노상 주차장', status: '비공식',
          rule: { type: 'flat', fee: 0 },
          desc: '경기 1시간 전~종료 1시간 후 무료 (그 외 시간 유료)',
        },
      },
      transit: { mode: 'KTX', route: '천안아산→창원중앙 KTX → 버스', access: 1500, main: 43000, local: 1500 },
    },
  };

  // 상대 구단 → 원정 구장
  const TEAMS = [
    { team: '두산', awayStadium: 'jamsil' },
    { team: 'SSG', awayStadium: 'munhak' },
    { team: '키움', awayStadium: 'gocheok' },
    { team: 'KT', awayStadium: 'suwon' },
    { team: '한화', awayStadium: 'daejeon' },
    { team: '삼성', awayStadium: 'daegu' },
    { team: 'KIA', awayStadium: 'gwangju' },
    { team: '롯데', awayStadium: 'sajik' },
    { team: 'NC', awayStadium: 'changwon' },
  ];

  // 2026 법정 공휴일 (대체공휴일 포함). 주말이 아닌 날짜라도 공휴일이면 직관 대상으로 본다.
  const HOLIDAYS = {
    '2026-01-01': '신정',
    '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
    '2026-03-01': '삼일절', '2026-03-02': '대체공휴일(삼일절)',
    '2026-05-05': '어린이날',
    '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일(부처님오신날)',
    '2026-06-03': '전국동시지방선거일',
    '2026-06-06': '현충일',
    '2026-08-15': '광복절', '2026-08-17': '대체공휴일(광복절)',
    '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
    '2026-10-03': '개천절', '2026-10-05': '대체공휴일(개천절)',
    '2026-10-09': '한글날',
    '2026-12-25': '성탄절',
  };

  // 2026 실제 직관 경기 (TEAMS 순서). 선택 기준: 해당 구장에서 열린 시즌 첫 토·일 경기,
  // 토·일 경기가 없으면 첫 공휴일 경기 (우천 취소 제외)
  // score는 'LG:상대'. 출처: koreabaseball.com GameCenter, m.sports.naver.com/game/<gameId>
  const HOME_RECORDS = [
    { date: '2026-06-20', start: '17:00', score: '4:2', result: '승' },  // 두산
    { date: '2026-04-11', start: '17:00', score: '4:3', result: '승' },  // SSG
    { date: '2026-05-23', start: '14:00', score: '5:2', result: '승' },  // 키움
    { date: '2026-03-28', start: '14:00', score: '7:11', result: '패' }, // KT (개막전)
    { date: '2026-07-04', start: '18:00', score: '5:3', result: '승' },  // 한화
    { date: '2026-09-05', start: '17:00', score: '3:4', result: '패' },  // 삼성
    { date: '2026-05-30', start: '17:00', score: '3:1', result: '승' },  // KIA
    { date: '2026-06-13', start: '17:00', score: '5:3', result: '승' },  // 롯데
    { date: '2026-05-02', start: '17:00', score: '13:5', result: '승' }, // NC
  ];
  const AWAY_RECORDS = [
    { date: '2026-04-25', start: '14:00', score: '7:5', result: '승' },  // 두산 (두산 홈, 잠실)
    { date: '2026-05-16', start: '17:00', score: '3:4', result: '패' },  // SSG
    { date: '2026-04-04', start: '17:00', score: '6:4', result: '승' },  // 키움
    // KT: 2026 수원 7경기 중 주말 경기 없음 → 공휴일 경기(6/3 지방선거일)로 대체
    { date: '2026-06-03', start: '17:00', score: '6:7', result: '패', note: '2026년 수원 주말 경기 없음 → 공휴일(지방선거일) 경기로 대체' },
    { date: '2026-05-09', start: '14:00', score: '3:11', result: '패' }, // 한화
    { date: '2026-04-18', start: '14:00', score: '2:7', result: '패' },  // 삼성
    { date: '2026-09-26', start: '17:00', score: '1:5', result: '패' },  // KIA
    { date: '2026-06-27', start: '17:00', score: '8:7', result: '승' },  // 롯데
    { date: '2026-06-06', start: '17:00', score: '5:8', result: '패' },  // NC
  ];

  function makeGame(id, type, team, stadium, rec) {
    return {
      id: id, type: type, opponent: team, stadium: stadium,
      date: rec.date, start: rec.start, score: rec.score, result: rec.result, note: rec.note || '',
    };
  }

  const GAMES = [];
  TEAMS.forEach(function (t, i) { GAMES.push(makeGame('H' + (i + 1), '홈', t.team, 'jamsil', HOME_RECORDS[i])); });
  TEAMS.forEach(function (t, i) { GAMES.push(makeGame('A' + (i + 1), '원정', t.team, t.awayStadium, AWAY_RECORDS[i])); });

  const DATA = {
    PARKING_STAY: PARKING_STAY,
    HOLIDAYS: HOLIDAYS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    STADIUMS: STADIUMS,
    TEAMS: TEAMS,
    GAMES: GAMES,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.APP_DATA = DATA;
})(this);
