import type { ProcessCatalog, ProcessFlowTemplate, ProcessStepTemplate } from "@/domain/types";

export const seedStepTemplates: ProcessStepTemplate[] = [
  {
    id: "step_tpl_initial_wafer",
    version: "1.0.0",
    name: "Initial wafer",
    purpose: "Define the incoming wafer baseline state.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "waferDiameter",
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
        id: "waferThickness",
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
    purpose: "Add one test layer with material and thickness parameters.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "material",
        label: "Material",
        description: "Layer material name or placeholder reference.",
        scope: "processParameter",
        valueType: "material",
        controlType: "text",
        unit: null,
        required: true,
        reviewRequired: false
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
    purpose: "Add a test step with two material parameters and one thickness parameter.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "material1",
        label: "Material 1",
        description: "First material name or placeholder reference.",
        scope: "processParameter",
        valueType: "material",
        controlType: "text",
        unit: null,
        required: true,
        reviewRequired: false
      },
      {
        id: "material2",
        label: "Material 2",
        description: "Second material name or placeholder reference.",
        scope: "processParameter",
        valueType: "material",
        controlType: "text",
        unit: null,
        required: true,
        reviewRequired: false
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
    id: "step_tpl_rdl_build_up",
    version: "1.0.0",
    name: "RDL build-up",
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
                mockOptions: [
                  {
                    sourceId: "material_db",
                    entityType: "photo_material",
                    entityId: "pm_polyimide_a",
                    label: "Polyimide A"
                  },
                  {
                    sourceId: "material_db",
                    entityType: "photo_material",
                    entityId: "pm_pbo_b",
                    label: "PBO B"
                  }
                ]
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
    purpose: "Record a wafer or stack grind thickness.",
    owner: "simulation-team",
    status: "published",
    fieldDefinitions: [
      {
        id: "grindThickness",
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
  processStepTemplates: seedStepTemplates,
  processFlowTemplates: seedFlowTemplates
};
