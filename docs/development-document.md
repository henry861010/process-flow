# Process Flow PoC Development Document

## 1. 文件目的

本文件是 Process Flow PoC 下一版實作規格，對應 `docs/project-proposal.md` 中的產品目標。Proposal 說明為什麼需要這套共通語言；本文件說明工程上要如何定義資料、workflow、validation 與後續架構。

以目前 repo 狀態為準，工作區主要包含 README 與 docs，尚未包含 web app、JSON Schema 或 domain tests。本文中的 `src/`、`data/`、`tests/` 檔案皆屬 planned implementation files。

## 2. Product Shape

V1 是一個 template/instance workspace。

- Global process step template library 定義可共用 process station，例如 molding、underfill、die attach。
- Process flow template 定義封裝技術平台的標準 flow，例如 CoWoS-L，並透過 step refs 引用 global step template。
- TV/Product instance 綁定 process flow template version，例如 MI450 使用 CoWoS-L v1.0.0。
- Simulation engineer 在 instance 中填入站點 value、source、assumption、unknown 與 attachment references。
- Integration reviewer 針對 required 或 review-required fields 留下 review status 與 comment。

V1 可先用 static web app 實作，資料存在 browser `localStorage`，並提供 JSON export。這讓 PoC 在沒有 package installation、DB 或企業系統串接前，也能展示完整流程。

## 3. Core Governance Rules

- Process step template 是 global object，不屬於單一 process flow template。
- Process flow template 只定義站點引用與順序，不覆寫 field definition。
- Published template 是不可變的已發布快照；若變更會影響既有 instance 的語意、validation 結果、required 欄位、站點組成或流程順序，必須建立新 version，而不是覆寫原 version。
- Process flow instance 建立後預設鎖定建立時的 process flow template version；
- Process flow template 或 Process step template 更新時對應 instances scenario
    1. 如果屬於template補述或是bug，觸發 force update required，instance owner需要進行更新 (lazy update，使用時強制update後才可以往下面流程走)
    2. 製成優化或是更改，由process template owner選擇 force update (lazy update，使用時強制update後才可以往下面流程走) / warning optional update (跳出warning讓instance owner決定)
- Field definition 只描述欄位語意與行為；instance value field 才保存特定 TV/Product 的實際值。

## 4. Data Model

### 4.1 改善方案摘要

目前資料模型的方向正確，但有幾個地方容易讓技術開發者讀錯或實作出不一致行為：

- `inputStateFields`、`outputStateFields`、`processParameterFields` 三組 array 與 `FieldDefinition.scope` 重複表達同一件事，可能發生欄位放在 `outputStateFields` 但 `scope` 寫成 `inputState` 的矛盾。建議改成單一 `fieldDefinitions` array，並以 `scope` 作為分組依據。
- `StepValueSet` 只用 `processStepTemplateId` 與 `processStepTemplateVersion` 對應站點，若同一條 flow 重複引用同一個 step template，instance value 會無法區分是哪一次引用。建議把 `stepRefId` 提升為 `ProcessFlowTemplate.stepRefs[]` 與 `StepValueSet` 的必要欄位。
- `reviewRule` 在 `ProcessFlowTemplate` 必要欄位中被列出，但 sample JSON 沒有提供，也沒有明確行為。V1 建議先以 `FieldDefinition.reviewRequired` 作為欄位審核規則，flow-level `reviewPolicy` 保留為 optional。
- `ReviewRecord.status` 原本混合 instance workflow 狀態與 reviewer 結論。建議 instance 使用 `lifecycleStatus` 表示流程狀態，`ReviewRecord.status` 只表示 reviewer 對欄位值的結論。
- `source`、`attachmentRefs`、`reference` 這類欄位若用空字串或自由字串，後續很難驗證與搜尋。建議定義為明確的 nested structure。

### 4.2 欄位對應資料結構

下表用 `欄位 path` 讓開發者可以直接看出某個欄位屬於哪個資料結構，以及欄位值應該使用什麼資料結構或型別。

本文件中的 `ProcessFlowExport` 指 V1 JSON export root object，也就是 Target JSON Shape 的最外層物件。

| 欄位 path | 對應資料結構 | 欄位值資料結構或型別 | 說明 |
| --- | --- | --- | --- |
| `processStepTemplates` | `ProcessFlowExport` | `ProcessStepTemplate[]` | 全域 step template repository 的 export snapshot。 |
| `processFlowTemplates` | `ProcessFlowExport` | `ProcessFlowTemplate[]` | 可發布的 package technology flow templates。 |
| `processFlowInstances` | `ProcessFlowExport` | `ProcessFlowInstance[]` | TV/Product 實際填值資料。 |
| `id` | `ProcessStepTemplate` | `string` | Step template 的不可變識別碼。 |
| `version` | `ProcessStepTemplate` | `semver string` | Step template version。 |
| `name` | `ProcessStepTemplate` | `string` | 人可讀的站點名稱。 |
| `purpose` | `ProcessStepTemplate` | `string` | 站點用途與建模意義。 |
| `owner` | `ProcessStepTemplate` | `string` | 負責維護此 template 的 team 或 role。 |
| `status` | `ProcessStepTemplate` | `TemplateStatus` | `draft`、`published` 或 `deprecated`。 |
| `fieldDefinitions` | `ProcessStepTemplate` | `FieldDefinition[]` | 此站點可填寫的完整欄位定義 object list，不是 field id list。 |
| `id` | `FieldDefinition` | `string` | 欄位定義 ID，在同一個 step template version 內不可重複。 |
| `label` | `FieldDefinition` | `string` | UI 顯示名稱。 |
| `description` | `FieldDefinition` | `string` | 欄位語意說明，協助開發者與 reviewer 理解用途。 |
| `scope` | `FieldDefinition` | `FieldScope` | `inputState`、`outputState` 或 `processParameter`。 |
| `valueType` | `FieldDefinition` | `ValueType` | 欄位值的 domain 型別。 |
| `controlType` | `FieldDefinition` | `ControlType` | UI 輸入控制建議。 |
| `selectionMode` | `FieldDefinition` | `SelectionMode \| null` | 選項型 UI 的選取模式；非選項型欄位使用 `null`。 |
| `unit` | `FieldDefinition` | `string \| null` | Canonical unit；無單位欄位使用 `null`。 |
| `required` | `FieldDefinition` | `boolean` | Instance 是否必須填值或標記 unknown。 |
| `reviewRequired` | `FieldDefinition` | `boolean` | 此欄位是否需要 integration review approval。 |
| `validation` | `FieldDefinition` | `ValidationRule \| null` | integer、float、string 或 enum 的限制規則。 |
| `optionSource` | `FieldDefinition` | `OptionSource \| null` | enum/select 的選項來源。 |
| `reference` | `FieldDefinition` | `ReferenceDefinition \| null` | material、layout、geometry 等 reference 欄位的可接受來源。 |
| `derivedRule` | `FieldDefinition` | `DerivedRule \| null` | `computed` 欄位的公式與輸入欄位 metadata。 |
| `id` | `ProcessFlowTemplate` | `string` | Flow template 的不可變識別碼。 |
| `name` | `ProcessFlowTemplate` | `string` | 人可讀的封裝技術平台名稱。 |
| `version` | `ProcessFlowTemplate` | `semver string` | Flow template version。 |
| `owner` | `ProcessFlowTemplate` | `string` | 負責維護此 flow template 的 team 或 role。 |
| `status` | `ProcessFlowTemplate` | `TemplateStatus` | `draft`、`published` 或 `deprecated`。 |
| `reviewPolicy` | `ProcessFlowTemplate` | `ReviewPolicy` | Optional，flow-level 審核政策。V1 可先不使用。 |
| `stepRefs` | `ProcessFlowTemplate` | `StepRef[]` | Flow 中的站點引用清單，array order 即站點順序。 |
| `stepRefId` | `StepRef` | `string` | Flow 內單一站點引用的穩定 ID，用於 instance value 對應。 |
| `processStepTemplateId` | `StepRef` | `string` | 指向 `ProcessStepTemplate.id`。 |
| `processStepTemplateVersion` | `StepRef` | `semver string` | 指向特定 `ProcessStepTemplate.version`。 |
| `enabled` | `StepRef` | `boolean` | 此站點是否出現在此 flow template 的預設流程中。 |
| `id` | `ProcessFlowInstance` | `string` | TV/Product instance ID。 |
| `productName` | `ProcessFlowInstance` | `string` | TV/Product 名稱。 |
| `lifecycleStatus` | `ProcessFlowInstance` | `InstanceLifecycleStatus` | `draft`、`pendingIntegrationReview`、`approved` 或 `needsClarification`。 |
| `processFlowTemplateId` | `ProcessFlowInstance` | `string` | 指向 `ProcessFlowTemplate.id`。 |
| `processFlowTemplateVersion` | `ProcessFlowInstance` | `semver string` | Instance 建立時鎖定的 flow template version。 |
| `stepValueSets` | `ProcessFlowInstance` | `StepValueSet[]` | 每個 flow step ref 的實際填值集合。 |
| `stepRefId` | `StepValueSet` | `string` | 指向 `ProcessFlowTemplate.stepRefs[].stepRefId`。 |
| `processStepTemplateId` | `StepValueSet` | `string` | Denormalized snapshot，需與 `stepRefId` resolve 結果一致。 |
| `processStepTemplateVersion` | `StepValueSet` | `semver string` | Denormalized snapshot，需與 `stepRefId` resolve 結果一致。 |
| `fieldValues` | `StepValueSet` | `FieldValue[]` | 此站點的欄位值集合。 |
| `fieldId` | `FieldValue` | `string` | 指向對應 step template version 中的 `FieldDefinition.id`。 |
| `value` | `FieldValue` | `ValuePayload \| null` | 實際填值，形狀由 `FieldDefinition.valueType` 決定。 |
| `source` | `FieldValue` | `SourceReference \| null` | 欄位值來源。 |
| `assumption` | `FieldValue` | `string \| null` | 暫用假設與理由。 |
| `unknown` | `FieldValue` | `boolean` | 是否明確標記目前未知。 |
| `attachmentRefs` | `FieldValue` | `AttachmentReference[]` | 附件 reference，不保存檔案本體。 |
| `reviewRecords` | `FieldValue` | `ReviewRecord[]` | 欄位層級審核紀錄。 |
| `status` | `ReviewRecord` | `ReviewStatus` | reviewer 對該欄位值的結論。 |
| `reviewer` | `ReviewRecord` | `string` | Reviewer team、role 或 user ID。 |
| `comment` | `ReviewRecord` | `string` | 審核意見。 |
| `reviewedAt` | `ReviewRecord` | `ISO-8601 datetime string` | 審核時間。 |

### 4.3 ProcessStepTemplateLibrary

代表未來系統中的全域 process station repository/DB concept，用來儲存所有 process step template versions。它不是 instance runtime 裡必要的一個巢狀資料結構；runtime instance 只需要保存 process flow template binding，再由 template version resolve 對應的 step refs。

V1 JSON sample 可用 top-level `processStepTemplates` array 表示這個 repository 的 export snapshot：

- `processStepTemplates`

Library 中每個 step template 都是可版本化、可發佈的 canonical station definition。CoWoS-L、CoWoS-S、CoWoS-R 若使用相同 molding station，應引用同一個 molding step template version。

### 4.4 ProcessStepTemplate

代表站點層級 process step。

必要欄位：

1. `id`
2. `version`
3. `name`
4. `purpose`
5. `owner`
6. `status`
7. `fieldDefinitions`： 用於描述此process step所需要的參數有哪些，每個參數 definition 以 FieldDefinition 結構來描述，其包含 `id`、`label`、`scope`、`valueType`、`controlType` 等欄位。 
    - 此處，FieldDefinition 是直接在 fieldDefinitions 中被使用 (非透過 id 間接 ref)
    - 欄位使用 `scope` 區分語意：
      - `inputState` 描述進入此站點前，上游已形成且此站點需要知道的狀態，例如進 molding 前的 stack thickness、die placement state、substrate warpage baseline。它不是此站點產生的結果，也不是此站點的 recipe parameter。
      - `outputState` 描述該站點完成後形成的 package/process state。
      - `processParameter` 描述影響該站點結果的 process parameters 或 recipe choices。

典型 step template 例子：

1. Molding / Encapsulation：描述 mold compound、mold thickness、cure condition。
2. Underfill：描述 underfill material、dispense pattern、cure profile。
3. Die attach：描述 attach material、bondline thickness、placement condition。

當 step template 的欄位、parameter 或行為不同時，應建立新的 process step template version。例如 molding 需要新增 molding-specific parameter 時，應新增 molding step template version，而不是在某個 process flow template 中 local override。

### 4.5 FieldDefinition

代表 step template 中的欄位定義。`FieldDefinition` 只描述欄位語意、資料型別、輸入控制、限制與 review requirement，不保存任何 TV/Product instance 的實際值。

欄位與行為規則：

1. `id`：欄位定義 ID，在同一個 step template version 內不可重複。
2. `label`：UI 顯示名稱，給 simulation engineer 與 reviewer 閱讀。
3. `description`：欄位語意說明，應描述這個欄位代表什麼 process state 或 parameter、何時使用、避免哪些誤解。
4. `scope`：欄位在站點中的語意分組。支援值為 `inputState`、`outputState`、`processParameter`。
5. `valueType`：欄位值的 domain 型別，定義 instance value 可接受的資料形態。支援值為 `string`、`integer`、`float`、`boolean`、`enum`、`material`、`layoutReference`、`geometryReference`。
6. `controlType`：UI 應使用的輸入控制。支援值為 `text`、`number`、`checkbox`、`select`、`referenceSelect`、`computed`。
7. `selectionMode`：選項型 UI 的選取模式。`checkbox`、`select`、`referenceSelect` 可使用 `single` 或 `multiple`；非選項型欄位使用 `null` 或省略。
8. `unit`：欄位的 canonical unit；`integer` 或 `float` 欄位若有單位應使用此欄位，無單位欄位使用 `null`，不要使用空字串。
9. `required`：instance 是否必須提供此欄位的 value 或明確標記 `unknown: true`。
10. `reviewRequired`：此欄位是否需要 integration reviewer approval 才算完成。
11. `validation`：欄位限制規則，例如 `min`、`max`、`exclusiveMin`、`exclusiveMax`、`regex`、`maxLength`、`allowedUnits`。
12. `optionSource`：`enum` 或 select 類欄位的選項來源，可為 static options 或外部 DB/API reference。
13. `reference`：`material`、`layoutReference`、`geometryReference` 等 reference 類欄位的外部來源 metadata；V1 不直接串接公司系統。
14. `derivedRule`：`computed` 欄位的計算規則。V1 PoC 會在前端依 `derivedRule` 計算結果，但只支援受限公式語法，不執行任意 JavaScript。

Control type behavior：

| `controlType` | UI 行為 | 建議搭配 `valueType` | 必要或常用設定 |
| --- | --- | --- | --- |
| `text` | 文字輸入框，只能輸入文字。 | `string` | 可用 `validation.regex`、`minLength`、`maxLength` 限制格式與長度。 |
| `number` | 數字輸入框。 | `integer` 或 `float` | `integer` 不允許小數；`float` 可允許小數。用 `validation` 控制範圍。 |
| `checkbox` | 多個核取方塊直接展開在畫面上。 | `boolean` 或 `enum` | 單一 yes/no checkbox 使用 `boolean`；多選項 checkbox 使用 `enum`、`selectionMode` 與 `optionSource.options`。 |
| `select` | 下拉選單或 compact list。 | `enum` | 使用 `selectionMode` 控制單選或多選，選項放在 `optionSource.options`。 |
| `referenceSelect` | 從外部 DB/ref 來源挑選 entity。 | `material`、`layoutReference`、`geometryReference` | 使用 `reference` 描述來源，V1 UI 可用 `reference.mockOptions` 模擬外部選項。 |
| `computed` | 唯讀計算結果，由前端依公式更新。 | `integer`、`float`、`string`、`boolean` | 必須提供 `derivedRule`。Instance value 由系統計算，不由使用者手動輸入。 |

Numeric validation 使用 `min`、`max`、`exclusiveMin`、`exclusiveMax` 表達大小限制：

| 語意 | `validation` |
| --- | --- |
| `> 0` | `{ "min": 0, "exclusiveMin": true }` |
| `>= 0` | `{ "min": 0 }` |
| `< 0` | `{ "max": 0, "exclusiveMax": true }` |
| `<= 0` | `{ "max": 0 }` |

Option source 規則：

- `checkbox` 與 `select` 若有多個可選項，應使用 `optionSource.options`。
- 每個 option 必須有唯一 `value`，並應提供給 UI 顯示的 `label`。
- `selectionMode: "single"` 時，instance `value` 保存單一 option value。
- `selectionMode: "multiple"` 時，instance `value` 保存 option value array。

Reference select 規則：

- `reference` 描述外部來源，例如 material DB、layout repository 或 geometry library。
- V1 前端 PoC 不需要真的串接外部 DB，但應在 `reference.mockOptions` 放可選假資料，讓 UI 可展示選擇流程。
- `selectionMode: "single"` 時，instance `value` 保存單一 `ReferenceValue`。
- `selectionMode: "multiple"` 時，instance `value` 保存 `ReferenceValue[]`。

Computed field 規則：

- `controlType: "computed"` 的欄位必須提供 `derivedRule`。
- V1 使用受限公式表示法：`expression` 可引用 `inputs[].alias`，支援 `+`、`-`、`*`、`/`、括號，以及白名單函數 `min`、`max`、`abs`、`round`。
- `derivedRule.inputs[]` 每一筆需定義 `fieldId` 與公式中使用的 `alias`。
- 前端 PoC 應在 input field 改變時重新計算 computed field，並將計算結果寫入 export JSON 的 `FieldValue.value`。

`ValuePayload` 的形狀由 `valueType` 決定：

| `valueType` | `selectionMode` | `ValuePayload` |
| --- | --- | --- |
| `string` | N/A | `string` |
| `integer` | N/A | `number`，但不可有小數。 |
| `float` | N/A | `number`，可有小數。 |
| `boolean` | N/A | `boolean` |
| `enum` | `single` 或 N/A | `string`，必須存在於 `optionSource.options[].value`。 |
| `enum` | `multiple` | `string[]`，每個值都必須存在於 `optionSource.options[].value`。 |
| `material` | `single` 或 N/A | `ReferenceValue` |
| `material` | `multiple` | `ReferenceValue[]` |
| `layoutReference` | `single` 或 N/A | `ReferenceValue` |
| `layoutReference` | `multiple` | `ReferenceValue[]` |
| `geometryReference` | `single` 或 N/A | `ReferenceValue` |
| `geometryReference` | `multiple` | `ReferenceValue[]` |

### 4.6 ProcessFlowTemplate

代表封裝技術平台的標準 process flow。

必要欄位：

- `id`
- `name`
- `version`
- `owner`
- `status`
- `stepRefs`

`id` 是系統識別碼、DB key 或不可變 reference key，用於 API、instance binding 與資料庫關聯，例如 `flow_tpl_cowos_l`。`name` 是人可讀的 package technology name，例如 `CoWoS-L`。UI、報表與 reviewer 溝通應顯示 `name`，但資料關聯應使用 `id`。

Process flow template 不儲存 TV/Product 實際 value，也不直接定義欄位；它只引用 global step template 並決定站點順序。

`stepRefs` 代表 process flow template 對 global step template 的引用清單。每一筆 `stepRefs[]` item 包含：

- `stepRefId`：此 process step 在此 prcess flow template 中的 ID
- `processStepTemplateId`：引用 process step template 的 global ID
- `processStepTemplateVersion`
- `enabled`

`stepRefs[]` array order 代表 process flow 的站點順序。`stepRefId` 是 flow 內穩定 reference，用於 instance value set、diff、migration 與 UI anchor；排序仍以 array order 為準。刪除或插入前段 step 時，不需要重排後續 step 的 numeric sort key。

`reviewPolicy` 是 optional flow-level policy。V1 可先不啟用，欄位是否需要審核主要由 `FieldDefinition.reviewRequired` 決定。

### 4.7 ProcessFlowInstance

代表特定 TV/Product 的 process flow。

必要欄位：

- `id`
- `productName`
- `lifecycleStatus`
- `processFlowTemplateId`
- `processFlowTemplateVersion`
- `stepValueSets`

必要設計：

- `processFlowTemplateId` 與 `processFlowTemplateVersion` 必須保存，且 `processFlowTemplateId` 指向 `ProcessFlowTemplate.id`。
- Instance 建立後鎖定 process flow template version。
- Process flow template 更新不自動改變既有 instance。
- Instance 不是永遠不能升級；未來若要升級 process flow template，需增加 owner 觸發的 explicit migration/review workflow。
- V1 PoC 不實作 migration assistant，只保存 template version lock 並定義未來 migration 方向。
- Migration workflow 應讓 owner 選擇保留舊版、升級到新版，或批次強制升級但需 review/確認。
- 批次強制升級仍然是 migration，不是靜默改寫既有 instance binding。即使是 bug fix 或補述，也應留下 migration/review 記錄。
- 只有純文字 typo、描述補充，且不影響 validation、required 狀態或資料解讀時，才可考慮 metadata-level correction。

### 4.8 StepValueSet and FieldValue

`StepValueSet` 代表某個 step ref 在 instance 中的實際填值集合。Step value set 只屬於某個 `ProcessFlowInstance`，不回寫 global step template 或 process flow template。

每個 `StepValueSet` 包含：

- `stepRefId`
- `processStepTemplateId`
- `processStepTemplateVersion`
- `fieldValues`

`stepRefId` 必須對應到 instance 綁定的 `ProcessFlowTemplate.stepRefs[].stepRefId`。`processStepTemplateId` 與 `processStepTemplateVersion` 是 export/debug 用的 denormalized snapshot，必須與 `stepRefId` resolve 結果一致。

`FieldValue.fieldId` 不是指向 global field definition library，而是指向該 `StepValueSet.stepRefId` resolve 出來的 step template version 內的 `fieldDefinitions[].id`。

每個 `FieldValue` 包含：

- `fieldId`
- `value`
- `source`
- `assumption`
- `unknown`
- `attachmentRefs`
- `reviewRecords`

Field value 行為：

- `fieldId` 必須對應到該 step template version 中存在的 `FieldDefinition.id`。
- `value` 必須符合對應 `FieldDefinition` 的 `valueType`、`controlType`、`unit`、`validation`、`optionSource` 與 `reference` 規則。
- `unknown: true` 表示目前值未知；此時 `value` 必須為 `null` 或不存在，但仍應保留 `source`、`assumption` 或 reviewer comment 說明未知原因。
- `assumption` 表示暫用假設，不等於已確認規格，也不等於 integration approval。
- `source` 記錄 value 來源，例如 spec、integration note、manual input、material DB reference 或 layout/geometry reference。
- `attachmentRefs` 只保存附件 reference；V1 不處理附件檔案本體。
- `reviewRecords` 保存 integration review status、reviewer、comment 與時間戳。

### 4.9 Supporting Nested Structures

`ReviewPolicy` 描述 optional flow-level review policy。V1 可先不啟用，若啟用建議只放跨欄位規則，例如：

- `requiredFieldsNeedApproval`
- `unknownRequiresComment`

`ReferenceDefinition` 描述欄位允許引用的外部資料來源：

- `sourceType`：例如 `dbReference`、`fileReference`、`manualReference`。
- `sourceId`：例如 `material_db`、`layout_repo`。
- `entityType`：例如 `mold_compound`、`layout_block`、`geometry_feature`。
- `mockOptions`：V1 UI 用的假資料選項，格式為 `ReferenceValue[]`。正式串接外部 DB 後可由 API hydration 取代。

`OptionSource` 描述 checkbox/select 的選項來源：

- `type`：`static` 或 `externalReference`。
- `options`：static options array；每筆 option 至少包含 `value` 與 `label`。
- `sourceId`：當 `type` 是 `externalReference` 時，描述選項來源 ID。

`ReferenceValue` 描述 instance 實際引用到的外部 entity：

- `referenceType`：例如 `material`、`layout`、`geometry`。
- `sourceId`
- `entityType`
- `entityId`
- `displayName`

`SourceReference` 描述欄位值從哪裡來：

- `type`：例如 `spec`、`integrationNote`、`manualInput`、`materialDb`、`computed`。
- `ref`
- `label`

`AttachmentReference` 描述附件 reference：

- `type`：例如 `document`、`image`、`layoutFile`。
- `ref`
- `label`

`DerivedRule` 描述 computed field 的公式：

- `calculationType`：V1 使用 `formula`。
- `expression`：受限公式字串，只可引用 `inputs[].alias`。
- `inputs`：公式輸入欄位，每筆包含 `fieldId` 與 `alias`。
- `outputValueType`：公式輸出型別，例如 `integer` 或 `float`。
- `unit`：公式輸出單位。
- `recompute`：V1 使用 `onInputChange`，代表輸入值變動時重新計算。

Supporting enum values：

- `TemplateStatus`：`draft`、`published`、`deprecated`。
- `FieldScope`：`inputState`、`outputState`、`processParameter`。
- `ValueType`：`string`、`integer`、`float`、`boolean`、`enum`、`material`、`layoutReference`、`geometryReference`。
- `ControlType`：`text`、`number`、`checkbox`、`select`、`referenceSelect`、`computed`。
- `SelectionMode`：`single`、`multiple`。
- `InstanceLifecycleStatus`：`draft`、`pendingIntegrationReview`、`approved`、`needsClarification`。

### 4.10 ReviewRecord

代表 integration review 紀錄。`ReviewRecord.status` 只表示 reviewer 對欄位值的結論，不代表整個 instance lifecycle。

狀態：

- `approved`
- `needsClarification`
- `rejected`
- `waived`

## 5. Target JSON Shape

```json
{
  "processStepTemplates": [
    {
      "id": "step_tpl_molding_encapsulation",
      "version": "1.0.0",
      "name": "Molding / Encapsulation",
      "purpose": "Define molded package state for downstream warpage and stress analysis.",
      "owner": "integration.platform",
      "status": "published",
      "fieldDefinitions": [
        {
          "id": "pre_mold_thickness",
          "label": "Pre-mold stack thickness",
          "description": "Total stack thickness before molding starts. Used as the incoming package state for mold thickness and warpage review.",
          "scope": "inputState",
          "valueType": "float",
          "controlType": "number",
          "unit": "um",
          "required": true,
          "reviewRequired": true,
          "validation": {
            "min": 0,
            "max": 2000
          }
        },
        {
          "id": "mold_material",
          "label": "Mold compound",
          "description": "Mold compound used by this molding station. The value should point to a material reference, not a free-text material name.",
          "scope": "outputState",
          "valueType": "material",
          "controlType": "referenceSelect",
          "selectionMode": "single",
          "unit": null,
          "required": true,
          "reviewRequired": true,
          "reference": {
            "sourceType": "dbReference",
            "sourceId": "material_db",
            "entityType": "mold_compound",
            "mockOptions": [
              {
                "referenceType": "material",
                "sourceId": "material_db",
                "entityType": "mold_compound",
                "entityId": "MC-001",
                "displayName": "Baseline low-warpage mold compound"
              },
              {
                "referenceType": "material",
                "sourceId": "material_db",
                "entityType": "mold_compound",
                "entityId": "MC-002",
                "displayName": "High modulus mold compound"
              }
            ]
          }
        },
        {
          "id": "mold_thickness",
          "label": "Mold thickness",
          "description": "Final molded thickness after this station. Used by downstream warpage, stress, and package outline assumptions.",
          "scope": "outputState",
          "valueType": "float",
          "controlType": "number",
          "unit": "um",
          "required": true,
          "reviewRequired": true,
          "validation": {
            "min": 0,
            "max": 2000
          }
        },
        {
          "id": "mold_cure_condition",
          "label": "Mold cure condition",
          "description": "Named cure condition or recipe family used by this molding station.",
          "scope": "processParameter",
          "valueType": "enum",
          "controlType": "select",
          "selectionMode": "single",
          "unit": null,
          "required": false,
          "reviewRequired": false,
          "optionSource": {
            "type": "static",
            "options": [
              {
                "value": "baseline",
                "label": "Baseline"
              },
              {
                "value": "low-warpage",
                "label": "Low warpage"
              },
              {
                "value": "high-temperature",
                "label": "High temperature"
              }
            ]
          }
        },
        {
          "id": "mold_risk_flags",
          "label": "Mold risk flags",
          "description": "Visible checkbox group for risk tags that should be considered during integration review.",
          "scope": "processParameter",
          "valueType": "enum",
          "controlType": "checkbox",
          "selectionMode": "multiple",
          "unit": null,
          "required": false,
          "reviewRequired": false,
          "optionSource": {
            "type": "static",
            "options": [
              {
                "value": "void_risk",
                "label": "Void risk"
              },
              {
                "value": "cte_mismatch",
                "label": "CTE mismatch"
              },
              {
                "value": "cure_profile_open",
                "label": "Cure profile not finalized"
              }
            ]
          }
        },
        {
          "id": "mold_process_note",
          "label": "Mold process note",
          "description": "Free-text note for context that does not fit a structured option.",
          "scope": "processParameter",
          "valueType": "string",
          "controlType": "text",
          "unit": null,
          "required": false,
          "reviewRequired": false,
          "validation": {
            "maxLength": 500
          }
        },
        {
          "id": "post_mold_stack_thickness",
          "label": "Post-mold stack thickness",
          "description": "Computed stack thickness after molding, calculated from pre-mold stack thickness and mold thickness.",
          "scope": "outputState",
          "valueType": "float",
          "controlType": "computed",
          "unit": "um",
          "required": false,
          "reviewRequired": false,
          "validation": {
            "min": 0,
            "max": 4000
          },
          "derivedRule": {
            "calculationType": "formula",
            "expression": "preMoldThickness + moldThickness",
            "inputs": [
              {
                "fieldId": "pre_mold_thickness",
                "alias": "preMoldThickness"
              },
              {
                "fieldId": "mold_thickness",
                "alias": "moldThickness"
              }
            ],
            "outputValueType": "float",
            "unit": "um",
            "recompute": "onInputChange"
          }
        }
      ]
    }
  ],
  "processFlowTemplates": [
    {
      "id": "flow_tpl_cowos_l",
      "name": "CoWoS-L",
      "version": "1.0.0",
      "owner": "integration.platform",
      "status": "published",
      "stepRefs": [
        {
          "stepRefId": "cowos_l_molding_encapsulation",
          "processStepTemplateId": "step_tpl_molding_encapsulation",
          "processStepTemplateVersion": "1.0.0",
          "enabled": true
        }
      ]
    }
  ],
  "processFlowInstances": [
    {
      "id": "inst_mi450",
      "productName": "MI450",
      "lifecycleStatus": "pendingIntegrationReview",
      "processFlowTemplateId": "flow_tpl_cowos_l",
      "processFlowTemplateVersion": "1.0.0",
      "stepValueSets": [
        {
          "stepRefId": "cowos_l_molding_encapsulation",
          "processStepTemplateId": "step_tpl_molding_encapsulation",
          "processStepTemplateVersion": "1.0.0",
          "fieldValues": [
            {
              "fieldId": "pre_mold_thickness",
              "value": 450.5,
              "source": {
                "type": "spec",
                "ref": "MI450 pre-mold stack v0.2",
                "label": "MI450 pre-mold stack v0.2"
              },
              "assumption": null,
              "unknown": false,
              "attachmentRefs": [],
              "reviewRecords": [
                {
                  "status": "approved",
                  "reviewer": "integration.platform",
                  "comment": "Pre-mold stack baseline confirmed for PoC sample.",
                  "reviewedAt": "2026-05-13T08:55:00+08:00"
                }
              ]
            },
            {
              "fieldId": "mold_material",
              "value": {
                "referenceType": "material",
                "sourceId": "material_db",
                "entityType": "mold_compound",
                "entityId": "MC-001",
                "displayName": "Baseline low-warpage mold compound"
              },
              "source": {
                "type": "materialDb",
                "ref": "material_db:MC-001",
                "label": "Material DB MC-001"
              },
              "assumption": null,
              "unknown": false,
              "attachmentRefs": [],
              "reviewRecords": [
                {
                  "status": "approved",
                  "reviewer": "integration.platform",
                  "comment": "Material reference matches current integration baseline.",
                  "reviewedAt": "2026-05-13T09:00:00+08:00"
                }
              ]
            },
            {
              "fieldId": "mold_thickness",
              "value": 750.25,
              "source": {
                "type": "spec",
                "ref": "MI450 package outline v0.3",
                "label": "MI450 package outline v0.3"
              },
              "assumption": null,
              "unknown": false,
              "attachmentRefs": [],
              "reviewRecords": [
                {
                  "status": "approved",
                  "reviewer": "integration.platform",
                  "comment": "Aligned with current package outline.",
                  "reviewedAt": "2026-05-13T09:10:00+08:00"
                }
              ]
            },
            {
              "fieldId": "mold_cure_condition",
              "value": "baseline",
              "source": {
                "type": "integrationNote",
                "ref": "MI450 molding integration note",
                "label": "MI450 molding integration note"
              },
              "assumption": null,
              "unknown": false,
              "attachmentRefs": [],
              "reviewRecords": []
            },
            {
              "fieldId": "mold_risk_flags",
              "value": ["void_risk", "cure_profile_open"],
              "source": {
                "type": "manualInput",
                "ref": "simulation-review-session",
                "label": "Simulation review session"
              },
              "assumption": "Cure profile is still under review; risk flags should be revisited before final approval.",
              "unknown": false,
              "attachmentRefs": [],
              "reviewRecords": []
            },
            {
              "fieldId": "mold_process_note",
              "value": "Use current CoWoS-L baseline molding recipe until integration publishes the final cure profile.",
              "source": {
                "type": "manualInput",
                "ref": "simulation-engineer-note",
                "label": "Simulation engineer note"
              },
              "assumption": null,
              "unknown": false,
              "attachmentRefs": [],
              "reviewRecords": []
            },
            {
              "fieldId": "post_mold_stack_thickness",
              "value": 1200.75,
              "source": {
                "type": "computed",
                "ref": "derivedRule:post_mold_stack_thickness",
                "label": "Computed from pre-mold stack thickness and mold thickness"
              },
              "assumption": null,
              "unknown": false,
              "attachmentRefs": [],
              "reviewRecords": []
            }
          ]
        }
      ]
    }
  ]
}
```

## 6. Target UI Workflow

1. 使用者選擇 process flow template。
2. 使用者選擇或建立 TV/Product instance。
3. 系統依 process flow template `stepRefs` resolve global step template，並自動產生站點 timeline。
4. 使用者選擇 process step。
5. 使用者依 `FieldDefinition.scope` 填入 input state、output state、process parameter。
6. UI 依 `controlType` render text、number、checkbox、select、referenceSelect 或 computed 欄位。
7. `referenceSelect` 在 V1 使用 `reference.mockOptions` 展示假資料選項。
8. `computed` 欄位在 inputs 改變時由前端 PoC 重新計算並更新顯示值。
9. 每個欄位可補上 source、assumption、unknown、attachment references。
10. Integration reviewer 對欄位設定 review status 與 comment。
11. 使用者可 export JSON 作為 PoC 交換格式。

## 7. Target Validation Rules

- Process step template 必須有 `id`、`version`、`name`、`status` 與 `fieldDefinitions`。
- Process flow template 必須有 `id`、`name`、`version`、`status`、`stepRefs`。
- Process flow template 的 `stepRefs` 必須指向存在的 published process step template version。
- Process flow template 的每個 `stepRefs[]` item 必須有唯一的 `stepRefId`。
- Process flow template 的站點順序以 `stepRefs[]` array order 為準，不要求額外 numeric ordering field。
- `ProcessStepTemplate.fieldDefinitions` 必須是完整 `FieldDefinition[]`，不可只放 field id string array。
- Field id 在同一 process step template version 的 `fieldDefinitions` 中不可重複。
- Field scope 必須屬於 `inputState`、`outputState`、`processParameter`。
- Field value type 必須屬於支援清單。
- Field control type 必須與 value type 相容。
- `controlType: "number"` 必須搭配 `valueType: "integer"` 或 `valueType: "float"`。
- Integer field value 不可有小數；float field value 可有小數。
- Integer/float field value 必須符合 validation `min`、`max`、`exclusiveMin`、`exclusiveMax` 與 `allowedUnits`。
- Static enum field value 必須符合 `optionSource.options[].value`；`selectionMode: "multiple"` 時，每一個 array item 都必須符合。
- `checkbox`、`select`、`referenceSelect` 若提供多個選項，必須明確設定 `selectionMode`。
- `referenceSelect` 欄位在 PoC 階段可使用 `reference.mockOptions` 模擬外部 DB/ref options。
- DB reference field 在 PoC 階段只驗證 reference metadata 與 mock option shape，不驗證 DB entity 是否真實存在。
- Computed field 必須有 `derivedRule`；V1 只允許受限公式語法，不執行任意 JavaScript。
- Computed field value 必須由前端 PoC 根據 `derivedRule.inputs` 與 `derivedRule.expression` 重新計算。
- Instance 必須綁定正確 `processFlowTemplateId` 與 `processFlowTemplateVersion`。
- Instance 的 `stepValueSets[].stepRefId` 必須存在於綁定的 process flow template version。
- Step value set 的 `processStepTemplateId` 與 `processStepTemplateVersion` 必須與 `stepRefId` resolve 結果一致。
- Value field 的 `fieldId` 必須存在於對應 step template version 的 `fieldDefinitions`。
- Value field 的 resolve path 是 `ProcessFlowInstance.stepValueSets[].stepRefId` -> `ProcessFlowTemplate.stepRefs[]` -> `ProcessStepTemplate.version` -> `fieldDefinitions[].id`。
- Required field 若未填且未標記 `unknown: true`，會被列為 validation issue。
- `unknown: true` 時，`value` 必須為 `null` 或不存在，且至少要有 `source`、`assumption` 或 review comment 說明原因。
- Reference value 必須符合 `ReferenceValue` 形狀，且其 `sourceId`、`entityType` 必須符合 `FieldDefinition.reference`。
- Review-required field 必須有 approved review record 才算完成。

## 8. Planned Implementation Files

目前 repo 尚未包含實作檔案。建議下一版建立以下檔案：

- `src/domain.js`：domain model、instance generation、validation、computed formula evaluation、completion summary。
- `src/sample-data.js`：CoWoS-L process flow template、controlType examples、mock reference options 與 MI450/GR100 sample instance。
- `src/app.js`：static UI state management、controlType rendering、computed field recompute 與 editing workflow。
- `src/styles.css`：operational workspace style。
- `data/process-flow.schema.json`：JSON Schema for the PoC data contract。
- `tests/domain.test.js`：domain behavior tests。

## 9. Future Architecture

若 PoC 通過，下一階段可演進為 client/server 架構。

建議 backend API：

- `GET /process-step-templates`
- `POST /process-step-templates`
- `GET /process-step-templates/:id/versions/:version`
- `GET /process-flow-templates`
- `POST /process-flow-templates`
- `GET /process-flow-templates/:id/versions/:version`
- `POST /process-flow-templates/:id/instances`
- `GET /instances/:id`
- `PATCH /instances/:id/step-refs/:stepRefId/fields/:fieldId`
- `POST /instances/:id/reviews`
- `POST /instances/:id/export`

建議資料庫表：

- `process_step_templates`
- `process_step_template_versions`
- `process_flow_template_step_refs`
- `process_flow_templates`
- `process_flow_template_versions`
- `field_definitions`
- `field_option_sources`
- `flow_instances`
- `step_value_sets`
- `field_values`
- `review_records`

## 10. Target Acceptance Criteria

- 可建立 global molding process step template。
- CoWoS-L、CoWoS-S、CoWoS-R 可引用同一個 molding step template version。
- 可建立 CoWoS-L process flow template，並由 stepRefs resolve 出完整 flow。
- 每個 step ref 都有穩定 `stepRefId`，instance value 可正確對應到 flow 中的站點引用。
- 可由 CoWoS-L process flow template 建立 MI450 與 GR100 instance。
- Instance 建立後保留 process flow template version lock。
- 使用者可在 UI 中依 `controlType` 填寫 text、number、checkbox、select、referenceSelect value。
- Reference select 可使用 mock external options 展示外部 DB/ref 選項。
- Computed field 可在 inputs 改變時自動重新計算。
- 使用者可在 UI 中填寫站點 value、source、assumption、unknown。
- Molding thickness 等 numeric 欄位可驗證 range。
- Mold compound 等 material 欄位可保存 material DB reference metadata。
- 使用者可看到 required field completion 與 required field approval progress。
- Domain tests 通過。

## 11. Roadmap

- Owner-triggered process flow template version migration assistant，支援保留舊版、升級新版與批次強制升級 review。
- Process step template version migration assistant，支援欄位差異、validation 差異與 instance value migration review。
- Field-level permission and reviewer identity。
- Company material DB reference integration and option hydration。
- Derived/function parameter execution after schema stabilizes。
- Layout and geometry reference preview。
- Process-state diff between TV/Product instances under the same process flow template。
- Simplified 2D cross-section preview.
- FEM preprocessing export after process-state schema is stable.
