# Process Flow PoC V1 Next.js + shadcn/ui Implementation Plan

此文件定義 `poc_v1` 前端的框架基準、UI 元件架構、資料流、路由行為與驗收標準。它是 V1 web app 的完整實作基準，可用於維護目前的 shadcn/ui 版本，或在全新的 shadcn Next.js 專案中重建同等功能。

## 1. Framework Decision

`poc_v1` 使用 Next.js App Router 作為應用框架，shadcn/ui 作為 UI primitive 與 design system 基礎，Tailwind CSS 作為 styling layer。既有 domain model、seed data、localStorage persistence、JSON export 行為維持不變。

框架基準如下：

- App framework: Next.js App Router
- UI framework: shadcn/ui
- UI primitive base: Base UI through shadcn/ui `base-nova` generated components
- Rendering model: React client components for interactive workflow screens
- Language: TypeScript with strict mode
- Styling: Tailwind CSS plus shadcn/ui CSS variables
- Icons: `lucide-react`
- Package manager: npm, matching the existing `package-lock.json`
- Persistence: browser `localStorage`
- Export: browser JSON download

官方 Next.js 專案初始化指令使用 `init` 與 `latest`：

```bash
npx shadcn@latest init -t next
```

既有 `poc_v1` 專案使用 shadcn/ui existing project 初始化方式：

```bash
cd /Users/henry/Desktop/code/process-flow/poc_v1
npx shadcn@latest init --defaults --yes --no-monorepo --no-rtl --pointer
```

V1 需要的 shadcn/ui components 使用以下指令加入：

```bash
npx shadcn@latest add card dialog dropdown-menu input label checkbox select badge separator scroll-area tooltip alert-dialog textarea --yes
```

shadcn/ui 的 CLI 建立 `components.json`、安裝必要 dependencies、加入 `cn` utility，並設定 CSS variables。Next.js 專案使用 `src/` 目錄，`@/*` alias 指向 `./src/*`。

參考來源：

- https://ui.shadcn.com/docs/installation/next
- https://ui.shadcn.com/docs/cli

## 2. shadcn/ui Architecture

`poc_v1` 是既有 Next.js App Router 專案內直接採用 shadcn/ui 的架構。這個結構保留原本 domain/data/business component 分層，並新增 shadcn/ui 的 generated primitives 作為 reusable UI layer。

### 2.1 Project-Level shadcn Conventions

- shadcn style: `base-nova`
- shadcn base package: `@base-ui/react`
- components path: `src/components/ui`
- utility path: `src/lib/utils.ts`
- import alias: `@/*`
- icon library: `lucide-react`
- CSS variables: enabled
- monorepo mode: disabled
- RTL mode: disabled
- pointer cursor for buttons: enabled

Business components import primitives from `@/components/ui/*` and keep workflow/domain behavior in `src/components/*`。Generated primitives are not edited for Process Flow-specific logic.

### 2.2 Rebuild From a Fresh shadcn Next.js Project

若使用 `npx shadcn@latest init -t next` 建立全新前端目錄，重建順序如下：

1. 保留新專案產生的 framework files：

- `package.json`
- `package-lock.json`
- `next.config.*`
- `postcss.config.*`
- `tailwind.config.*`
- `components.json`
- `src/app/globals.css`
- `src/lib/utils.ts`
- `src/components/ui/*`

2. 從既有 `poc_v1` 搬入 domain 與 data：

- `src/domain/export.ts`
- `src/domain/storage.ts`
- `src/domain/types.ts`
- `src/domain/utils.ts`
- `src/data/seedCatalog.ts`

3. 搬入 app routes：

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/processsteptemplate/page.tsx`

4. 搬入 business components：

- `src/components/AddProcessStepDialog.tsx`
- `src/components/CreateMenu.tsx`
- `src/components/DemoResetButton.tsx`
- `src/components/FlowBuilder.tsx`
- `src/components/FlowTemplateList.tsx`
- `src/components/InstanceEditor.tsx`
- `src/components/ParameterField.tsx`
- `src/components/StepFlowBlocks.tsx`
- `src/components/StepTemplateLibrary.tsx`

5. 合併 `globals.css`，保留 shadcn/ui 的 CSS variables 與 Tailwind layers，再加入 `poc_v1` 的 app background、base typography 與 custom utility需求。

6. 合併 `tailwind.config.*`，確保 content paths 包含：

```ts
"./src/app/**/*.{js,ts,jsx,tsx,mdx}"
"./src/components/**/*.{js,ts,jsx,tsx,mdx}"
"./src/domain/**/*.{js,ts,jsx,tsx,mdx}"
"./src/data/**/*.{js,ts,jsx,tsx,mdx}"
```

7. 確認 `tsconfig.json` alias：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

8. 執行 build，修正 import、dependency 與 styling 差異。

## 3. Project Structure

專案結構如下：

```text
poc_v1/
  components.json
  next.config.mjs
  package.json
  package-lock.json
  postcss.config.js
  tailwind.config.ts
  tsconfig.json
  src/
    app/
      globals.css
      layout.tsx
      page.tsx
      processsteptemplate/
        page.tsx
    components/
      ui/
        button.tsx
        card.tsx
        dialog.tsx
        dropdown-menu.tsx
        input.tsx
        label.tsx
        checkbox.tsx
        select.tsx
        badge.tsx
        separator.tsx
        scroll-area.tsx
        tooltip.tsx
        alert-dialog.tsx
        textarea.tsx
      AddProcessStepDialog.tsx
      CreateMenu.tsx
      DemoResetButton.tsx
      FlowBuilder.tsx
      FlowTemplateList.tsx
      InstanceEditor.tsx
      ParameterField.tsx
      StepFlowBlocks.tsx
      StepTemplateLibrary.tsx
    data/
      seedCatalog.ts
    domain/
      export.ts
      storage.ts
      types.ts
      utils.ts
    lib/
      utils.ts
```

`src/components/ui/*` 是 shadcn/ui 產生的 reusable primitives。`src/components/*` 是 Process Flow app 的 business components。兩者分層清楚，不把 domain workflow 寫進 `components/ui`。

## 4. Existing Code Preservation

以下程式在 shadcn/ui 架構下維持語意穩定：

- Domain types: process catalog、step template、flow template、flow instance、field definition、repeater value
- Seed catalog: demo process step templates 與 process flow templates
- Storage keys: `process-flow.catalog.v1`、`process-flow.instances.v1`
- Export schema version: `process-flow-v1`
- Validation rules: required fields、unknown flags、number min/max、repeater min/max、child field recursion
- Routes: `/` 與 `/processsteptemplate`
- Client-side persistence: browser `localStorage`
- Browser JSON download export behavior

shadcn/ui 的角色是提供 UI primitives、accessibility、component consistency 與 future maintainability，不改變 V1 domain behavior。

## 5. shadcn/ui Component Mapping

V1 business components 與 shadcn/ui primitives 的對應如下：

| V1 component | shadcn/ui usage | Notes |
| --- | --- | --- |
| `CreateMenu` | `Button`, `DropdownMenu` | 保留 create action list；用 `DropdownMenuItem` 取代手寫 menu positioning。 |
| `FlowTemplateList` | `Card`, `Dialog`, `Button`, `Badge`, `ScrollArea` | List 外框與 detail modal 改用一致 primitives。 |
| `FlowBuilder` | `Card`, `Button`, `Input`, `Label`, `Dialog`, `ScrollArea`, `Badge`, `Separator` | 保留 step selection 與 export flow；表單 controls 改用 shadcn/ui。 |
| `InstanceEditor` | `Card`, `Button`, `Input`, `Label`, `ScrollArea`, `Separator` | 與 builder 共用視覺規格。 |
| `ParameterField` | `Input`, `Textarea`, `Checkbox`, `Select`, `Label`, `Badge`, `Button` | 依 control type 選擇 primitive；repeater child fields 保留 recursive rendering。 |
| `AddProcessStepDialog` | `Dialog`, `Button`, `Input`, `Label`, `Checkbox`, `Select`, `Textarea`, `Separator` | 取代自製 modal 與 field row controls。 |
| `StepTemplateLibrary` | `Card`, `Badge`, `Separator`, `ScrollArea` | 用 badge 呈現 type、required、unit、repeater。 |
| `StepFlowBlocks` | `Button`, `Badge`, optional `Tooltip` | Flow block 可保留 custom layout，controls 使用 primitives。 |
| `DemoResetButton` | `AlertDialog`, `Button` | 用 alert dialog 取代 browser confirm，保留 bottom-left demo reset 位置。 |

## 6. UI Architecture

V1 UI 維持 internal engineering tool 風格。頁面不做 landing page，也不加入 hero section。資訊密度、可掃描性與穩定工作流優先。

視覺原則：

- Compact operational layout
- White or neutral panels on light app background
- Slate text and borders
- Teal primary action color
- Amber/rose only用於 demo reset danger affordance
- 8px or smaller border radius for cards and panels
- Icons appear inside action buttons when an icon exists in `lucide-react`
- Horizontal process flow blocks use stable dimensions and horizontal scroll
- Dialogs use viewport-aware max height and internal scroll
- No nested card-in-card layout for page sections

shadcn/ui 的 `Card` 適合 individual repeated item、dialog body section 或 genuinely framed tool。Page section 不應為了裝飾而堆疊多層 card。

## 7. Routes and Product Behavior

### 7.1 `/`

首頁是 general user / simulation engineer 的 workspace。

Capabilities:

- Browse process flow templates by name
- Click a process flow template and open a detail dialog
- Create a process flow instance from an existing process flow template
- Create a new technology flow by composing existing process step templates
- Fill process step parameters
- Export process flow instances and catalog JSON

首頁不提供 process step template creation/editing controls。

### 7.2 `/processsteptemplate`

此頁是 framework developer workspace。

Capabilities:

- Browse process step templates and field definitions
- Add local draft process step templates
- Create primitive parameter fields
- Create `repeater` fields with repeat item child fields
- Return to `/` through a workspace navigation action

## 8. App Shell

`src/app/layout.tsx` 提供 root metadata、global CSS 與 app-level reset control。

Expected layout behavior:

- `html lang="en"` 可保留；若 UI 文字改成中文，再改成 `zh-Hant`
- `body` 不包大型 decorative shell
- `DemoResetButton` rendered globally
- Global styles imported from `src/app/globals.css`

`src/app/globals.css` 應包含：

- shadcn/ui CSS variables
- `@tailwind base`
- `@tailwind components`
- `@tailwind utilities`
- global `box-sizing`
- app background
- base text color
- form font inheritance

## 9. Main Workspace UI

首頁 header:

- Eyebrow: `Process Flow PoC V1`
- Title: `Template and instance workspace`
- Short explanatory copy
- Right-side `Create` menu

Main content states:

- Dashboard mode: process flow template list
- New technology mode: flow builder
- Existing technology mode: instance editor

After an export, the page shows a confirmation band with:

- exported product/instance name
- exported JSON filename
- `Export catalog` button

首頁不顯示 process step template count、process flow template count 或 local instance count。

## 10. Create Menu

Component:

- `src/components/CreateMenu.tsx`

shadcn/ui primitives:

- `Button`
- `DropdownMenu`
- `DropdownMenuTrigger`
- `DropdownMenuContent`
- `DropdownMenuItem`

Menu items:

1. `Create new technology`
2. `Create {process flow template name}` for each available flow template

Behavior:

- Clicking outside closes the menu
- `Create new technology` opens the flow builder
- `Create {template.name}` opens the instance editor for that template

## 11. Process Flow Template List

Component:

- `src/components/FlowTemplateList.tsx`

Dashboard list behavior:

- Shows only process flow template names
- Does not show steps inline
- Click selects the template and opens the flow detail dialog

Selected list item:

- teal border
- pale teal background
- clear focus-visible ring

## 12. Process Flow Detail Dialog

The detail dialog appears after clicking a flow template.

Content:

- Eyebrow: `Process flow detail`
- Flow name
- Flow description
- Owner
- Version
- Status
- Flow steps

Flow steps:

- Rendered with `StepFlowBlocks`
- Horizontal blocks
- Right arrow between blocks
- Horizontal scroll when needed

shadcn/ui primitives:

- `Dialog`
- `DialogContent`
- `DialogHeader`
- `DialogTitle`
- `DialogDescription`
- `Card` or bordered metadata panels
- `ScrollArea`
- `Badge`

## 13. Step Flow Blocks

Component:

- `src/components/StepFlowBlocks.tsx`

Used by:

- process flow detail dialog
- new technology builder
- existing technology instance editor

Block visual:

- horizontal layout
- stable width around `w-72`
- minimum height around `min-h-36`
- white background
- slate border
- selected block uses teal border and teal focus/shadow treatment
- step order number appears in a square badge
- right arrow between blocks

Block content:

- step number
- step template name
- step ref id
- field count
- optional remove button in draft flow editing contexts

## 14. Create New Technology Flow

Component:

- `src/components/FlowBuilder.tsx`

Entry:

- `Create` menu -> `Create new technology`

Inputs:

- `Technology name`
- `Product / instance name`

Add step behavior:

1. User clicks `Add step`.
2. Step picker dialog opens.
3. User selects a reusable process step template.
4. Selected step is appended to the flow.
5. New step block becomes selected.

Step picker card content:

- process step template name
- id/version
- purpose
- `repeater` badge when the step has a repeater field

Flow editing behavior:

- Steps render as large horizontal blocks
- Blocks are connected by arrow icons
- Clicking a block shows parameter settings for that selected step only
- Remove button deletes a draft step from the flow

Footer actions:

- `Export only`
  - saves only the instance to localStorage
  - downloads instance JSON
- `Save template & export`
  - saves the flow template to localStorage
  - saves the instance to localStorage
  - downloads a combined JSON export

## 15. Create Existing Technology Instance

Component:

- `src/components/InstanceEditor.tsx`

Entry:

- `Create` menu -> `Create {template.name}`

Inputs:

- `Product / instance name`

Flow behavior:

- Fixed template steps render as horizontal blocks
- User clicks a block to edit that step's parameters
- Add/remove step controls are not available in this mode

Footer action:

- `Export instance`
  - validates the instance
  - saves the instance to localStorage
  - downloads instance JSON

## 16. Process Step Template Page

Component:

- `src/app/processsteptemplate/page.tsx`

Header:

- `Workspace` link back to `/`
- Eyebrow: `Framework developer`
- Title: `Process step templates`
- Short explanatory copy
- `Add process step` button

Main content:

- process step library

## 17. Process Step Library

Component:

- `src/components/StepTemplateLibrary.tsx`

Each process step template item shows:

- name
- id/version
- field count
- field detail chips

Each field detail shows:

- field label
- control type
- value type
- unit, when present
- required badge, when required

Repeater field details also show child fields from `repeatDefinition.itemFieldDefinitions[]`。

## 18. Add Process Step Dialog

Component:

- `src/components/AddProcessStepDialog.tsx`

Entry:

- `/processsteptemplate` -> `Add process step`

Dialog fields:

- step template name
- field definition rows

Field definition row:

- label
- field id
- type
- required flag
- remove button

Supported field type options:

- String
- Material
- Float
- Integer
- Boolean
- Repeater

Type mapping:

- String -> `controlType: "text"`
- Material -> `controlType: "text"`
- Float / Integer -> `controlType: "number"` and unit `um`
- Boolean -> `controlType: "checkbox"`
- Repeater -> `valueType: "fieldGroupArray"` and `controlType: "repeater"`

Repeater field editing:

- Selecting `Repeater` expands a nested repeat item field editor
- Default child fields are Material and Thickness
- Child fields support String, Material, Float, Integer, and Boolean
- Nested repeater child fields are not exposed in the V1 dialog
- Saved repeater fields include `repeatDefinition.itemLabelTemplate`
- Saved repeater fields include `repeatDefinition.indexBase = 1`
- Saved repeater fields include `repeatDefinition.minItems`
- Saved repeater fields include `repeatDefinition.maxItems = 12`
- Saved repeater fields include `repeatDefinition.itemFieldDefinitions[]`

Validation:

- step template name is required
- top-level field ids are unique
- repeater child field ids are unique within the repeater
- repeater fields contain at least one child field

Save behavior:

- creates a draft process step template
- version defaults to `1.0.0`
- owner defaults to `simulation-team`
- status defaults to `draft`
- persists the template to `process-flow.catalog.v1`
- refreshes the process step library

## 19. Parameter Rendering

Component:

- `src/components/ParameterField.tsx`

Base layout:

- white parameter card or bordered field group
- slate border
- label and description
- input control
- optional unit badge
- `Unknown` checkbox

Control rendering:

- `number`: shadcn/ui `Input` with `type="number"`
- `checkbox` or boolean value type: shadcn/ui `Checkbox`
- `select`: shadcn/ui `Select` when static options exist
- `referenceSelect`: shadcn/ui `Select` when mock reference options exist
- `computed`: disabled read-only text input
- default: shadcn/ui `Input` or `Textarea`
- `repeater`: nested repeat item editor

Unknown behavior:

- sets `unknown = true`
- sets `value = null`
- validation treats the field as intentionally unknown

## 20. Repeater Parameter Rendering

A repeater parameter appears as a parent field group.

Header controls:

- item count badge
- `Item` add button
- `Unknown` checkbox

Item behavior:

- item count obeys `minItems` and `maxItems`
- new items receive stable `itemId`
- item index starts at `indexBase`, default `1`
- remove button is disabled at the minimum item count

Child fields:

- rendered recursively through `ParameterField`
- stored inside each repeat item `fieldValues[]`

## 21. Data Model Used By UI

### 21.1 ProcessCatalog

```ts
type ProcessCatalog = {
  processStepTemplates: ProcessStepTemplate[];
  processFlowTemplates: ProcessFlowTemplate[];
};
```

### 21.2 ProcessStepTemplate

```ts
type ProcessStepTemplate = {
  id: string;
  version: string;
  name: string;
  purpose: string;
  owner: string;
  status: "draft" | "published" | "deprecated";
  fieldDefinitions: FieldDefinition[];
};
```

### 21.3 FieldDefinition

```ts
type FieldDefinition = {
  id: string;
  label: string;
  description: string;
  scope: "inputState" | "outputState" | "processParameter";
  valueType:
    | "string"
    | "integer"
    | "float"
    | "boolean"
    | "enum"
    | "material"
    | "layoutReference"
    | "geometryReference"
    | "fieldGroupArray";
  controlType:
    | "text"
    | "number"
    | "checkbox"
    | "select"
    | "referenceSelect"
    | "computed"
    | "repeater";
  selectionMode?: "single" | "multiple" | null;
  unit: string | null;
  required: boolean;
  reviewRequired: boolean;
  defaultValue?: FieldValuePayload;
  validation?: {
    min?: number;
    max?: number;
    exclusiveMin?: boolean;
    exclusiveMax?: boolean;
  };
  optionSource?: OptionSource | null;
  reference?: ReferenceDefinition | null;
  derivedRule?: DerivedRule | null;
  repeatDefinition?: RepeatDefinition | null;
};
```

### 21.4 Repeater Field

A repeater field uses:

- `valueType: "fieldGroupArray"`
- `controlType: "repeater"`
- `repeatDefinition.itemFieldDefinitions[]`

Repeat item values are stored in the parent field value:

```ts
type FieldGroupArrayValue = {
  items: RepeatItemValue[];
};

type RepeatItemValue = {
  itemId: string;
  index: number;
  fieldValues: FieldValue[];
};
```

### 21.5 ProcessFlowTemplate

```ts
type ProcessFlowTemplate = {
  id: string;
  name: string;
  description?: string;
  version: string;
  owner: string;
  status: "draft" | "published" | "deprecated";
  stepRefs: StepRef[];
};
```

```ts
type StepRef = {
  stepRefId: string;
  processStepTemplateId: string;
  processStepTemplateVersion: string;
  enabled: boolean;
};
```

### 21.6 ProcessFlowInstance

```ts
type ProcessFlowInstance = {
  id: string;
  productName: string;
  lifecycleStatus: "draft" | "pendingIntegrationReview" | "approved" | "needsClarification";
  processFlowTemplateId: string;
  processFlowTemplateVersion: string;
  stepValueSets: StepValueSet[];
  createdAt: string;
  updatedAt: string;
};
```

## 22. Persistence

Seed data lives in:

- `src/data/seedCatalog.ts`

Browser-local additions live in `localStorage`。

Keys:

```text
process-flow.catalog.v1
process-flow.instances.v1
```

Catalog loading:

1. Load seed catalog.
2. Load local catalog additions from `process-flow.catalog.v1`.
3. Merge seed and local additions by `{id}@{version}`.

Local catalog additions include:

- process step templates created from `/processsteptemplate`
- process flow templates saved from the new technology builder

Local instance store includes:

- process flow instances exported from existing templates
- process flow instances exported from newly composed technologies

## 23. Export

All exports use browser JSON download。

Schema version:

```text
process-flow-v1
```

Instance export:

```json
{
  "schemaVersion": "process-flow-v1",
  "processFlowInstances": []
}
```

Catalog export:

```json
{
  "schemaVersion": "process-flow-v1",
  "processStepTemplates": [],
  "processFlowTemplates": []
}
```

Combined template and instance export:

```json
{
  "schemaVersion": "process-flow-v1",
  "processStepTemplates": [],
  "processFlowTemplates": [],
  "processFlowInstances": []
}
```

## 24. Validation

V1 validation covers:

- product/instance name
- technology name in new technology flow
- at least one step in new technology flow
- required primitive fields
- unknown flags
- valid finite number fields
- numeric min/max rules
- existing `StepValueSet` per enabled step
- existing process step template references
- repeater min/max item count
- repeater child field values recursively

Validation should remain in domain utilities where possible. UI components display validation output but do not become the source of truth for domain validity.

## 25. Seed Catalog

Seed process step templates:

- Initial wafer
- Add layer1
- Add layer12
- RDL build-up
- Grind
- Flip

Seed process flow templates:

- Demo Single Layer Technology
- Demo Dual Material Technology
- Demo Flip Technology
- Demo Hybrid Stack Technology
- Demo RDL Repeat Technology

The RDL flow demonstrates repeater behavior.

## 26. Demo Reset Control

V1 includes a global demo reset control in the bottom-left corner of every route.

Component:

- `src/components/DemoResetButton.tsx`

Placement:

- rendered from `src/app/layout.tsx`
- appears globally on `/` and `/processsteptemplate`

Visual style:

- fixed bottom-left position
- compact button treatment
- dark slate background
- amber warning icon or accent
- amber border with rose hover state
- strong shadow and ring treatment to distinguish it from normal workflow actions

Behavior:

1. User triggers `Reset demo`.
2. shadcn/ui `AlertDialog` asks for confirmation.
3. On confirmation, the app removes:
   - `process-flow.catalog.v1`
   - `process-flow.instances.v1`
4. The current page reloads.
5. The UI returns to seed catalog state.

The reset control only removes V1 app-owned localStorage keys. It does not clear unrelated browser localStorage entries.

## 27. Styling and Theme Plan

The shadcn/ui theme should use CSS variables as the primary token layer. Tailwind utility classes remain the main styling syntax for layout and component composition.

Required theme behavior:

- retain light-mode-first UI
- map shadcn primary color to teal-compatible actions
- keep slate-neutral text, border and muted surfaces
- keep danger/reset affordance visually separate from normal destructive actions
- preserve `shadow-soft` or replace it with a named Tailwind extension used consistently

Global visual settings:

- background: light neutral app canvas
- panel background: `background` or white-equivalent token
- body text: slate-like foreground token
- inputs: consistent focus-visible ring
- buttons: shadcn variants for primary, secondary, outline, ghost and destructive states

## 28. Implementation Baseline

### Layer 1: Framework Foundation

Deliverables:

- shadcn/ui initialized in `poc_v1`
- `components.json` present
- `src/lib/utils.ts` present
- required `src/components/ui/*` primitives generated
- Tailwind content paths verified
- `globals.css` includes shadcn CSS variables and existing app baseline

Verification:

- `npm run build`
- homepage renders without import errors
- `/processsteptemplate` renders without import errors

### Layer 2: App Shell and Shared Primitives

Deliverables:

- root layout compatible with shadcn CSS variables
- `DemoResetButton` uses `AlertDialog`
- common button/input/label styles replaced with shadcn primitives
- focus-visible states verified on keyboard navigation

Verification:

- reset dialog confirms before deleting localStorage
- app-owned localStorage keys are removed only after confirmation

### Layer 3: Main Workspace

Deliverables:

- `CreateMenu` uses `DropdownMenu`
- `FlowTemplateList` uses shadcn dialog primitives for detail display
- export confirmation uses consistent button/card styling
- dashboard remains compact and operational

Verification:

- selecting a flow opens detail dialog
- closing detail returns to dashboard
- create menu opens and closes correctly
- create menu options open the correct workspace modes

### Layer 4: Builder and Instance Editor

Deliverables:

- `FlowBuilder` form fields use `Input`, `Label`, `Button`, `Dialog`, `ScrollArea`
- `InstanceEditor` uses the same field and action primitives
- `StepFlowBlocks` retains stable horizontal layout
- add-step picker remains searchable or scannable through compact cards

Verification:

- new technology can add multiple steps
- selected step parameters render only for the selected step
- removing a draft step updates selected state safely
- `Export only` downloads instance JSON
- `Save template & export` saves catalog addition and downloads combined JSON

### Layer 5: Process Step Template Workspace

Deliverables:

- `StepTemplateLibrary` uses badges and compact cards consistently
- `AddProcessStepDialog` uses shadcn dialog and form primitives
- repeater field editor remains nested and readable

Verification:

- new process step template can be saved
- primitive fields persist correctly
- repeater fields persist with valid child field definitions
- local catalog additions appear after save

### Layer 6: Final QA

Deliverables:

- no behavior regression in routes, persistence, validation, or export
- responsive desktop/mobile layout checked
- keyboard access checked for dropdowns and dialogs
- build passes

Verification commands:

```bash
cd /Users/henry/Desktop/code/process-flow/poc_v1
npm run build
```

## 29. Acceptance Criteria

A complete V1 shadcn/ui implementation includes:

- Next.js App Router project under `poc_v1`
- shadcn/ui initialized and documented as the UI framework
- `src/components/ui/*` used for reusable UI primitives
- Process Flow business components kept outside `src/components/ui`
- Main route `/`
- Framework developer route `/processsteptemplate`
- global bottom-left reset demo control
- seed catalog loading
- localStorage catalog additions
- localStorage instance store
- process flow template list showing names only
- process flow detail dialog with owner, description, version, status and step flow
- create menu
- new technology builder
- add-step picker dialog
- horizontal step blocks with arrows
- selected-step-only parameter settings
- existing technology instance editor
- process step template library
- add process step dialog
- repeater field creation
- repeater parameter editing
- validation
- JSON export
- successful production build

## 30. File Inventory

Application routes:

- `poc_v1/src/app/layout.tsx`
- `poc_v1/src/app/page.tsx`
- `poc_v1/src/app/processsteptemplate/page.tsx`
- `poc_v1/src/app/globals.css`

Business components:

- `poc_v1/src/components/AddProcessStepDialog.tsx`
- `poc_v1/src/components/CreateMenu.tsx`
- `poc_v1/src/components/DemoResetButton.tsx`
- `poc_v1/src/components/FlowBuilder.tsx`
- `poc_v1/src/components/FlowTemplateList.tsx`
- `poc_v1/src/components/InstanceEditor.tsx`
- `poc_v1/src/components/ParameterField.tsx`
- `poc_v1/src/components/StepFlowBlocks.tsx`
- `poc_v1/src/components/StepTemplateLibrary.tsx`

shadcn/ui components:

- `poc_v1/src/components/ui/button.tsx`
- `poc_v1/src/components/ui/card.tsx`
- `poc_v1/src/components/ui/dialog.tsx`
- `poc_v1/src/components/ui/dropdown-menu.tsx`
- `poc_v1/src/components/ui/input.tsx`
- `poc_v1/src/components/ui/label.tsx`
- `poc_v1/src/components/ui/checkbox.tsx`
- `poc_v1/src/components/ui/select.tsx`
- `poc_v1/src/components/ui/badge.tsx`
- `poc_v1/src/components/ui/separator.tsx`
- `poc_v1/src/components/ui/scroll-area.tsx`
- `poc_v1/src/components/ui/tooltip.tsx`
- `poc_v1/src/components/ui/alert-dialog.tsx`
- `poc_v1/src/components/ui/textarea.tsx`

Domain/data files:

- `poc_v1/src/data/seedCatalog.ts`
- `poc_v1/src/domain/export.ts`
- `poc_v1/src/domain/storage.ts`
- `poc_v1/src/domain/types.ts`
- `poc_v1/src/domain/utils.ts`

Framework/config files:

- `poc_v1/components.json`
- `poc_v1/next.config.mjs`
- `poc_v1/package.json`
- `poc_v1/package-lock.json`
- `poc_v1/postcss.config.js`
- `poc_v1/tailwind.config.ts`
- `poc_v1/tsconfig.json`
- `poc_v1/src/lib/utils.ts`
