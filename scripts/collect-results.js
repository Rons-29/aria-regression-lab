#!/usr/bin/env node
/**
 * Playwright テスト実行後の results/results.json を読み、
 * 集計サマリ（仮説支持判定用）を stdout と results/summary.md に出す。
 */
const fs = require('fs');
const path = require('path');

const RESULTS_JSON = path.join(__dirname, '..', 'results', 'results.json');
const SUMMARY_MD = path.join(__dirname, '..', 'results', 'summary.md');

function main() {
  if (!fs.existsSync(RESULTS_JSON)) {
    console.error('results/results.json がありません。先に npx playwright test を実行してください。');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf8'));
  const rows = data.rows || [];

  const nameMissing = rows.filter((r) => r.state === 'name-missing');
  const normal = rows.filter((r) => r.state === 'normal');
  const colorChanged = rows.filter((r) => r.state === 'color-changed');

  const count = (list, key, value) =>
    list.filter((r) => r[key] === value).length;

  const nameMissingScreenshotMatch = count(nameMissing, 'screenshot', 'match');
  const nameMissingAriaMismatch = count(nameMissing, 'aria', 'mismatch');
  const normalScreenshotMatch = count(normal, 'screenshot', 'match');
  const normalAriaMatch = count(normal, 'aria', 'match');
  const colorScreenshotMismatch = count(colorChanged, 'screenshot', 'mismatch');
  const colorAriaMatch = count(colorChanged, 'aria', 'match');

  const hypothesisSupported =
    nameMissing.length === 3 &&
    nameMissingScreenshotMatch === 3 &&
    nameMissingAriaMismatch === 3;

  const summary = {
    nameMissingDetection: {
      screenshotMatch: `${nameMissingScreenshotMatch}/3`,
      ariaMismatch: `${nameMissingAriaMismatch}/3`,
      hypothesisSupported,
    },
    normalStability: {
      screenshotMatch: `${normalScreenshotMatch}/3`,
      ariaMatch: `${normalAriaMatch}/3`,
    },
    colorChangedReaction: {
      screenshotMismatch: `${colorScreenshotMismatch}/3`,
      ariaMatch: `${colorAriaMatch}/3`,
      rows: colorChanged,
    },
  };

  const nameMissingDetectedByScreenshot = 3 - nameMissingScreenshotMatch;
  const nameMissingDetectedByAria = nameMissingAriaMismatch;

  const md = `# 集計サマリ

## 名前欠落の検出
- 画像一致: ${summary.nameMissingDetection.screenshotMatch}（＝名前欠落を画像では **${nameMissingDetectedByScreenshot}/3** 検出）
- ARIA 不一致: ${summary.nameMissingDetection.ariaMismatch}（＝名前欠落を ARIA で **${nameMissingDetectedByAria}/3** 検出）
- 仮説支持（画像一致かつ ARIA 不一致が 3/3）: **${hypothesisSupported ? 'はい' : 'いいえ'}**

## 正常版の安定性
- 画像一致: ${summary.normalStability.screenshotMatch}
- ARIA 一致: ${summary.normalStability.ariaMatch}

## 色変更への反応
- 画像不一致: ${summary.colorChangedReaction.screenshotMismatch}
- ARIA 一致: ${summary.colorChangedReaction.ariaMatch}
`;

  fs.writeFileSync(SUMMARY_MD, md, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n' + md);
}

main();
