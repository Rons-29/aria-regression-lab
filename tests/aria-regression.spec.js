// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {
  STATES,
  generateSaveButtonHtml,
} = require('../src/fixture');

/** 正常版から固定したベースライン名（名前欠落版に合わせて更新しない） */
const SCREENSHOT_BASELINE = 'save-button-normal.png';
const ARIA_BASELINE_NAME = 'save-button-normal.aria.yml';

/** 架空仕様どおりの ARIA 期待（role=button, name=保存） */
const SPEC_ARIA_SNAPSHOT = `
- button "保存"
`.trim();

const STATES_TO_MEASURE = [
  STATES.normal,
  STATES.nameMissing,
  STATES.colorChanged,
];

const RUNS_PER_STATE = 3;
const RESULTS_JSON = path.join(__dirname, '..', 'results', 'results.json');
const RESULTS_MD = path.join(__dirname, '..', 'results', 'results.md');

/**
 * @param {unknown} error
 * @returns {'mismatch' | 'error'}
 */
function classifyCompareFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  // Playwright のスナップショット／スクリーンショット不一致
  const isMismatch =
    /Screenshot comparison failed/i.test(message) ||
    /Aria snapshot comparison failed/i.test(message) ||
    /toHaveScreenshot/i.test(message) ||
    /toMatchAriaSnapshot/i.test(message) ||
    /Expect.*snapshot/i.test(message) ||
    /Expected:.*Received:/s.test(message) ||
    message.includes('expect(');

  // ブラウザ起動失敗などは error
  const isExecutionError =
    /browserType\.launch/i.test(message) ||
    /Target closed/i.test(message) ||
    /Executable doesn't exist/i.test(message) ||
    /net::ERR/i.test(message);

  if (isExecutionError) return 'error';
  if (isMismatch) return 'mismatch';
  return 'error';
}

/**
 * @param {import('@playwright/test').Locator} button
 * @param {'screenshot' | 'aria'} method
 * @returns {Promise<'match' | 'mismatch' | 'error'>}
 */
async function runComparison(button, method) {
  // 意図的不一致を早く確定するため短め。実行エラーは別経路で error 扱い。
  const timeout = 2_000;
  try {
    if (method === 'screenshot') {
      await expect(button).toHaveScreenshot(SCREENSHOT_BASELINE, { timeout });
    } else {
      await expect(button).toMatchAriaSnapshot({
        name: ARIA_BASELINE_NAME,
        timeout,
      });
    }
    return 'match';
  } catch (error) {
    return classifyCompareFailure(error);
  }
}

/**
 * @param {Array<{state: string, run: number, screenshot: string, aria: string}>} rows
 */
function writeResultsTable(rows) {
  fs.mkdirSync(path.dirname(RESULTS_JSON), { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    hypothesis:
      'アイコンのみ保存ボタンの名前欠落は、画像比較だけでは検出できず、ARIA 比較を追加すると検出できる',
    rows,
  };
  fs.writeFileSync(RESULTS_JSON, JSON.stringify(payload, null, 2), 'utf8');

  const header =
    '| 状態 | 回 | 画像比較 | ARIA比較 |\n|---|---:|---|---|\n';
  const body = rows
    .map(
      (r) =>
        `| ${r.state} | ${r.run} | ${r.screenshot} | ${r.aria} |`,
    )
    .join('\n');
  fs.writeFileSync(RESULTS_MD, `# 実測結果\n\n${header}${body}\n`, 'utf8');
}

test.describe('aria-regression-lab', () => {
  test.describe.configure({ mode: 'serial' });

  /** @type {Array<{state: string, run: number, screenshot: string, aria: string}>} */
  const collected = [];

  test.beforeEach(async ({ page }) => {
    // アニメーション・外部フォントなしの静的 HTML を直接注入
    page.setDefaultTimeout(15_000);
  });

  test('正常版は架空仕様（role=button, name=保存）を満たし、固定ベースラインと一致する', async ({
    page,
  }) => {
    await page.setContent(generateSaveButtonHtml(STATES.normal), {
      waitUntil: 'domcontentloaded',
    });
    const button = page.locator('#save-button');

    await expect(button).toBeVisible();
    await expect(button).toHaveRole('button');
    await expect(button).toHaveAccessibleName('保存');
    // 仕様 YAML と照合してから、ファイルベースライン（正常版固定）と比較する
    await expect(button).toMatchAriaSnapshot(SPEC_ARIA_SNAPSHOT);
    // ベースラインは scripts/update-baselines.js でのみ更新する（名前欠落版に合わせない）
    await expect(button).toHaveScreenshot(SCREENSHOT_BASELINE);
    await expect(button).toMatchAriaSnapshot({ name: ARIA_BASELINE_NAME });
  });


  for (const state of STATES_TO_MEASURE) {
    for (let run = 1; run <= RUNS_PER_STATE; run++) {
      test(`${state} × 画像/ARIA 比較（run ${run}/${RUNS_PER_STATE}）`, async ({
        page,
      }) => {
        try {
          await page.setContent(generateSaveButtonHtml(state), {
            waitUntil: 'domcontentloaded',
          });
          const button = page.locator('#save-button');
          await expect(button).toBeVisible();

          const screenshot = await runComparison(button, 'screenshot');
          const aria = await runComparison(button, 'aria');

          collected.push({ state, run, screenshot, aria });
        } catch (error) {
          // setContent やブラウザ側の実行エラー
          collected.push({
            state,
            run,
            screenshot: 'error',
            aria: 'error',
          });
          throw error;
        }
      });
    }
  }

  test.afterAll(() => {
    if (collected.length > 0) {
      writeResultsTable(collected);
    }
  });
});
