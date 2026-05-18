# Geometry & Geometry Engine V1

## 1. Concept

本文件定義 Geometry & Geometry Engine V1 的基本幾何資料模型與 engine 解讀方式。V1 的目標不是建立完整 CAD kernel，而是建立一個可以用 JSON 表達、可以被前端 preview 與後端 geometry generation 共同理解的 package geometry model。

這套模型的核心概念是：

- `Container`：不佔實體體積的容器節點，用來組織幾何、定義局部座標、建立階層關係與保存 provenance scope。
- `GeometryBody`：佔有實體體積的幾何物件，例如 die、molding、underfill、substrate layer 或 keep-out volume。
- `ChildContainer`：與 `Container` 相同性質的節點，可以放在另一個 container 之下，形成 tree structure。
- `replaceParentVolume`：V1 採用的 volume composition policy。當 child container 內的 geometry 與 parent container 的 geometry 發生空間 overlap 時，child geometry 會取代 parent geometry 在重疊區域的體積語意。

概念上，一份 geometry document 會接近以下結構：

```text
GeometryDocument
  rootContainer
    bodies[]
    children[]
      container
        bodies[]
        children[]
```

### 1.1 Container

`Container` 本身不代表任何實體材料或體積。它的用途是把一組 geometry bodies 和 child containers 放在同一個局部座標系中，並提供組裝、定位與語意分組能力。

常見用途包括：

- package root container
- die stack container
- substrate container
- interposer container
- local module container
- temporary process-state grouping

Container 可以有自己的 local transform。Child container 中的所有 body 都先在 child local coordinate 中定義，再透過 container transform 被放到 parent coordinate 中。

### 1.2 GeometryBody

`GeometryBody` 是真正佔有體積的幾何物件。每個 body 必須有穩定 ID、幾何表示方式、材料或材料 reference，以及它來自哪個 process step 的 provenance。

同一個 body 可以使用不同 representation format：

- `simple`：用 BOX、CYLINDER、CONE 等簡化幾何 primitive 表達。
- `cadRef`：用 path、artifact reference 或 digest 指向外部 CAD artifact。
- `meshRef`：用 path、artifact reference 或 digest 指向 mesh artifact，例如 STL、OBJ 或 glTF。
- `parametric`：用受控參數化描述表達幾何。
- `derived`：由其他 body 經過 boolean、offset、sweep 等操作衍生而來。

V1 建議 MVP 先以 `simple` 為主，`cadRef` 作為 backend import 或未來 extension。

### 1.3 Tree Structure

Container 與 child container 會形成一棵 geometry tree。Tree 的用途不是單純顯示階層，而是表達幾何的 ownership、local coordinate frame 與 volume composition priority。

例如：

```text
package-root
  bodies:
    molding-body
  children:
    die-stack
      bodies:
        die-1
        die-2
    substrate
      bodies:
        substrate-core
        substrate-layer-1
```

在這個例子中，`molding-body` 可以是 package 外部 envelope，`die-stack` 中的 die 則是更具體的內部結構。當 die 與 molding envelope overlap 時，V1 engine 會使用 `replaceParentVolume` 解讀：die 佔據該區域，molding 不再佔據同一個區域。

### 1.4 replaceParentVolume

V1 採用 `replaceParentVolume` 作為 canonical geometry composition policy。

此規則的意思是：

- Parent container 中的 body 可以表示較粗略的包覆體、背景體積或 envelope。
- Child container 中的 body 可以表示更細節、更高語意優先權的幾何。
- 當 child body 與 parent body 在世界座標中 overlap，重疊區域由 child body 取代 parent body。
- 最終 geometry 不應把 parent 和 child 的重疊區域重複計算為兩份實體體積。

此規則對 preview 與 backend 都有效，不只是顯示順序。

建議 V1 對 sibling overlap 採取保守策略：

- 同一個 container 內的 sibling bodies overlap 時，預設產生 diagnostic。
- 若未來需要允許 sibling overlap，可再引入 explicit priority 或 boolean operation。
- V1 先把明確規則限定在 parent-child overlap，避免 geometry engine 在不明確語意下自行猜測。

### 1.5 Geometry Engine Role

Geometry engine 的責任是讀取 geometry JSON，依照 container tree、transform、body representation 與 `replaceParentVolume` policy，產生可被前端或後端使用的 geometry result。

前端 preview engine 可以輸出 lightweight scene：

```text
GeometryDocument -> GeometryScene
```

後端 standard engine 可以輸出 canonical geometry state 或外部 artifact：

```text
GeometryDocument -> GeometryState / CAD artifact / FEM preprocessing input
```

前端與後端可以使用不同 runtime，但應共用同一份資料結構與 composition policy。若未來採用 C++ core，建議讓 WASM adapter 與 Python C++ extension adapter 都呼叫同一個 C++ geometry core，只在 runtime binding 層分開。

## 2. Data Structure

以下資料結構是 V1 建議格式。欄位名稱與細節後續可以依實作調整，但核心語意建議保持穩定。

### 2.1 GeometryDocument

`GeometryDocument` 是一份 geometry JSON 的 root object。

```json
{
  "schemaVersion": "geometry-v1",
  "unitSystem": {
    "length": "mm",
    "angle": "deg"
  },
  "compositionPolicy": {
    "mode": "replaceParentVolume"
  },
  "rootContainer": {},
  "materials": [],
  "metadata": {}
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `schemaVersion` | `string` | Geometry document schema version。用於前後端判斷是否相容。 |
| `unitSystem` | `UnitSystem` | 定義整份 geometry document 的 canonical unit。 |
| `compositionPolicy` | `CompositionPolicy` | 定義 volume overlap 的解讀方式。V1 固定使用 `replaceParentVolume`。 |
| `rootContainer` | `GeometryContainer` | Geometry tree 的根節點。 |
| `materials` | `MaterialDefinition[]` | Optional。定義 document 內可引用的 material。也可以只放 `materialRef` 指向外部 material DB。 |
| `metadata` | `object` | Optional。放置非核心資料，例如建立者、debug flag、display hint 等。 |

### 2.2 UnitSystem

`UnitSystem` 定義數值欄位的預設單位。

```json
{
  "length": "mm",
  "angle": "deg"
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `length` | `string` | 長度單位，例如 `mm`、`um`、`m`。 |
| `angle` | `string` | 角度單位，例如 `deg` 或 `rad`。 |

V1 建議所有 geometry 在進入 engine 前都轉成 canonical unit，避免 step behavior 各自處理隱含單位。

### 2.3 CompositionPolicy

`CompositionPolicy` 定義 volume conflict 的全域規則。

```json
{
  "mode": "replaceParentVolume"
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `mode` | `string` | V1 固定為 `replaceParentVolume`。表示 child body overlap parent body 時，child body 取代 parent body 的重疊體積。 |

### 2.4 GeometryContainer

`GeometryContainer` 是不佔體積的組裝節點。

```json
{
  "id": "package-root",
  "type": "container",
  "name": "Package Root",
  "transform": {
    "translate": [0, 0, 0],
    "rotate": [0, 0, 0],
    "scale": [1, 1, 1]
  },
  "bodies": [],
  "children": [],
  "provenance": {},
  "metadata": {}
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Stable container ID。應在同一份 document 中唯一。 |
| `type` | `string` | 固定為 `container`，方便 parser 判斷 node 類型。 |
| `name` | `string` | Human-readable name，供 UI 或 debug 使用。 |
| `transform` | `Transform` | 此 container 相對 parent container 的 local transform。 |
| `bodies` | `GeometryBody[]` | 此 container 直接持有的實體幾何。 |
| `children` | `GeometryContainer[]` | Child containers。 |
| `provenance` | `Provenance` | Optional。此 container 的來源資訊。 |
| `metadata` | `object` | Optional。非核心擴充資料。 |

### 2.5 Transform

`Transform` 定義 container 或 body 在 local coordinate 中的位置與姿態。

```json
{
  "translate": [0, 0, 0],
  "rotate": [0, 0, 0],
  "scale": [1, 1, 1]
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `translate` | `number[3]` | 沿 X/Y/Z 平移，使用 document 的 length unit。 |
| `rotate` | `number[3]` | 沿 X/Y/Z 旋轉，使用 document 的 angle unit。 |
| `scale` | `number[3]` | 沿 X/Y/Z 縮放。V1 建議盡量保持 `[1, 1, 1]`，避免對 CAD import 或 FEM mesh 造成不明確語意。 |

### 2.6 GeometryBody

`GeometryBody` 是實際佔有體積的幾何 feature。

```json
{
  "id": "die-001",
  "name": "Top Die",
  "featureType": "die",
  "format": "simple",
  "transform": {
    "translate": [0, 0, 0],
    "rotate": [0, 0, 0],
    "scale": [1, 1, 1]
  },
  "shape": {
    "type": "box",
    "size": [8, 8, 0.15]
  },
  "materialRef": "silicon",
  "composition": {
    "mode": "replaceParentVolume"
  },
  "provenance": {},
  "metadata": {}
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Stable body ID。用於 UI selection、diagnostics、provenance 與後續 patch update。 |
| `name` | `string` | Human-readable name。 |
| `featureType` | `string` | 幾何語意，例如 `die`、`molding`、`underfill`、`substrateLayer`、`keepoutRegion`。 |
| `format` | `BodyFormat` | 幾何表示方式，例如 `simple`、`cadRef`、`meshRef`、`parametric`、`derived`。 |
| `transform` | `Transform` | 此 body 相對所在 container 的 local transform。 |
| `shape` | `SimpleShape` | 當 `format` 為 `simple` 時使用。 |
| `cad` | `CadReference` | 當 `format` 為 `cadRef` 時使用。 |
| `mesh` | `MeshReference` | 當 `format` 為 `meshRef` 時使用。 |
| `parametric` | `ParametricDefinition` | 當 `format` 為 `parametric` 時使用。 |
| `derived` | `DerivedDefinition` | 當 `format` 為 `derived` 時使用。 |
| `materialRef` | `string` | 指向 material ID 或外部 material reference。 |
| `composition` | `BodyComposition` | Body 的 composition hint。V1 與全域 policy 保持 `replaceParentVolume`。 |
| `provenance` | `Provenance` | 此 body 由哪個 process step、field、behavior 產生。 |
| `metadata` | `object` | Optional。非核心擴充資料。 |

### 2.7 BodyComposition

`BodyComposition` 定義 body 與 parent volume 的 composition hint。

```json
{
  "mode": "replaceParentVolume"
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `mode` | `string` | V1 使用 `replaceParentVolume`。當此 body 位於 child container 中並 overlap parent body，engine 會以此 body 取代 parent body 的重疊體積。 |

V1 可以允許 body 省略 `composition`，由 document-level `compositionPolicy` 決定。

### 2.8 SimpleShape

`SimpleShape` 用 primitive 表達簡化幾何。這是 V1 MVP 最推薦先支援的 format。

BOX example：

```json
{
  "type": "box",
  "size": [8, 8, 0.15]
}
```

CYLINDER example：

```json
{
  "type": "cylinder",
  "radius": 0.2,
  "height": 0.1,
  "axis": "z"
}
```

CONE example：

```json
{
  "type": "cone",
  "bottomRadius": 0.3,
  "topRadius": 0.1,
  "height": 0.2,
  "axis": "z"
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `type` | `string` | Primitive type，例如 `box`、`cylinder`、`cone`、`sphere`、`extrudedPolygon`。 |
| `size` | `number[3]` | `box` 使用，代表 X/Y/Z 尺寸。 |
| `radius` | `number` | `cylinder` 或 `sphere` 使用。 |
| `height` | `number` | `cylinder`、`cone` 或 extrusion 類型使用。 |
| `axis` | `string` | 主要方向，例如 `x`、`y`、`z`。 |
| `bottomRadius` | `number` | `cone` 使用。 |
| `topRadius` | `number` | `cone` 使用。 |
| `points` | `number[][]` | `extrudedPolygon` 使用，定義 2D polygon points。 |

### 2.9 CadReference

`CadReference` 不直接把 CAD 內容放進 JSON，而是指向外部 artifact。

```json
{
  "artifactRef": "artifact://cad/package-step-abc123",
  "path": "package.step",
  "digest": "sha256:...",
  "unit": "mm",
  "importOptions": {
    "healGeometry": true
  }
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `artifactRef` | `string` | Artifact registry reference。 |
| `path` | `string` | Optional。Artifact 內部或本地相對路徑。 |
| `digest` | `string` | Immutable digest，用於重現與安全驗證。 |
| `unit` | `string` | CAD artifact 原始單位。 |
| `importOptions` | `object` | Optional。Backend import 使用的受控參數。 |

### 2.10 MeshReference

`MeshReference` 指向外部 mesh artifact。

```json
{
  "artifactRef": "artifact://mesh/package-preview-abc123",
  "path": "package.glb",
  "digest": "sha256:...",
  "unit": "mm"
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `artifactRef` | `string` | Mesh artifact reference。 |
| `path` | `string` | Optional。Artifact 內部或本地相對路徑。 |
| `digest` | `string` | Immutable digest。 |
| `unit` | `string` | Mesh artifact 原始單位。 |

### 2.11 ParametricDefinition

`ParametricDefinition` 用受控 library 和參數描述 geometry。V1 可先保留 extension point，不一定立即實作。

```json
{
  "library": "package-primitives",
  "primitive": "roundedBox",
  "parameters": {
    "size": [8, 8, 0.15],
    "cornerRadius": 0.05
  }
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `library` | `string` | 受控 parametric library ID。 |
| `primitive` | `string` | Library 中的 primitive 或 generator 名稱。 |
| `parameters` | `object` | Generator 所需參數。 |

### 2.12 DerivedDefinition

`DerivedDefinition` 表示此 body 由其他 body 或 operation 衍生。V1 可先保留 extension point，backend engine 再逐步支援。

```json
{
  "operation": "offset",
  "inputBodyRefs": ["die-001"],
  "parameters": {
    "distance": 0.03
  }
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `operation` | `string` | 衍生操作，例如 `offset`、`booleanUnion`、`booleanSubtract`、`sweep`。 |
| `inputBodyRefs` | `string[]` | 參與衍生操作的 body IDs。 |
| `parameters` | `object` | Operation-specific parameters。 |

### 2.13 MaterialDefinition

`MaterialDefinition` 可用於 document 內部簡化 material registry，也可以只用 `materialRef` 指向外部 DB。

```json
{
  "id": "silicon",
  "name": "Silicon",
  "source": {
    "type": "materialDb",
    "ref": "MAT-SI-001"
  }
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Document 內部 material ID。 |
| `name` | `string` | Human-readable material name。 |
| `source` | `object` | Optional。外部 material database reference。 |

### 2.14 Provenance

`Provenance` 記錄 geometry 來自哪個 process step、field values 與 behavior implementation。

```json
{
  "stepRefId": "molding-step",
  "processStepTemplateId": "molding",
  "processStepTemplateVersion": "1.0.0",
  "sourceFieldIds": ["moldThickness", "moldMaterial"],
  "behaviorId": "molding-simple-geometry",
  "behaviorVersion": "1.0.0",
  "inputHash": "sha256:..."
}
```

欄位說明：

| Field | Type | Purpose |
| --- | --- | --- |
| `stepRefId` | `string` | Flow template 中的 stable step reference ID。 |
| `processStepTemplateId` | `string` | Process step template ID。 |
| `processStepTemplateVersion` | `string` | Process step template version。 |
| `sourceFieldIds` | `string[]` | 影響此 geometry 的 field IDs。 |
| `behaviorId` | `string` | 產生此 geometry 的 behavior implementation ID。 |
| `behaviorVersion` | `string` | Behavior implementation version。 |
| `inputHash` | `string` | Input snapshot hash，用於重現與 audit。 |

## 3. Example

以下範例展示一個簡化 package：root container 有 molding envelope，child container 中有 die。Die 與 molding overlap 時，V1 engine 使用 `replaceParentVolume`，因此 die 所在區域由 silicon die 取代 molding material。

```json
{
  "schemaVersion": "geometry-v1",
  "unitSystem": {
    "length": "mm",
    "angle": "deg"
  },
  "compositionPolicy": {
    "mode": "replaceParentVolume"
  },
  "rootContainer": {
    "id": "package-root",
    "type": "container",
    "name": "Package Root",
    "transform": {
      "translate": [0, 0, 0],
      "rotate": [0, 0, 0],
      "scale": [1, 1, 1]
    },
    "bodies": [
      {
        "id": "molding-body",
        "name": "Molding Body",
        "featureType": "molding",
        "format": "simple",
        "shape": {
          "type": "box",
          "size": [20, 20, 1.2]
        },
        "materialRef": "mold-compound",
        "composition": {
          "mode": "replaceParentVolume"
        }
      }
    ],
    "children": [
      {
        "id": "die-stack",
        "type": "container",
        "name": "Die Stack",
        "transform": {
          "translate": [0, 0, 0.25],
          "rotate": [0, 0, 0],
          "scale": [1, 1, 1]
        },
        "bodies": [
          {
            "id": "die-001",
            "name": "Top Die",
            "featureType": "die",
            "format": "simple",
            "shape": {
              "type": "box",
              "size": [8, 8, 0.15]
            },
            "materialRef": "silicon",
            "composition": {
              "mode": "replaceParentVolume"
            },
            "provenance": {
              "stepRefId": "die-attach-step",
              "processStepTemplateId": "die-attach",
              "processStepTemplateVersion": "1.0.0",
              "sourceFieldIds": ["dieSizeX", "dieSizeY", "dieThickness"],
              "behaviorId": "die-attach-simple-geometry",
              "behaviorVersion": "1.0.0"
            }
          }
        ],
        "children": []
      }
    ]
  },
  "materials": [
    {
      "id": "mold-compound",
      "name": "Mold Compound"
    },
    {
      "id": "silicon",
      "name": "Silicon"
    }
  ]
}
```

## 4. V1 Design Notes

- Container tree 表達組裝階層與 local coordinate，不代表 container 本身有體積。
- GeometryBody 才是 canonical volume feature。
- `replaceParentVolume` 是 V1 的核心 overlap policy，應由 preview 與 backend engine 共同遵守。
- Sibling overlap 在 V1 預設應產生 diagnostic，避免不明確的 material 或 volume interpretation。
- JSON schema 應保持 runtime-neutral，讓 Web WASM 與 backend Python/C++ extension 可以共用。
- V1 MVP 應優先支援 `simple` primitives，再逐步加入 `cadRef`、`meshRef`、`parametric` 與 `derived`。
