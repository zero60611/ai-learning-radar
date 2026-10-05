# AI 學習雷達（AI Learning Radar）

以學術討論與工程實務為主軸的 AI 概念研究筆記，整理概念定義、適用情境、證據與限制。研究範圍涵蓋 2025 年背景及 2026 年 1–10 月資料；文件與產品規格以頁面標示的查閱日期為準。

[線上閱讀（GitHub Pages）](https://zero60611.github.io/ai-learning-radar/)

## 閱讀方式

- **概念框架**：Prompt、Context、Harness、Loop、Graph 的關係與學習路徑。
- **詞條索引**：64 個詞條，支援搜尋、分類、時期、學習進度與分頁。
- **技術時間線**：42 則事件，按月份與事件分層展開。
- **專題研究**：Jev、自主迴圈，以及 health-rpg-backend 工程案例。
- **來源與方法**：104 筆引用、研究限制與常見概念誤讀。

引用連結會切換到來源所在頁；詞條連結會展開對應內容。學習進度僅儲存在使用者瀏覽器的 localStorage；瀏覽器不允許儲存時仍可閱讀。列印會展開全部內容，列印後恢復原閱讀狀態。未啟用 JavaScript 時，全部內容仍可直接閱讀。

## 專案結構

```text
index.html          研究內容、詞條、事件與來源
assets/radar.css    版面、響應式與列印樣式
assets/radar.js     導覽、搜尋、分頁、進度與引用定位
scripts/verify.py   HTML 結構、連結與內容數量檢查
```

無建置步驟與第三方前端依賴。可直接開啟 `index.html`，或啟動本機預覽：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

## 維護流程

1. 修改 `index.html` 內容，保留既有詞條與來源的 `id`，維持引用與深層連結。
2. 增加詞條、事件或來源時，同步更新首頁數量與 `scripts/verify.py` 的預期數量。
3. 執行結構檢查與 JavaScript 語法檢查：

```powershell
python scripts/verify.py
node --check assets/radar.js
```

4. 本機預覽桌機與手機版，確認搜尋、分頁、引用跳轉與鍵盤導覽。

本 repo 不包含歷史 JSON、建置腳本、Markdown、PDF 或舊版 HTML 備份。health-rpg-backend 案例是使用者提供的專案紀錄，與外部研究證據分開呈現。
