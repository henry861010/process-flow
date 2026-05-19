# Process Flow 共通語言 PoC 計畫書

## 1. 專案摘要

本 PoC 目標是建立一套以 process flow 為核心的共通描述語言，讓 simulation team 能用站點層級描述封裝製程中的 process state，並讓 integration team 對關鍵資訊進行 review。

V1 不追求自動模擬真實製程，也不直接產出 FEM-ready geometry。這一版先建立可追溯、可 review、可版本化的 process-state workflow，讓團隊能在模型建立前先對「每一站的輸入、輸出、參數、資料來源、假設與未知項」有一致理解。

## 2. 背景與問題

Simulation team 目前常以 final package geometry 作為建模入口，例如 molding 厚度、die placement、underfill 高度或 final package dimension。這種做法在產品尚未完整定義、製程仍在演進時，容易讓 simulation、integration、module team 對同一個結構狀態產生不同解讀。

實際上，wafer 到 final package 的狀態是由一連串 process station 逐步形成。若缺少共同語言，simulation engineer 需要反覆訪談、查文件與補假設，也難以清楚追蹤哪些資訊已確認、哪些只是暫時假設、哪些仍是 unknown。

## 3. 解法概覽

PoC 會用 process flow template 描述一種封裝技術平台的標準流程，例如 xxxTech、yyyTech 或 zzzTech。當有特定 TV/Product，例如 aaaTV 或 bbbTV，系統會從對應 template 建立 process flow instance，讓工程師在每個站點填入實際 value、source、assumption、unknown 與 review status。

核心設計原則是「站點與欄位定義可共用，產品實際值存在 instance」。相同 process station 例如 molding、underfill、die attach，不應在不同封裝技術中重複定義出語意不同的欄位。這能降低欄位命名漂移，也讓跨產品與跨封裝技術的比較更一致。

## 4. 主要使用情境

### 4.1 新封裝技術開發

當團隊正在開發新封裝技術時，simulation engineer 可以從既有 process station library 選用常見站點，例如 incoming wafer、die attach、underfill、molding、final package state。若現有站點不足，再與 integration team 一起定義新的站點與必要欄位。

### 4.2 既有封裝技術的新 TV/Product

當新 TV/Product 屬於既有封裝技術，例如 aaaTV 或 bbbTV 都使用 xxxTech 平台時，工程師不需要重新搭建整條 process flow。系統可從 xxxTech process flow template 建立 instance，並讓 simulation engineer 只針對該 TV/Product 補入站點 value 與資料來源。

### 4.3 Integration Review

Integration reviewer 可以針對必要欄位留下 review status 與 comment。這讓 simulation team 在進入 FEM 或 thermal model construction 前，能清楚知道哪些資訊已被確認，哪些仍需補件或等待 integration 判斷。

## 5. V1 範圍

- 建立一套 process flow 描述語言，能描述站點、站點順序、站點欄位與 TV/Product 實際值。
- 建立代表性的 xxxTech process flow template。
- 建立 aaaTV 與 bbbTV sample instance，示範同一流程下不同 TV/Product 的差異。
- 提供 UI 操作 process flow template selection、instance creation、process timeline 與 step detail editing。
- 每個欄位可記錄 value、source、assumption、unknown、attachment reference 與 review status。
- 已建立的 instance 會保留建立當下使用的流程版本；後續流程更新不會自動改動既有 instance。

## 6. 非目標

- 不在 V1 中承諾完整 3D geometry engine。
- 不在 V1 中承諾 FEM mesh export。
- 不在 V1 中直接串接公司 MES、PLM 或 material DB。
- 不在 V1 中執行 derived/function 類參數計算。
- 不用此系統取代 integration 正式規格文件；V1 先作為共通語言與 review workflow 的 PoC。

## 7. 預期效益

- 降低 simulation 與 integration 對 process state 的溝通成本。
- 讓新進工程師能從單一流程理解 package state 如何形成，而不是只靠零散文件與口頭傳承。
- 讓同一封裝技術下不同 TV/Product 的差異可比較。
- 讓不同封裝技術可共用相同 process station 定義，減少重複建置與欄位定義漂移。
- 讓 assumption 與 unknown 被顯性化，避免被誤認為已確認規格。
- 為未來 geometry automation 與 FEM preprocessing 建立可追溯資料基礎。

## 8. PoC 時程

建議時程為 8-12 週。

- Week 1-2：確認 process flow 描述語言、代表性站點、review rule 與 xxxTech representative flow。
- Week 3-5：建立 process flow template/instance UI 與 local data workflow。
- Week 6-8：導入 aaaTV、bbbTV sample instance，進行 simulation team trial。
- Week 9-10：integration review 試跑，收斂欄位命名與站點粒度。
- Week 11-12：整理主管報告、效益評估與下一階段 roadmap。

## 9. 成功指標

- Simulation engineer 可在 30 分鐘內由既有 process flow template 建立新 TV/Product flow skeleton。
- 任一 process station 都能查到當下 input/output state、source、assumption 與 unknown。
- xxxTech、yyyTech、zzzTech 可共用語意一致的 molding station 定義。
- Integration reviewer 可針對必要欄位留下 review status 與 comment。
- 已建立 instance 能追溯其建立時使用的流程版本。
- 至少完成一個 xxxTech process flow 與兩個 TV/Product instance 的端到端示範。

## 10. 風險與對策

- 站點粒度不一致：V1 以實際製程站點為主，不拆到過細 operation level。
- 欄位命名不一致：站點欄位需由 simulation 與 integration 共同 review，避免不同流程各自定義同名欄位。
- 版本治理成本增加：published template 不直接修改；需要變更時建立新 version，並明確選擇是否升級 instance。
- Scope 過大：V1 僅聚焦共通語言與 process-state tracking，geometry/FEM 自動化列入 roadmap。
- 資料可信度不足：每個關鍵欄位都需要 source、assumption、unknown 與 review status。
