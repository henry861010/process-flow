# Geometry JSON Document

這份文件描述目前 Python 實作中，對一個已建立好的 `Container`
呼叫 `.json()` 後會得到的 JSON 結構，以及 viewer 或 geometry engine
應該如何閱讀這份資料。

本文只描述目前程式碼實際輸出的資料格式。現在的 JSON root object 是
`Container.json()` 的回傳值，不包含額外的 `schemaVersion`、`unitSystem`
或 document wrapper。

## 1. 產生方式

Python 端會先建立一棵 container tree，最後對 root container 呼叫：

```python
payload = root_container.json()
```

如果要輸出成真正的 JSON 文字，可以使用：

```python
import json

json_text = json.dumps(payload, ensure_ascii=False, indent=2)
```

`payload` 本身是一個只包含 Python built-in container 與 scalar value 的
dictionary，可以直接交給 `json.dumps()`。

## 2. Root 結構

`Container.json()` 回傳的 root 結構如下：

```json
{
  "key": "package-root",
  "bodies": [],
  "vias": [],
  "circuits": [],
  "bumps": [],
  "children": []
}
```

欄位說明：

| Field | Type | Description |
| --- | --- | --- |
| `key` | `string` | Container 的名稱或 debug key。 |
| `bodies` | `Body[]` | 直接屬於此 container 的實體幾何體。 |
| `vias` | `ViaFeature[]` | 直接屬於此 container 的 via density feature。 |
| `circuits` | `CircuitFeature[]` | 直接屬於此 container 的 circuit density feature。 |
| `bumps` | `BumpFeature[]` | 直接屬於此 container 的 bump density feature。 |
| `children` | `Container[]` | Child containers。每個 child 也是同一種 container JSON 結構。 |

目前 container JSON 不輸出 parent reference，避免 tree 序列化時形成 cycle。

## 3. Container 語意

Container 是一個語意分組節點。它本身不代表材料，也不直接佔有實體體積。
真正有體積的資料放在 `bodies` 裡面。

目前實作中的座標都已經是 global coordinates。Container 不輸出 local
transform，也沒有 `translate`、`rotate`、`scale` 欄位。因此 viewer 讀取時
可以直接用每個 geometry 內的座標建立 Three.js geometry。

### 3.1 Parent 與 Child 的體積規則

當 child container 中的實體 body 與 parent container 中的實體 body
在空間上重疊時，child container 會佔據該重疊區域的實體體積。

換句話說，parent body 可以代表較粗略的外殼、包覆體或背景體積；child
container 內的 body 代表更高優先權、更具體的幾何。兩者重疊時，重疊區域
不應被計算成 parent material 加 child material 兩份體積，而應由 child body
的材料與幾何語意取代 parent body 在該區域的語意。

對 viewer 而言：

1. parent container 的 `bodies` 是 parent scope 的實體體積。
2. child container 的 `bodies` 是 child scope 的實體體積。
3. child body 與 parent body overlap 時，最後的 physical volume ownership
   屬於 child body。
4. 若第一版 Three.js viewer 只做視覺化而不做 boolean subtraction，仍應在
   文件與資料解讀上保留這個語意：child overlap parent 的區域屬於 child。

目前 `.json()` 沒有定義 sibling body overlap 的解法。如果同一個 container
內的多個 `bodies` 互相重疊，這份 JSON 只能描述它們的位置與材料，不額外定義
哪一個 sibling 擁有重疊區域。

### 3.2 Via、Circuit、Bump 的作用範圍

`vias`、`circuits`、`bumps` 都是 density-based feature。它們只作用在
「持有該 array 的同一個 container」裡。

重要規則：

1. `vias` 只作用於所在 container，不會向上作用到 parent container。
2. `vias` 只作用於所在 container，不會向下作用到 child container。
3. `circuits` 只作用於所在 container，不會向上作用到 parent container。
4. `circuits` 只作用於所在 container，不會向下作用到 child container。
5. `bumps` 只作用於所在 container，不會向上作用到 parent container。
6. `bumps` 只作用於所在 container，不會向下作用到 child container。

因此，如果 root container 有一個 via feature，而 child container 中有 die
body，即使 via 的幾何範圍與 child die 的空間位置重疊，該 via feature 仍只屬於
root container scope，不會自動作用到 child die。

## 4. Feature Object 結構

### 4.1 Body

`bodies` array 內的每個元素都是一個實體 body：

```json
{
  "geometry": {},
  "material": "silicon"
}
```

欄位說明：

| Field | Type | Description |
| --- | --- | --- |
| `geometry` | `Geometry` | 實體 body 的幾何 primitive payload。 |
| `material` | `string` | 此實體 body 的材料名稱或材料 ID。 |

Body 代表真正佔有實體體積的材料區域。

### 4.2 Via Feature

`vias` array 內的每個元素：

```json
{
  "geometry": {},
  "material": "copper",
  "density": 0.3
}
```

欄位說明：

| Field | Type | Description |
| --- | --- | --- |
| `geometry` | `Geometry` | 此 via feature 的幾何作用範圍。 |
| `material` | `string` | Via feature 使用的材料名稱或材料 ID。 |
| `density` | `number` | 此幾何範圍內的有效 via density。 |

### 4.3 Circuit Feature

`circuits` array 內的每個元素：

```json
{
  "geometry": {},
  "material": "copper",
  "density": 0.5
}
```

欄位語意與 via feature 相同，但 feature type 由所在 array `circuits`
決定。

### 4.4 Bump Feature

`bumps` array 內的每個元素：

```json
{
  "geometry": {},
  "material": "solder",
  "density": 0.8
}
```

欄位語意與 via feature 相同，但 feature type 由所在 array `bumps`
決定。

## 5. Geometry Payload 結構

目前 geometry payload 沒有輸出明確的 `type` 欄位。Viewer 讀取時需要依照
geometry dictionary 裡出現的 key 來判斷 primitive 類型。

| Geometry class | 判斷方式 |
| --- | --- |
| `BoxGeometry` | 有 `bottom_left`、`top_right`、`thk`。 |
| `PolygonGeometry` | 有 `polys`、`thk`。 |
| `CylinderGeometry` | 有 `center`、`bottom_radius`、`thk`，且沒有 `top_radius`。 |
| `ConeGeometry` | 有 `center`、`bottom_radius`、`top_radius`、`thk`。 |

所有座標點都使用 `[x, y, z]`。目前 primitive 都沿 Z axis 以 `thk` 表示厚度。

### 5.1 BoxGeometry

JSON：

```json
{
  "bottom_left": [0, 0, 0],
  "top_right": [10, 10, 0],
  "thk": 1
}
```

欄位說明：

| Field | Type | Description |
| --- | --- | --- |
| `bottom_left` | `number[3]` | Box footprint 的左下角點。 |
| `top_right` | `number[3]` | Box footprint 的右上角點。 |
| `thk` | `number` | 沿 Z axis 的厚度。 |

`bottom_left[2]` 與 `top_right[2]` 代表 box 的底面 Z 位置，兩者應在同一個
XY plane。Box top Z 可以用 `bottom_z + thk` 取得。

Three.js viewer 可以用：

```text
width  = top_right.x - bottom_left.x
depth  = top_right.y - bottom_left.y
height = thk
center = [
  (bottom_left.x + top_right.x) / 2,
  (bottom_left.y + top_right.y) / 2,
  bottom_left.z + thk / 2
]
```

### 5.2 PolygonGeometry

JSON：

```json
{
  "polys": [
    [
      [0, 0, 0],
      [10, 0, 0],
      [10, 10, 0],
      [0, 10, 0]
    ]
  ],
  "thk": 1
}
```

欄位說明：

| Field | Type | Description |
| --- | --- | --- |
| `polys` | `number[][][]` | 一個或多個 polygon footprint。每個 polygon 是一組 `[x, y, z]` 點。 |
| `thk` | `number` | 沿 Z axis 的 extrusion 厚度。 |

目前實作使用第一個 polygon 的第一個點的 Z 作為底面 Z。Viewer 讀取時應把
polygon footprint 沿 Z axis extrude `thk`。

### 5.3 CylinderGeometry

JSON：

```json
{
  "center": [5, 5, 0],
  "bottom_radius": 1,
  "thk": 2
}
```

欄位說明：

| Field | Type | Description |
| --- | --- | --- |
| `center` | `number[3]` | Cylinder 底面的中心點。 |
| `bottom_radius` | `number` | Cylinder 半徑。 |
| `thk` | `number` | 沿 Z axis 的高度。 |

Cylinder top Z 可以用 `center[2] + thk` 取得。

### 5.4 ConeGeometry

JSON：

```json
{
  "center": [5, 5, 0],
  "bottom_radius": 1,
  "top_radius": 0.5,
  "thk": 2
}
```

欄位說明：

| Field | Type | Description |
| --- | --- | --- |
| `center` | `number[3]` | Cone 或 frustum 底面的中心點。 |
| `bottom_radius` | `number` | 底面半徑。 |
| `top_radius` | `number` | 頂面半徑。 |
| `thk` | `number` | 沿 Z axis 的高度。 |

當 `bottom_radius` 與 `top_radius` 相同時，這個 payload 可被視為 cylinder-like
frustum。Cone top Z 可以用 `center[2] + thk` 取得。

## 6. Viewer 讀取流程

Three.js viewer 可以用以下順序讀取：

1. 從 root container JSON 開始。
2. 讀取當前 container 的 `bodies`，建立實體 solid meshes。
3. 讀取當前 container 的 `vias`、`circuits`、`bumps`，建立只屬於當前
   container scope 的 feature meshes 或 overlay。
4. 遞迴讀取每個 `children` container。
5. 在語意上套用 parent-child composition：child body overlap parent body
   時，重疊區域由 child body 佔據。

簡化 pseudo-code：

```text
readContainer(container):
  currentBodies = read bodies from container.bodies
  currentVias = read local features from container.vias
  currentCircuits = read local features from container.circuits
  currentBumps = read local features from container.bumps

  for each child in container.children:
    childResult = readContainer(child)
    apply rule: child bodies own overlap volume against currentBodies

  return container scene/result
```

Feature scope 要由 array 所在位置決定，而不是只看幾何座標。也就是說，
`container.vias` 永遠是該 container 的 via feature，不會因為位置重疊而自動
變成 parent 或 child 的 feature。

## 7. 完整範例

以下範例表示一個 root package container，裡面有 mold body、root-level via，
以及一個 child die container。Die body 如果與 mold body 重疊，重疊區域由
child die 的 silicon body 佔據。

```json
{
  "key": "package-root",
  "bodies": [
    {
      "geometry": {
        "bottom_left": [0, 0, 0],
        "top_right": [20, 20, 0],
        "thk": 1.2
      },
      "material": "mold-compound"
    }
  ],
  "vias": [
    {
      "geometry": {
        "center": [10, 10, 0],
        "bottom_radius": 0.2,
        "thk": 1.2
      },
      "material": "copper",
      "density": 0.25
    }
  ],
  "circuits": [],
  "bumps": [],
  "children": [
    {
      "key": "die-1",
      "bodies": [
        {
          "geometry": {
            "bottom_left": [6, 6, 0.4],
            "top_right": [14, 14, 0.4],
            "thk": 0.2
          },
          "material": "silicon"
        }
      ],
      "vias": [],
      "circuits": [
        {
          "geometry": {
            "polys": [
              [
                [6, 6, 0.6],
                [14, 6, 0.6],
                [14, 7, 0.6],
                [6, 7, 0.6]
              ]
            ],
            "thk": 0.02
          },
          "material": "copper",
          "density": 0.6
        }
      ],
      "bumps": [
        {
          "geometry": {
            "center": [8, 8, 0.6],
            "bottom_radius": 0.15,
            "top_radius": 0.15,
            "thk": 0.1
          },
          "material": "solder",
          "density": 1
        }
      ],
      "children": []
    }
  ]
}
```

閱讀這份範例時：

1. `package-root.bodies[0]` 是 mold-compound 的 parent solid body。
2. `package-root.vias[0]` 是 root container scope 的 via feature，只作用在
   `package-root`，不會自動作用到 `die-1`。
3. `die-1.bodies[0]` 是 child container 的 silicon solid body。
4. `die-1.bodies[0]` 若與 `package-root.bodies[0]` overlap，overlap volume
   屬於 child silicon body。
5. `die-1.circuits[0]` 與 `die-1.bumps[0]` 只作用在 `die-1` container，
   不會作用到 `package-root`。

## 8. 目前格式限制

目前 JSON 是直接從現行 Python class 輸出，因此有幾個限制需要 viewer 注意：

1. Geometry payload 沒有明確 `type` 欄位，需要依 key pattern 判斷 shape。
2. Container 沒有輸出 local transform，現在所有座標都視為 global coordinates。
3. Container 沒有輸出 `id`，只有 `key`。
4. Body 與 feature 沒有輸出 `id` 或 `name`。
5. JSON 沒有輸出 unit system，長度單位需要由呼叫端或外部流程約定。
6. JSON 沒有輸出 material registry，`material` 目前只是字串。
7. Parent-child overlap 有明確語意：child 佔據 overlap volume。
8. Sibling overlap 目前沒有明確語意。
9. Via、circuit、bump feature 的作用範圍只限所在 container。

