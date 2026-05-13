# Process Flow V2 Geometry Workplane Proposal

## 1. 專案摘要

V1 已建立以 process flow 為核心的共通描述語言，讓 simulation team 與 integration team 能針對每個 process step 的 input state、output state、process parameter、source、assumption 與 review status 取得一致理解。

V2 建議在此基礎上加入 Geometry Workplane。使用者在 Web 上建立或編輯 process flow instance 時，系統可依照 process step 順序逐步產生 package geometry preview，讓工程師不只看到表格化的製程資料，也能直接看到封裝結構如何被每個製程步驟逐步形成。

V2 的核心策略是：geometry engine 不寫死在 kernel 中，而是透過 plugin / behavior binding 擴充。Kernel 負責流程解析、版本治理、plugin 調度、geometry state 管理與結果追溯；各個 process step 的幾何行為由獨立 implementation 提供。這讓系統能同時支援快速的 Web preview，也能在後端執行更複雜的 geometry generation、FEM preprocessing 或 simulation workflow。

## 2. 為什麼需要 V2

目前 simulation engineer 常以 final package geometry 作為模型建立入口，但 final geometry 的形成其實來自一連串 process steps。若只有最終幾何或分散文件，團隊很難追蹤每個結構特徵是由哪個站點、哪個參數、哪個假設產生。

V2 Geometry Workplane 希望解決三個問題：

- 讓使用者在編輯 process flow 時立即看到幾何結果，而不是等到後段建模才發現理解落差。
- 讓 geometry 與 process state 產生可追溯連結，知道某個 die、underfill、molding 或 substrate layer 來自哪個 process step。
- 讓不同 fidelity 的 geometry engine 共存：快速 preview 在 Web 執行，較複雜模型與 FEM preprocessing 在 backend server 執行。

## 3. 使用者價值

V2 對使用者帶來的主要便利性與好處如下：

- 即時視覺化：使用者調整 process parameter 後，可在 Web 上快速看到封裝結構大致變化。
- 降低溝通成本：simulation、integration、module team 可共同看同一份 process-driven geometry，減少純文字或表格造成的解讀差異。
- 提早發現問題：例如 underfill 高度、die stack、molding thickness、substrate layer stack 若與預期不一致，可在流程設定階段提早暴露。
- 支援漸進式精度：日常討論使用 preview geometry；需要正式分析時再送 backend 產生中高精度幾何或 FEM input。
- 提高重用性：相同 process step template 可在不同封裝技術中共用；幾何行為也可透過 plugin 由不同團隊擴充。
- 強化可追溯性：每次 geometry 產生都可記錄 process flow version、step template version、behavior implementation version、engine profile 與 input snapshot。

## 4. V2 產品能力

V2 Geometry Workplane 預計提供以下能力：

1. 使用者可在 Web UI 中選擇 process flow template，建立或編輯 TV/Product instance。
2. UI 可依據 process flow 與 step values 即時產生 simplified geometry preview。
3. Preview engine 預設在 browser 執行，適合顯示 die、die-to-die underfill、molding、substrate layers 等大致結構。
4. 使用者可在 UI 中切換可用 engine，例如 Preview、Standard Geometry、Complex Geometry 或 FEM Prep。
5. 若選擇 backend engine，系統會觸發 backend API，由 server 產生更正式的 geometry result。
6. UI 可顯示目前 flow 支援哪些 engine，以及哪些 process steps 缺少對應 implementation。
7. 每個 geometry output 可保留 provenance，讓使用者知道結果來自哪些流程版本、參數與 engine implementation。

## 5. 設計原則

V2 採用以下設計原則：

- Kernel 不實作個別製程行為，例如 molding、underfill 或 die attach 的細節不寫在 kernel 中。
- ProcessStepTemplate 定義製程語意、欄位與參數需求。
- Geometry behavior implementation 定義某個 process step 在特定 engine profile 下如何改變 geometry。
- 同一個 process step 可綁定多個 engine implementation，例如 Web preview、backend standard model、backend complex model。
- Web preview 是預設使用體驗，但 backend engine 才是正式高精度 geometry 與 FEM workflow 的主要執行位置。
- DB 作為 registry，保存 engine、behavior binding、artifact metadata 與版本資訊，不作為大量 source code repository。

## 6. 建議架構概念

```text
Web UI
  - process flow editing
  - geometry workplane
  - preview engine execution
  - engine selection

Process Kernel
  - resolve flow template and step templates
  - validate fields and values
  - dispatch geometry behavior plugins
  - manage geometry state and provenance

Geometry Behavior Plugins
  - preview implementation, usually WASM
  - backend implementation, usually Python/C++/container/service

Backend Geometry Service
  - standard / complex geometry generation
  - FEM preprocessing
  - backend geometry result generation
```

## 7. V2 MVP 範圍

V2 MVP 建議先聚焦在 simplified geometry，而非完整 CAD 或完整 FEM automation。

建議 MVP 包含：

- 2D cross-section 或 2.5D package geometry preview。
- 基本 geometry state / geometry patch contract。
- Preview engine profile，預設在 Web 執行。
- 至少三個代表性 process step 的 preview implementation，例如 die attach、underfill、molding。
- Engine support matrix，讓 UI 可顯示某條 flow 支援哪些 engine。
- Backend geometry request API，為後續 standard / complex engine 鋪路。
- Geometry output provenance，記錄產生結果的 flow、step、behavior 與 input snapshot。

## 8. 非目標

V2 MVP 不建議承諾以下範圍：

- 不承諾完整 3D CAD kernel。
- 不承諾詳細 RDL trace、bump array、substrate routing 全細節建模。
- 不取代正式 mechanical CAD、FEM solver 或公司既有 simulation tool。
- 不讓 kernel 直接執行 Git branch 上的任意程式。
- 不要求每個新 process step 一開始都具備所有 fidelity 的 implementation。

## 9. 建議導入階段

### Phase 1：Geometry Workplane Foundation

- 定義 GeometryState、GeometryPatch、GeometryScene 與 BehaviorBinding contract。
- 建立 browser preview engine。
- 建立基本 process step preview plugin。
- UI 顯示 preview geometry 與 engine support matrix。

### Phase 2：Backend Geometry Service

- 建立 backend execution API。
- 支援 standard geometry engine。
- 回傳 backend geometry result、diagnostics 與 provenance。
- 支援使用者從 UI 觸發 backend geometry generation。

### Phase 3：Complex Geometry / FEM Prep

- 擴充 complex geometry engine。
- 增加 FEM preprocessing export。
- 導入更嚴格的 review、approval 與 reproducibility 機制。

## 10. 成功指標

V2 可用以下指標評估成效：

- 使用者可在 Web 上建立 process flow instance 並於數秒內看到 preview geometry。
- Preview geometry 可清楚呈現主要封裝結構，例如 die、underfill、molding、substrate layers。
- UI 可列出某條 process flow 可使用的 geometry engine，以及缺少 implementation 的 process steps。
- Geometry output 可追溯到 process flow version、step template version、behavior version 與 input values。
- 至少一條代表性 package flow 可從 process flow 產生 preview geometry，並能觸發 backend geometry generation。

## 11. 主要風險與對策

- Preview 與 backend 結果不一致：兩者必須使用同一份 ProcessStepTemplate 欄位定義與 canonical input mapping，並清楚標示 preview 不是正式 FEM input。
- 新 step 開發門檻過高：draft step template 可允許暫時沒有 preview implementation；published step template 則要求 preview binding 或提供 generic fallback。
- Plugin 版本治理複雜：所有 behavior artifact 必須使用 immutable version、digest 與 compatibility metadata，不使用 latest 或 mutable branch。
- Scope 過大：V2 先聚焦 simplified geometry preview 與 contract，再逐步導入 backend complex geometry 與 FEM prep。
- 安全與穩定性：Web preview plugin 使用 sandboxed WASM；backend plugin 使用 container isolation 或受控 service execution。
