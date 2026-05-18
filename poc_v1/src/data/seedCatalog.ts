import type {
  ProcessCatalog,
  ProcessFlowTemplate,
  ProcessStepTemplate,
  ReferenceValue,
  StepTemplateCategory
} from "@/domain/types";

const materialReference = (
  entityType: string,
  entityId: string,
  displayName: string
): ReferenceValue => ({
  referenceType: "material",
  sourceId: "material_db",
  entityType,
  entityId,
  displayName
});

const photoMaterials = [
  materialReference("photo_material", "PM-001", "Polyimide A"),
  materialReference("photo_material", "PM-002", "PBO B")
];

const moldCompounds = [
  materialReference("mold_compound", "MC-001", "Baseline low-warpage mold compound"),
  materialReference("mold_compound", "MC-002", "High modulus mold compound")
];

export const seedStepTemplateCategories: StepTemplateCategory[] = [
  {
    id: "wafer.initial",
    label: "Initial wafer",
    parentId: "wafer",
    technologyFamily: "wafer",
    description: "Incoming wafer baseline templates.",
    tags: ["wafer", "incoming"]
  },
  {
    id: "assembly.layer",
    label: "Layer assembly",
    parentId: "assembly",
    technologyFamily: "assembly",
    description: "Layer add/build-up process steps.",
    tags: ["layer", "stack", "thickness"]
  },
  {
    id: "routing.rdl",
    label: "RDL build-up",
    parentId: "routing",
    technologyFamily: "routing",
    description: "Redistribution layer build-up templates.",
    tags: ["rdl", "photo_material", "copper"]
  },
  {
    id: "encapsulation.molding",
    label: "Molding",
    parentId: "encapsulation",
    technologyFamily: "encapsulation",
    description: "Molding and encapsulation templates.",
    tags: ["molding", "mold_compound", "encapsulation"]
  },
  {
    id: "backside.grind",
    label: "Grind",
    parentId: "backside",
    technologyFamily: "backside",
    description: "Backside grind process steps.",
    tags: ["grind", "backside"]
  },
  {
    id: "assembly.utility",
    label: "Utility",
    parentId: "assembly",
    technologyFamily: "assembly",
    description: "Utility or placeholder process steps.",
    tags: ["utility"]
  }
];

export const seedStepTemplates: ProcessStepTemplate[] = [
  {
    id: "step_tpl_initial_wafer",
    version: "1.0.0",
    name: "Initial wafer",
    categoryId: "wafer.initial",
    purpose: "Define the incoming wafer baseline state.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "wafer_diameter",
        label: "Wafer diameter",
        description: "Incoming wafer diameter.",
        scope: "outputState",
        valueType: "float",
        controlType: "number",
        unit: "um",
        required: true,
        reviewRequired: false,
        defaultValue: 300000,
        validation: { min: 0 }
      },
      {
        id: "wafer_thickness",
        label: "Wafer thickness",
        description: "Incoming wafer thickness.",
        scope: "outputState",
        valueType: "float",
        controlType: "number",
        unit: "um",
        required: true,
        reviewRequired: false,
        defaultValue: 5000,
        validation: { min: 0 }
      }
    ]
  },
  {
    id: "step_tpl_add_layer1",
    version: "1.0.0",
    name: "Add layer1",
    categoryId: "assembly.layer",
    purpose: "Add one test layer with material and thickness parameters.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "material",
        label: "Material",
        description: "Layer material reference.",
        scope: "processParameter",
        valueType: "material",
        controlType: "referenceSelect",
        selectionMode: "single",
        unit: null,
        required: true,
        reviewRequired: false,
        reference: {
          sourceType: "localMock",
          sourceId: "material_db",
          entityType: "photo_material",
          mockOptions: photoMaterials
        }
      },
      {
        id: "thickness",
        label: "Thickness",
        description: "Layer thickness.",
        scope: "processParameter",
        valueType: "float",
        controlType: "number",
        unit: "um",
        required: true,
        reviewRequired: false,
        validation: { min: 0 }
      }
    ]
  },
  {
    id: "step_tpl_add_layer12",
    version: "1.0.0",
    name: "Add layer12",
    categoryId: "assembly.layer",
    purpose: "Add a test step with structured options and material references.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "candidate_materials",
        label: "Candidate materials",
        description: "Candidate material references under review for this layer.",
        scope: "processParameter",
        valueType: "material[]",
        controlType: "referenceSelect",
        selectionMode: "single",
        unit: null,
        required: true,
        reviewRequired: false,
        reference: {
          sourceType: "localMock",
          sourceId: "material_db",
          entityType: "photo_material",
          mockOptions: photoMaterials
        }
      },
      {
        id: "process_risk_flags",
        label: "Process risk flags",
        description: "Visible risk tags that should be considered during review.",
        scope: "processParameter",
        valueType: "string[]",
        controlType: "checkbox",
        selectionMode: "multiple",
        unit: null,
        required: false,
        reviewRequired: false,
        optionSource: {
          type: "static",
          options: [
            { value: "void_risk", label: "Void risk" },
            { value: "cte_mismatch", label: "CTE mismatch" },
            { value: "recipe_open", label: "Recipe not finalized" }
          ]
        }
      },
      {
        id: "qualified_peak_temperatures",
        label: "Qualified peak temperatures",
        description: "Qualified peak temperatures for this process window.",
        scope: "processParameter",
        valueType: "integer[]",
        controlType: "select",
        selectionMode: "multiple",
        unit: "degC",
        required: false,
        reviewRequired: false,
        optionSource: {
          type: "static",
          options: [
            { value: 245, label: "245 degC" },
            { value: 260, label: "260 degC" }
          ]
        }
      },
      {
        id: "thickness",
        label: "Thickness",
        description: "Combined test thickness.",
        scope: "processParameter",
        valueType: "float",
        controlType: "number",
        unit: "um",
        required: true,
        reviewRequired: false,
        validation: { min: 0 }
      }
    ]
  },
  {
    id: "step_tpl_molding_encapsulation",
    version: "1.0.0",
    name: "Molding / Encapsulation",
    categoryId: "encapsulation.molding",
    purpose: "Define molded package state for downstream warpage and stress analysis.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "mold_material",
        label: "Mold compound",
        description: "Mold compound used by this molding station.",
        scope: "outputState",
        valueType: "material",
        controlType: "referenceSelect",
        selectionMode: "single",
        unit: null,
        required: true,
        reviewRequired: true,
        reference: {
          sourceType: "localMock",
          sourceId: "material_db",
          entityType: "mold_compound",
          mockOptions: moldCompounds
        }
      },
      {
        id: "mold_cure_condition",
        label: "Mold cure condition",
        description: "Named cure condition or recipe family used by this molding station.",
        scope: "processParameter",
        valueType: "string",
        controlType: "select",
        selectionMode: "single",
        unit: null,
        required: false,
        reviewRequired: false,
        optionSource: {
          type: "static",
          options: [
            { value: "baseline", label: "Baseline" },
            { value: "low_warpage", label: "Low warpage" },
            { value: "high_temperature", label: "High temperature" }
          ]
        }
      },
      {
        id: "mold_thickness",
        label: "Mold thickness",
        description: "Final molded thickness after this station.",
        scope: "outputState",
        valueType: "float",
        controlType: "number",
        unit: "um",
        required: true,
        reviewRequired: true,
        validation: { min: 0, max: 2000 }
      }
    ]
  },
  {
    id: "step_tpl_rdl_build_up",
    version: "1.0.0",
    name: "RDL build-up",
    categoryId: "routing.rdl",
    purpose: "Define repeatable PM and RDL layer parameters.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "rdl_layers",
        label: "RDL layers",
        description: "Repeatable PM and RDL layer definitions.",
        scope: "processParameter",
        valueType: "fieldGroupArray",
        controlType: "repeater",
        unit: null,
        required: true,
        reviewRequired: false,
        repeatDefinition: {
          itemLabelTemplate: "RDL layer {{index}}",
          indexBase: 1,
          minItems: 1,
          maxItems: 12,
          itemFieldDefinitions: [
            {
              id: "pm_material",
              label: "PM material",
              description: "Photo-material used before this RDL layer.",
              scope: "processParameter",
              valueType: "material",
              controlType: "referenceSelect",
              selectionMode: "single",
              unit: null,
              required: true,
              reviewRequired: true,
              reference: {
                sourceType: "localMock",
                sourceId: "material_db",
                entityType: "photo_material",
                mockOptions: photoMaterials
              }
            },
            {
              id: "pm_thickness",
              label: "PM thickness",
              description: "Photo-material thickness for this layer.",
              scope: "processParameter",
              valueType: "float",
              controlType: "number",
              unit: "um",
              required: true,
              reviewRequired: true,
              validation: { min: 0 }
            },
            {
              id: "rdl_thickness",
              label: "RDL thickness",
              description: "Copper RDL thickness for this layer.",
              scope: "processParameter",
              valueType: "float",
              controlType: "number",
              unit: "um",
              required: true,
              reviewRequired: true,
              validation: { min: 0 }
            }
          ]
        }
      }
    ]
  },
  {
    id: "step_tpl_grind",
    version: "1.0.0",
    name: "Grind",
    categoryId: "backside.grind",
    purpose: "Record a wafer or stack grind thickness.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "grind_thickness",
        label: "Grind thickness",
        description: "Thickness removed by grinding.",
        scope: "processParameter",
        valueType: "float",
        controlType: "number",
        unit: "um",
        required: true,
        reviewRequired: false,
        validation: { min: 0 }
      }
    ]
  },
  {
    id: "step_tpl_flip",
    version: "1.0.0",
    name: "Flip",
    categoryId: "assembly.utility",
    purpose: "Flip the process state. No parameters are recorded in V1.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: []
  }
];

const stepRef = (
  flowPrefix: string,
  index: number,
  processStepTemplateId: string
): ProcessFlowTemplate["stepRefs"][number] => ({
  stepRefId: `${flowPrefix}_${String(index).padStart(2, "0")}_${processStepTemplateId.replace(
    "step_tpl_",
    ""
  )}`,
  processStepTemplateId,
  processStepTemplateVersion: "1.0.0",
  enabled: true
});

export const seedFlowTemplates: ProcessFlowTemplate[] = [];

export const seedCatalog: ProcessCatalog = {
  processStepTemplateCategories: seedStepTemplateCategories,
  processStepTemplates: seedStepTemplates,
  processFlowTemplates: seedFlowTemplates
};
