# Process Flow PoC Development Document

## 1. 文件目的

本文件是 Process Flow PoC 下一版實作規格，對應 `docs/project-proposal.md` 中的產品目標。Proposal 說明為什麼需要這套共通語言；本文件說明工程上要如何定義資料、workflow、validation 與後續架構。

以目前 repo 狀態為準，工作區主要包含 README 與 docs，尚未包含 web app、JSON Schema 或 domain tests。本文中的 `src/`、`data/`、`tests/` 檔案皆屬 planned implementation files。

## 2. Product Shape

V1 是一個 template/instance workspace。

- Global process step template library 定義可共用 process station，例如 molding、underfill、die attach。
- Process flow template 定義封裝技術平台的標準 flow，例如 CoWoS-L，並透過 step refs 引用 global step template。
- TV/Product instance 綁定 process flow template version，例如 MI450 使用 CoWoS-L v1.0.0。
- Simulation engineer 在 instance 中填入站點 value、source、assumption、unknown 與 attachment reference。
- Integration reviewer 針對 required 或 review-required fields 留下 review status 與 comment。

V1 可先用 static web app 實作，資料存在 browser `localStorage`，並提供 JSON export。這讓 PoC 在沒有 package installation、DB 或企業系統串接前，也能展示完整流程。

## 3. Core Governance Rules

- Process step template 是 global object，不屬於單一 process flow template。
- Process flow template 只定義站點引用與順序，不覆寫 field definition。
- Published template 是不可變的已發布快照；若變更會影響既有 instance 的語意、validation 結果、required 欄位、站點組成或流程順序，必須建立新 version，而不是覆寫原 version。
- Process flow instance 建立後預設鎖定建立時的 process flow template version；template 更新不自動套用到既有 instance。
- 強制套用新版 template 不應是靜默改寫既有 instance；未來若需要批次升級，必須透過 explicit migration/review workflow 留下紀錄。
- Field definition 只描述欄位語意與行為；instance value field 才保存特定 TV/Product 的實際值。
- V1 以站點層級為主，避免過早拆成過細的 physical operation。

## 4. Data Model

### 4.1 ProcessStepTemplateLibrary

代表未來系統中的全域 process station repository/DB concept，用來儲存所有 process step template versions。它不是 instance runtime 裡必要的一個巢狀資料結構；runtime instance 只需要保存 process flow template binding，再由 template version resolve 對應的 step refs。

V1 JSON sample 可用 top-level `processStepTemplates` array 表示這個 repository 的 export snapshot：

- `processStepTemplates`

Library 中每個 step template 都是可版本化、可發佈的 canonical station definition。CoWoS-L、CoWoS-S、CoWoS-R 若使用相同 molding station，應引用同一個 molding step template version。

### 4.2 ProcessStepTemplate

代表站點層級 process step。

必要欄位：

- `id`
- `version`
- `name`
- `purpose`
- `owner`
- `status`
- `inputStateFields`
- `outputStateFields`
- `processParameterFields`

`inputStateFields` 描述進入此站點前，上游已形成且此站點需要知道的狀態，例如進 molding 前的 stack thickness、die placement state、substrate warpage baseline。它不是此站點產生的結果，也不是此站點的 recipe parameter。`outputStateFields` 描述該站點完成後形成的狀態，`processParameterFields` 描述影響該站點結果的 process parameters。

典型 step template 例子：

- Molding / Encapsulation：描述 mold compound、mold thickness、cure condition。
- Underfill：描述 underfill material、dispense pattern、cure profile。
- Die attach：描述 attach material、bondline thickness、placement condition。

當 step template 的欄位、parameter 或行為不同時，應建立新的 process step template version。例如 molding 需要新增 molding-specific parameter 時，應新增 molding step template version，而不是在某個 process flow template 中 local override。

### 4.3 ProcessFlowTemplate

代表封裝技術平台的標準 process flow。

必要欄位：

- `id`
- `name`
- `version`
- `owner`
- `status`
- `reviewRule`
- `stepRefs`

`id` 是系統識別碼、DB key 或不可變 reference key，用於 API、instance binding 與資料庫關聯，例如 `flow_tpl_cowos_l`。`name` 是人可讀的 package technology name，例如 `CoWoS-L`。UI、報表與 reviewer 溝通應顯示 `name`，但資料關聯應使用 `id`。

Process flow template 不儲存 TV/Product 實際 value，也不直接定義欄位；它只引用 global step template 並決定站點順序。

`stepRefs` 代表 process flow template 對 global step template 的引用清單。每一筆 `stepRefs[]` item 包含：

- `processStepTemplateId`
- `processStepTemplateVersion`
- `enabled`

`stepRefs[]` array order 代表 process flow 的站點順序。刪除或插入前段 step 時，不需要重排後續 step 的 numeric sort key。若未來需要穩定識別某個 step ref，可另加 optional `stepRefId`，用於 instance value set、diff、migration 或 UI anchor；排序仍以 array order 為準。

### 4.4 FieldDefinition

代表 step template 中的欄位定義。`FieldDefinition` 只描述欄位語意、資料型別、輸入控制、限制與 review requirement，不保存任何 TV/Product instance 的實際值。

主要欄位：

- `id`
- `label`
- `scope`
- `valueType`
- `controlType`
- `unit`
- `required`
- `reviewRequired`
- `validation`
- `optionSource`
- `reference`
- `derivedRule`





Field behavior 規則：

- `valueType` 定義可接受的資料形態，例如 number、enum、material reference。
  - 支援的 `valueType`：
    - `string`
    - `number`
    - `boolean`
    - `enum`
    - `material`
    - `layoutReference`
    - `geometryReference`
- `controlType` 定義 UI 應使用的輸入控制，例如 number input、select 或 reference select。
  - 支援的 `controlType`：
    - `text`
    - `number`
    - `checkbox`
    - `select`
    - `referenceSelect`
    - `computed`
- `unit` 定義該欄位的 canonical unit；instance value 若帶單位，必須與 `unit` 或 `validation.allowedUnits` 相容。
- `required` 定義 instance 是否必須提供此欄位的 value 或明確標記 unknown。
- `reviewRequired` 定義此欄位是否需要 integration reviewer approval 才算完成。
- `validation` 描述限制，例如 `min`、`max`、`integerOnly`、`regex`、`allowedUnits`。
- `optionSource` 描述選項來源，可為 static options 或外部 DB/API reference。
- `reference` 描述 material、layout、geometry 等外部 reference metadata；V1 不直接串接公司系統。
- `derivedRule` 描述 derived/function 類參數；V1 只保存 `functionName`、`inputs`、`outputType`，不執行真實計算。

### 4.5 ProcessFlowInstance

代表特定 TV/Product 的 process flow。

必要設計：

- `processFlowTemplateId` 與 `processFlowTemplateVersion` 必須保存，且 `processFlowTemplateId` 指向 `ProcessFlowTemplate.id`。
- Instance 建立後鎖定 process flow template version。
- Process flow template 更新不自動改變既有 instance。
- Instance 不是永遠不能升級；未來若要升級 process flow template，需增加 owner 觸發的 explicit migration/review workflow。
- V1 PoC 不實作 migration assistant，只保存 template version lock 並定義未來 migration 方向。
- Migration workflow 應讓 owner 選擇保留舊版、升級到新版，或批次強制升級但需 review/確認。
- 批次強制升級仍然是 migration，不是靜默改寫既有 instance binding。即使是 bug fix 或補述，也應留下 migration/review 記錄。
- 只有純文字 typo、描述補充，且不影響 validation、required 狀態或資料解讀時，才可考慮 metadata-level correction。

### 4.6 StepValueSet and Value Field

`StepValueSet` 代表某個 step 在 instance 中的實際填值集合。Step value set 只屬於某個 `ProcessFlowInstance`，不回寫 global step template 或 process flow template。

若同一個 process flow template 未來需要多次引用同一個 step template，可在 `stepRefs[]` 與 `StepValueSet` 增加 `stepRefId` 作為穩定 reference；站點排序仍由 `stepRefs[]` array order 決定。

每個 value field 包含：

- `fieldId`
- `value`
- `source`
- `assumption`
- `unknown`
- `attachmentRef`
- `reviewRecords`

Value field 行為：

- `fieldId` 必須對應到該 step template version 中存在的 `FieldDefinition.id`。
- `value` 必須符合對應 `FieldDefinition` 的 `valueType`、`controlType`、`unit`、`validation`、`optionSource` 與 `reference` 規則。
- `unknown: true` 表示目前值未知；此時 `value` 可為空，但仍應保留 `source`、`assumption` 或 reviewer comment 說明未知原因。
- `assumption` 表示暫用假設，不等於已確認規格，也不等於 integration approval。
- `source` 記錄 value 來源，例如 spec、integration note、manual input、material DB reference 或 layout/geometry reference。
- `attachmentRef` 只保存附件 reference；V1 不處理附件檔案本體。
- `reviewRecords` 保存 integration review status、reviewer、comment 與時間戳。

### 4.7 ReviewRecord

代表 integration review 紀錄。

狀態：

- `draft`
- `pendingIntegrationReview`
- `approved`
- `needsClarification`

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
      "inputStateFields": [
        {
          "id": "pre_mold_thickness",
          "label": "Pre-mold stack thickness",
          "scope": "inputState",
          "valueType": "number",
          "controlType": "number",
          "unit": "um",
          "required": true,
          "reviewRequired": true,
          "validation": {
            "min": 0,
            "max": 2000
          }
        }
      ],
      "outputStateFields": [
        {
          "id": "mold_material",
          "label": "Mold compound",
          "scope": "outputState",
          "valueType": "material",
          "controlType": "referenceSelect",
          "unit": "",
          "required": true,
          "reviewRequired": true,
          "reference": {
            "sourceType": "dbReference",
            "sourceId": "material_db",
            "entityType": "mold_compound"
          }
        },
        {
          "id": "mold_thickness",
          "label": "Mold thickness",
          "scope": "outputState",
          "valueType": "number",
          "controlType": "number",
          "unit": "um",
          "required": true,
          "reviewRequired": true,
          "validation": {
            "min": 0,
            "max": 2000
          }
        }
      ],
      "processParameterFields": [
        {
          "id": "mold_cure_condition",
          "label": "Mold cure condition",
          "scope": "processParameter",
          "valueType": "enum",
          "controlType": "select",
          "unit": "",
          "required": false,
          "reviewRequired": false,
          "optionSource": {
            "type": "static",
            "options": ["baseline", "low-warpage", "high-temperature"]
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
      "processFlowTemplateId": "flow_tpl_cowos_l",
      "processFlowTemplateVersion": "1.0.0",
      "stepValueSets": [
        {
          "processStepTemplateId": "step_tpl_molding_encapsulation",
          "processStepTemplateVersion": "1.0.0",
          "fieldValues": [
            {
              "fieldId": "mold_thickness",
              "value": 750,
              "source": {
                "type": "spec",
                "ref": "MI450 package outline v0.3"
              },
              "assumption": "",
              "unknown": false,
              "attachmentRef": "",
              "reviewRecords": [
                {
                  "status": "approved",
                  "reviewer": "integration.platform",
                  "comment": "Aligned with current package outline."
                }
              ]
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
5. 使用者填入 input state、output state、process parameter。
6. 每個欄位可補上 source、assumption、unknown、attachment reference。
7. Integration reviewer 對欄位設定 review status 與 comment。
8. 使用者可 export JSON 作為 PoC 交換格式。

## 7. Target Validation Rules

- Process step template 必須有 `id`、`version`、`name`、`status` 與 field groups。
- Process flow template 必須有 `id`、`name`、`version`、`status`、`stepRefs`。
- Process flow template 的 `stepRefs` 必須指向存在的 published process step template version。
- Process flow template 的站點順序以 `stepRefs[]` array order 為準，不要求額外 numeric ordering field。
- Field id 在同一 process step template 中不可重複。
- Field value type 必須屬於支援清單。
- Field control type 必須與 value type 相容。
- Number field value 必須符合 validation `min`、`max`、`integerOnly`。
- Static enum field value 必須符合 `optionSource.options`。
- DB reference field 在 PoC 階段只驗證 reference metadata 是否存在，不驗證 DB entity 是否真實存在。
- Instance 必須綁定正確 `processFlowTemplateId` 與 `processFlowTemplateVersion`。
- Value field 的 `fieldId` 必須存在於對應 step template version。
- Required field 若未填且未標記 `unknown: true`，會被列為 validation issue。
- Review-required field 必須有 approved review record 才算完成。

## 8. Planned Implementation Files

目前 repo 尚未包含實作檔案。建議下一版建立以下檔案：

- `src/domain.js`：domain model、instance generation、validation、completion summary。
- `src/sample-data.js`：CoWoS-L process flow template 與 MI450/GR100 sample instance。
- `src/app.js`：static UI state management 與 editing workflow。
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
- `PATCH /instances/:id/steps/:stepId/fields/:fieldId`
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
- 可由 CoWoS-L process flow template 建立 MI450 與 GR100 instance。
- Instance 建立後保留 process flow template version lock。
- 使用者可在 UI 中填寫站點 value、source、assumption、unknown。
- Molding thickness 等 number 欄位可驗證 range。
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
