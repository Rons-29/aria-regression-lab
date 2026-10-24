/**
 * アイコンのみ保存ボタンの HTML を、検証用の 3 状態で生成する。
 * - normal: aria-label="保存"（架空仕様どおり）
 * - name-missing: aria-label のみ削除（見た目は同一、名前欠落）
 * - color-changed: 背景色のみ変更（名前は維持）
 */

const STATES = Object.freeze({
  normal: 'normal',
  nameMissing: 'name-missing',
  colorChanged: 'color-changed',
});

const SAVE_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M4 2h10l4 4v12H4V2zm2 2v4h8V4H6zm0 6v6h8v-6H6zm8-8.5V6h2.5L14 3.5z"/>
</svg>
`.trim();

/**
 * @param {'normal' | 'name-missing' | 'color-changed'} state
 * @returns {string}
 */
function generateSaveButtonHtml(state) {
  if (!Object.values(STATES).includes(state)) {
    throw new Error(`Unknown fixture state: ${state}`);
  }

  const ariaLabelAttr =
    state === STATES.nameMissing ? '' : ' aria-label="保存"';
  const background =
    state === STATES.colorChanged ? '#0b6bcb' : '#1a1a1a';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>aria-regression-lab fixture</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #f0f0f0;
      font-family: sans-serif;
    }
    .stage {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 24px;
    }
    #save-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 6px;
      background: ${background};
      color: #ffffff;
      cursor: pointer;
    }
    #save-button:focus {
      outline: 2px solid #333333;
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  <div class="stage">
    <button type="button" id="save-button"${ariaLabelAttr}>
      ${SAVE_ICON_SVG}
    </button>
  </div>
</body>
</html>`;
}

module.exports = {
  STATES,
  generateSaveButtonHtml,
};
