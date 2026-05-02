# Process-Flow

A comprehensive framework designed to empower semiconductor integration engineers to intuitively compose, visualize, and analyze manufacturing process flows.

## Overview
In the complex landscape of semiconductor manufacturing, communication and visualization of process flows across different engineering teams are critical. **Process-Flow** provides a standardized, user-friendly platform to construct process sequences using predefined prototypes. It bridges the gap between abstract process steps and physical reality by automatically generating 3D geometric views and high-fidelity FEM meshes directly from the composed flow.

## Key Features

* **Intuitive Process Composition:** A seamless frontend interface allowing engineers to easily build process flows step-by-step. Users can manage complex layer stacks and toggle visibility just like navigating a component tree.
* **Automated 3D Visualization:** Instantly generate and render 3D geometric representations of the wafer structure at any step in the process flow. This allows engineers to visually verify their designs and catch integration issues early.
* **Advanced FEM Mesh Generation:** Seamlessly export complex 3D geometries into optimized finite element meshes. This prepares the structure for rigorous downstream mechanism analysis, such as large-scale thermal, structural, or fluid dynamics simulations of the device.
* **Standardized Data Structure:** Utilizes a rigorously defined, format-agnostic data structure to represent process flows. This ensures effortless storage, retrieval from databases, and standardized exchange of process recipes between different engineering teams—with the ultimate goal of establishing a new industry standard format.

## System Architecture

The framework is decoupled into three core pillars to ensure scalability and performance:

### 1. Frontend (User Interface & 3D Viewer)
Provides the interactive environment for the integration engineer. 
* Enables drag-and-drop composition and parameter configuration for various process prototypes (e.g., Lithography, Etch, Deposition).
* Renders the generated 3D geometries directly in the browser for rapid visual feedback.
* *Suggested Tech Stack: Next.js, TypeScript, Three.js*

## Getting Started

*(Coming Soon)*
Details on environment setup, local installation, and running the development servers for both the frontend and backend architectures.

## Roadmap
- [ ] Define the core v1.0 data structure schema.
- [ ] Implement basic process prototypes (Deposition, Etch).
- [ ] Establish the backend 3D boolean geometry engine.
- [ ] Build the interactive frontend canvas.
- [ ] Integrate FEM meshing export capabilities.

## Contributing
Contributions are welcome! Whether you are an integration engineer with ideas for new process prototypes, or a software developer looking to optimize our meshing algorithms or 3D rendering pipeline, please feel free to submit a Pull Request.

-----------------------------------------
## Development Document
### 1. Data Structure (The Standard)
#### 1. Basic Structure

| Data Type | `rangeType = None` | `rangeType = 1` (Bounded) | `rangeType = 2` (Discrete Options) |
| :--- | :--- | :--- | :--- |
| **Bool** | Any valid boolean | - | - |
| **Int** | Any valid integer | Value must be within `[bottom_value, upper_value]` | Value must be an option from `[value1, value2, ...]` |
| **Float** | Any valid float | Value must be within `[bottom_value, upper_value]` | Value must be an option from `[value1, value2, ...]` |

**Field Definitions:**
* **`rangeType`**: Defines the allowed boundary or options for the field. 
  * If `None` (or undefined), the value can be anything valid within that specific data type. 
  * If defined, the value is strictly constrained to the rules corresponding to that `rangeType`.

#### 2. Framework-defined structure
1. **geoemetry_s**
2. **material_s**
    * The material in eRD **material DB**
3. **processPrototype_s**
    * process prototype is used to define the process behavier, process parameter and obsevtion of the process. It is the prototype of the process, it would not have the value
    * **processParameters** is the paramterrs to control the process, like the process machine setting, working tmeperature...
    * **observationParameters** is the additional field used to help the framework generate the geometry due to lack knowledge or capacity to simulation real effect of process on real physical model. for exampele, in fill underfill, process, we don't sure how height of the UF between die until  we finish process, the heigh could be the observation parameter.
    * <details>
        <summary>Naming Rule</summary>
        Naming & category Rule for (version, category, subCategory)
      </details>
    ```
        {
            "id": the id in process prototype DB
            "UIname": UI_NAME
            "version": v_X_Y_Z
            "description": DESCRIBE_THE_PROCESS_AND_PARAMTERS
            "category": the category of the process
            "subCategory": the sub category of the process
            "program": PROGRAM_TO_PROCESS_GEOMETRY
            "processParameters": {
                "PARAMETER_NAME1" :{
                    "UIname": UI_NAME
                    "isOptional": true/false (default true)
                    "type": bool/int/float/materialID/geometryID/processPrototypeID
                    "rangeType": 1/2/3/4... (optional, default None)
                    "range": xxx (optional, basic on (type, rangeType) definition)
                }
                ...
            }
            "observationParameters": {
                "PARAMETER_NAME1" :{
                    "UIname": UI_NAME
                    "isOptional": true/false (default true)
                    "type": bool/int/float/materialID/geometryID/processPrototypeID
                    "rangeType": 1/2/3/4... (optional, default None)
                    "range": xxx (optional, basic on (type, rangeType) definition)
                }
                ...
            }
        }
    ```
4. **process_s** & **processFlow_s**
    1. **processFlow_s**
        * <details>
            <summary>Naming Rule</summary>
            Naming & category Rule for (version, category, subCategory)
          </details>
        ```
            {
                "id": the id in process flow DB
                "pkg":
                "tv":
                "owner": the owner of this process flow
                "version": the version of the pkg-tv
                "processs" [process_s, process_s, ...] the array of the process_s
            }
        ```
    2. **process_s**
        ```
            {
                "processPrototypeId": PROCESS_PROTOTYPE_ID
                "processParameters": {
                    "PARAMETER_NAME1": VALUE
                    "PARAMETER_NAME2": VALUE
                    ...
                }
                "observationParameters": {
                    "PARAMETER_NAME1": VALUE
                    "PARAMETER_NAME2": VALUE
                    ...
                }
            }
        ```