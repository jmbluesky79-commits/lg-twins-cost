// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    channel: 'chrome', // 설치된 Chrome 사용 (브라우저 별도 다운로드 불필요)
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: 'python -m http.server 8080',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: true,
    timeout: 15000,
  },
});
