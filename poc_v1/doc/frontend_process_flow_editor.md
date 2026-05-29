# Frontend Process Flow Editor Requirements

## Goal

建立一個可視化的 process flow instance editor。使用者在 UI 上建立 process flow instance 與 process step instances；底層同時建立對應的 process flow template，並根據每個 step template 的 schema 收集 instance 所需欄位。

此文件描述「自訂 flow 建立 instance」模式：

- 使用者不套用既有 flow template。
- 使用者可以自行拖拉 step template、排列 flow、連接 step、填寫 instance values。
- Save 時依白板上從 initial step 可達的線性 flow 建立資料。

另一種建立方式是「直接使用現有 flow template」：

- 使用者不能編輯 flow 結構。
- 使用者只填寫 instance 所需 values。

## Layout

畫面主要分成兩個區域：

- 中央：process template flow 白板區。
- 右側：process step template palette。

右側 palette 依 `process step template category` 分組呈現。每個 category 可展開/收合，展開後列出該 category 下的所有 process step templates。

每個 process step template item 顯示 step name、version、field 數量、repeater 標記與 purpose。右側 palette 承擔 template 瀏覽與選擇用途，因此保留比白板 node 更完整的 template 摘要資訊。

本版本不提供搜尋或 filter；資料與元件結構保留 search/filter 的擴充空間。

右側列表支援 scrollbar，避免 template 數量多時撐破版面。

## Whiteboard Flow Area

中央 flow 區是白板式 canvas。使用者可以將右側 process step template 拖入白板。每次拖入都建立一個獨立的 process step instance。

同一個 process step template 可以被拖入多次，每次都是不同 instance。

白板上固定存在一個 initial step，以圓圈表示。initial step 是判斷 flow 是否成立的起點。

Initial step 不可被拖動，固定作為 flow 起點。

使用者可以任意移動白板上的 process step instance 位置。位置是視覺編輯用途，不代表 flow 順序；真正的 flow 順序由箭頭連線決定。

白板上的 process step block 是流程結構的輕量代表。Block 只顯示必要辨識資訊：

- 上層：process step template name，以主要文字呈現。
- 下層左側：template version，以小字呈現。
- 下層 version 右側：required field completion status，顯示 `Complete` 或 `Required fields`。

Block 不顯示 category、field 數量、purpose、step instance id 或完整參數內容。這些資訊集中在右側 palette 與 step instance editor 中呈現，避免白板在大型 flow 中變得雜亂。

## Large Flow Navigation

當 process flow step 數量很多時，白板採用水平流程跑道設計。Flow 最終會是一條線，因此畫面主要支援水平瀏覽，不提供垂直 scrollbar。

白板區使用水平 scrollbar 讓使用者左右查看大量 steps。

當使用者使用align來排版step時，白板的視覺結構分成兩排：

- 第一排：從 initial step 可達的 flow steps。
- 第二排：未加入 flow 的 steps。


使用者手動拖動 step 時，不限制 step 只能位於兩排上。

## Flow Membership

從 initial step 沿著箭頭一路可以抵達的 process step instance，才算加入目前 flow。

已加入 flow 且 required fields 已完成的 step 使用綠色外框。

已加入 flow 但 required fields 尚未完成的 step 使用橘色外框。

未加入 flow 的 step 可以暫時存在白板上，但使用紅色外框。

白板顏色狀態定義如下：

- 綠色：step 已經在 flow 中，而且 instance required fields 已完成。
- 橘色：step 已經在 flow 中，但 instance required fields 尚未完成。
- 紅色：step 不在 flow 中。

Save 時：

- 只檢查從 initial step 可達的 flow steps。
- 不檢查未加入 flow 的 steps。
- 未加入 flow 的 steps 會被移除，不會進入產生結果。

## Flow Shape Rules

此 editor 建立的是線性 flow，不允許分支。

每個 process step instance 最多只能有：

- 一個 incoming edge。
- 一個 outgoing edge。

最後一個 step 只有 incoming edge，沒有 outgoing edge。

initial step：

- 是 flow 起點。
- 不允許 incoming edge。
- 最多只能有一個 outgoing edge。

不允許 cycle。使用者拉線時，如果新連線會形成 cycle，UI 必須阻止該連線成立。

Save 時的 flow 順序，就是從 initial step 開始，沿 outgoing edge 一路走到最後一個 step 所得到的 ordered list。

## Connection Interaction

每個 process step instance 有一個可拖拉的 outgoing arrow 或 handle。使用者將 arrow 拖到另一個 step 並放開後，才會建立連線。

為了避免誤接，當拖拉中的 arrow 指向某個可連接 step 時，被指到的 step 需要有明顯 UI feedback，例如高亮、邊框變亮、背景變化，或其他 hover target indication。

連線驗證規則：

- source 不可等於 target。
- target 不可為 initial step。
- 新連線不可造成 cycle。
- 不允許一個 source 指向多個 targets。
- 不允許一個 target 同時有多個 sources。

當使用者建立新連線時，採取簡單替換規則，不替使用者自動重接其他 flow：

- 若 source 原本已有 outgoing edge，原 outgoing edge 會被移除。
- 若 target 原本已有 incoming edge，原 incoming edge 會被移除。
- 被移除連線後造成的 flow 斷裂，由使用者自行重新接線。

範例：

```text
原本:

A -> B
C

操作:

C -> B

結果:

A
C -> B
```

也就是 `A -> B` 被移除，結果為 `C -> B`。系統不會自動幫 A 接到 B 的下一個 step。

## Geometry State Button

每個 process step 結束後會產生一個 geometry state。白板上的 step-to-step edge 需要提供一個小小的 geometry view button，讓使用者知道此連線位置可用來查看該 step 結束後的 geometry state。

geometry view button 必須在其前面所有 flow 中的 process step instances 都完成必要欄位後才能點選。

Geometry view button 顯示在兩個 process step instances 之間的 edge 上。

使用者點擊 geometry view button 時，系統顯示 placeholder message：

```text
geometry view feature not supported now
```

此 button 是 geometry view 功能的入口。本版本提供 UI 入口與 placeholder feedback。

## Align Function

白板提供 `Align` 功能，用來整理目前畫面上的 process step instance 位置。

Align 只改變 node 的視覺位置，不改變任何 edge，不新增連線，不刪除連線，也不改變 flow 邏輯。

按下 Align 時：

- 從 initial step 開始沿 outgoing edge 找出 flow steps。
- 將 initial step 與所有 flow steps 依 flow 順序排成第一排水平直線。
- 找出所有未加入 flow 的 steps。
- 將未加入 flow 的 steps 排成第二排水平直線。
- 未加入 flow 的 steps 不會彼此連接。
- Align 完成後，白板自動水平捲動到 initial step 所在的最左側位置。

未加入 flow 的 steps 排列順序不影響資料結果。預設依目前畫面上的 x 座標由左到右排列。

大量未加入 flow 的 steps 不換行，維持同一條水平列，透過水平 scrollbar 查看。

範例：

```text
Align 前:

      C
initial -> A -> B          E
          D


Align 後:

initial -> A -> B

C        D        E
```

## Instance Editing

使用者點擊白板上的 process step instance 時，畫面中央會開啟一個 modal dialog，用來編輯該 step instance 的 values。

Modal dialog 會覆蓋在白板上方，背景以遮罩變暗，讓使用者明確知道目前正在編輯 process step instance。使用者必須關閉 dialog 後才能回到白板進行拖曳、連線或其他 canvas 操作。

Dialog 佔據主要可視區域的大部分寬度，桌面版約為螢幕寬度的 2/3 到 3/4，並保留最大寬度與邊界，避免欄位內容被白板或 viewport 裁切。

Dialog 內部表單區支援垂直捲動，讓欄位較多、repeater 欄位展開或小螢幕情境下仍可完整編輯。

表單欄位根據 process step template 的 schema 動態產生。

Dialog header 顯示正在編輯的 step template 名稱、step instance id、flow membership 狀態，以及 required field completion 狀態。白板 block 未顯示的 instance details 與欄位內容都在此 dialog 中呈現。

未加入 flow 的紅框 step 可以被點擊與填寫，但 Save 時不會檢查，也不會保留。

## Save Button

Save button 必須在所有 flow 中的 process step instances 都完成必要欄位後才能點選。

判斷範圍只包含從 initial step 可達的 steps。

不在 flow 中的 steps 不影響 Save button 狀態。

按下 Save 時：

- 移除所有不在 flow 中的 steps。
- 依 initial step 可達順序整理 flow。
- 建立 process flow template。
- 建立 process flow instance。
- 建立所有 flow 中的 process step instances 與其填寫 values。
- 將 process flow template 存入 local catalog。
- 將 process flow instance 存入 local instance store。
- 下載一份包含 process flow template、process flow instance、相關 process step templates 與 categories 的 process JSON。
- 回到 workspace 首頁，讓剛建立的 process flow template 出現在 template list 中。

Save 後，使用者可以在首頁 template list 中選取剛建立的 process flow template，也可以透過匯出的 JSON 保存同一份建立結果。

## Frontend Resources

前端實作此 editor 時使用以下資源。

### React Flow / @xyflow/react

使用 `@xyflow/react` 實作中央白板。

使用範圍：

- node 拖拉、定位、pan、zoom。
- edge、arrow、handle。
- custom node UI，呈現 initial circle、step card、template name、version、completion status、綠框/橘框/紅框狀態。
- connection validation，阻止 cycle、branch、多 incoming、多 outgoing。
- 從 sidebar drag/drop 到 canvas 建立 node。
- 水平瀏覽、大量 node 排版、Align 後重新定位 nodes。

### UI Component System

前端專案若已有 UI component library，右側 palette、modal dialog 與表單元件優先沿用既有系統。

需要的 UI 元件：

- Accordion：category 展開/收合。
- ScrollArea：右側 template list 滾動。
- Modal/Dialog：step instance editor。
- Button：Save、Align。
- Form fields：依 schema 動態產生 instance value input。

若使用 Radix UI 或 shadcn/ui，這些元件對應到 Accordion、ScrollArea、Dialog、Button、Form。

### Drag And Drop

初期不引入 `dnd-kit`。React Flow 負責處理從 sidebar 拖入 canvas 的流程。

當右側 palette 需要排序、拖曳重排、複雜拖放互動時，再引入 `dnd-kit`。

## Data Model

白板上的 node 至少包含：

- `id`
- `templateId`
- `templateName`
- `categoryId`
- `position`
- `schema`
- `instanceValues`
- `isInitial`
- `isReachableFromInitial`
- `validationStatus`

Edge 至少包含：

- `id`
- `source`
- `target`
- `geometryStateButton`

Save 前從 initial node 開始沿 outgoing edge traversal，得到 ordered flow steps。

## Implementation Dependencies

實作時需要對應既有系統中的以下資料與 API：

- process step template schema 的格式與欄位型別。
- instance value validation 規則。
- process flow template 與 process flow instance 的 API payload 格式。
- Save 時送出前的 draft state 格式。
- 白板 node position 的保存策略。
