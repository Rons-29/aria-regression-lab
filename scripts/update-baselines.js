#!/usr/bin/env node
/**
 * 正常版フィクスチャだけから画像・ARIA ベースラインを生成する。
 * 名前欠落版／色変更版では絶対に更新しない。
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { STATES, generateSaveButtonHtml } = require('../src/fixture');

const SNAPSHOT_DIR = path.join(
  __dirname,
  '..',
  'tests',
  'aria-regression.spec.js-snapshots',
);
const SCREENSHOT_PATH = path.join(
  SNAPSHOT_DIR,
  'save-button-normal-chromium-linux.png',
);
const ARIA_PATH = path.join(SNAPSHOT_DIR, 'save-button-normal.aria.yml');

async function main() {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.setContent(generateSaveButtonHtml(STATES.normal), {
    waitUntil: 'domcontentloaded',
  });
  const button = page.locator('#save-button');
  await button.waitFor({ state: 'visible' });

  const accessibleName = await button.evaluate((el) => {
    // 簡易確認: aria-label が仕様どおり
    return el.getAttribute('aria-label');
  });
  if (accessibleName !== '保存') {
    throw new Error(
      `架空仕様と不一致: aria-label が "${accessibleName}"（期待: 保存）`,
    );
  }

  const ariaYaml = await button.ariaSnapshot();
  if (!ariaYaml.includes('button') || !ariaYaml.includes('保存')) {
    throw new Error(
      `架空仕様と不一致: ARIA snapshot が仕様を満たさない:\n${ariaYaml}`,
    );
  }

  fs.writeFileSync(ARIA_PATH, `${ariaYaml.trim()}\n`, 'utf8');
  await button.screenshot({ path: SCREENSHOT_PATH, animations: 'disabled' });

  console.log('ベースラインを正常版から更新しました:');
  console.log(`  screenshot: ${SCREENSHOT_PATH}`);
  console.log(`  aria:       ${ARIA_PATH}`);
  console.log(`  aria yaml:\n${ariaYaml}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
