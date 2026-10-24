# aria-regression-lab

見た目が変わらないアクセシビリティ不具合（名前欠落）を、画像比較と ARIA スナップショット比較で検分する自己完結ミニ検証プロジェクト。

## QA課題

架空仕様: **アイコンだけの保存ボタンは、支援技術から「保存」という名前で識別できる。**

見た目が同じまま `aria-label` だけ消えたとき、スクリーンショット比較だけでは見逃し、ARIA 比較を足すと拾えるかを、静的な 3 状態フィクスチャで確認する。

| 状態 | 変更内容 | 扱い |
|---|---|---|
| 正常版 (`normal`) | `aria-label="保存"` あり。アイコンは `aria-hidden` | 基準 |
| 名前欠落版 (`name-missing`) | `aria-label` のみ削除。アイコンは引き続き `aria-hidden` | 検出したい不具合 |
| 色変更版 (`color-changed`) | ボタン背景色のみ変更。名前は維持 | 対照（見た目差分） |

## 仮説

この保存ボタンでは、**画像比較だけでは検出できない名前欠落を、ARIA 比較を追加すると検出できる。**

予測（実測前）: 正常版は画像一致/ARIA一致、名前欠落版は画像一致/ARIA不一致、色変更版は画像不一致/ARIA一致。

## 環境

実測時の環境（再現時も同系統を推奨）:

| 項目 | 値 |
|---|---|
| OS | Ubuntu 24.04.5 LTS (Linux 6.12.94+ x86_64) |
| Node.js | v22.23.4 |
| npm | 10.9.9 |
| Playwright Test | 1.64.1 |
| Chromium | 156.0.8078.4（Playwright `chromium` v1248） |
| viewport | 800×600, `deviceScaleFactor: 1` |

- ブラウザ: Chromium のみ
- 表示: `page.setContent()`（サーバー不要）
- 対象: ボタン周辺のみ（`#save-button`）
- 外部フォント・アニメーションなし（インライン SVG）

## 実行手順

```bash
npm ci
npx playwright install chromium
npx playwright test
```

補足:

- 正常版ベースラインの再生成（通常は不要。コミット済みスナップショットを使う）:
  ```bash
  npm run baselines
  ```
- 実測表の集計表示:
  ```bash
  npm run measure
  ```

`npx playwright test` は 3 状態 × 各 3 回の比較を行い、`results/results.json` と `results/results.md` に実測を書き出す。意図的な不一致はテスト失敗ではなく `mismatch` として記録し、ブラウザ起動失敗などは `error` と区別する。

## 比較結果（実測表）

正常版から固定したベースラインに対する比較結果（予測ではなく実行ログ）:

| 状態 | 回 | 画像比較 | ARIA比較 |
|---|---:|---|---|
| normal | 1 | match | match |
| normal | 2 | match | match |
| normal | 3 | match | match |
| name-missing | 1 | match | mismatch |
| name-missing | 2 | match | mismatch |
| name-missing | 3 | match | mismatch |
| color-changed | 1 | mismatch | match |
| color-changed | 2 | mismatch | match |
| color-changed | 3 | mismatch | match |

### 評価（仕様どおり）

| 観点 | 結果 |
|---|---|
| 名前欠落の検出 | 画像一致 3/3 かつ ARIA 不一致 3/3 → **仮説を支持** |
| 正常版の安定性 | 両方式とも 3/3 一致 |
| 色変更への反応 | 画像不一致 3/3、ARIA 一致 3/3（予測どおり） |

生データ: [`results/results.json`](results/results.json) / [`results/results.md`](results/results.md)

## 限界

- ARIA 比較の成功はアクセシビリティ全体の合格ではない。キーボード操作・実際のスクリーンリーダー読み上げは未検証。
- 名前 1 個の欠落なら `toHaveAccessibleName('保存')` などの専用アサーションでも検出できる。**スナップショット方式が一般に優れているとは主張しない。**
- Chromium・固定 viewport・静的 UI に限定。フォント差・サブピクセル差のある別 OS では画像結果が変わりうる。
- 色変更版が画像比較で確実に不一致になったのは、`playwright.config.js` の `expect.toHaveScreenshot` で `maxDiffPixels: 0`・`animations: 'disabled'` としているためである（テスト側では `threshold` / `maxDiffPixels` を上書きしていない）。しきい値を緩めれば色変更の結果は変わりうる。
- 意図的不一致と実行エラーは分類しているが、未知の例外メッセージは保守的に `error` 側へ寄せている。

## 作業時間

約 45 分（フィクスチャ設計、Playwright 構成、ベースライン固定、9 回実測、README・再現確認まで）。

## 次回候補

- フォーカスリング有無など、見た目は薄いが操作上重要な差分の対照
- `toHaveAccessibleName` と ARIA スナップショットの検出コスト比較（1 属性ケース）
- 動的に挿入されるトースト／ダイアログの名前欠落

---

## 成果記録

試したこと：保存ボタン3状態を、画像比較とARIA比較で各3回検証。作業時間約45分。  
分かったこと：名前欠落の検出は画像［0/3］、ARIA［3/3］。色変更への反応は画像不一致3/3・ARIA一致3/3。  
使える条件：Chromiumのみ、固定viewport 800×600（`deviceScaleFactor: 1`）、画像比較は `maxDiffPixels: 0`・`animations: 'disabled'`（`threshold` は未設定）。今回はChromium・静的ボタンのみで、読み上げ操作は未検証。

## X投稿案

```
見た目が同じでも、保存ボタンの「名前」が消えたら検出できるか。
架空UIの正常・名前欠落・色変更の3状態を、画像比較とPlaywrightのARIA比較で各3回検証。名前欠落の検出は画像［0/3］、ARIA［3/3］でした。
Chromiumの静的UI限定。読み上げ操作は未検証です。
再現コード：https://github.com/Rons-29/aria-regression-lab
```
