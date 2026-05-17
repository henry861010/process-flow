export type TemplateStatus = "draft" | "published" | "deprecated";

export type FieldScope = "inputState" | "outputState" | "processParameter";

export type ValueType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "enum"
  | "material"
  | "layoutReference"
  | "geometryReference"
  | "fieldGroupArray";

export type ControlType =
  | "text"
  | "number"
  | "checkbox"
  | "select"
  | "referenceSelect"
  | "computed"
  | "repeater";

export type SelectionMode = "single" | "multiple";

export type LifecycleStatus =
  | "draft"
  | "pendingIntegrationReview"
  | "approved"
  | "needsClarification";

export type FieldPrimitiveValue = string | number | boolean | null;

export type ReferenceValue = {
  sourceId: string;
  entityType: string;
  entityId: string;
  label: string;
};

export type FieldGroupArrayValue = {
  items: RepeatItemValue[];
};

export type FieldValuePayload =
  | FieldPrimitiveValue
  | string[]
  | ReferenceValue
  | ReferenceValue[]
  | FieldGroupArrayValue;

export type OptionSource = {
  sourceType: "static" | "dbReference" | "apiReference";
  sourceId?: string;
  options?: {
    value: string;
    label: string;
  }[];
};

export type ReferenceDefinition = {
  sourceType: "dbReference" | "apiReference" | "localMock";
  sourceId: string;
  entityType: string;
  mockOptions?: ReferenceValue[];
};

export type DerivedRule = {
  expression: string;
  inputs: {
    fieldId: string;
    alias: string;
  }[];
};

export type RepeatDefinition = {
  itemLabelTemplate?: string;
  indexBase?: number;
  minItems?: number;
  maxItems?: number;
  itemFieldDefinitions: FieldDefinition[];
};

export type FieldDefinition = {
  id: string;
  label: string;
  description: string;
  scope: FieldScope;
  valueType: ValueType;
  controlType: ControlType;
  selectionMode?: SelectionMode | null;
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

export type ProcessStepTemplate = {
  id: string;
  version: string;
  name: string;
  purpose: string;
  owner: string;
  status: TemplateStatus;
  fieldDefinitions: FieldDefinition[];
};

export type StepRef = {
  stepRefId: string;
  processStepTemplateId: string;
  processStepTemplateVersion: string;
  enabled: boolean;
};

export type ProcessFlowTemplate = {
  id: string;
  name: string;
  description?: string;
  version: string;
  owner: string;
  status: TemplateStatus;
  stepRefs: StepRef[];
};

export type FieldValue = {
  fieldId: string;
  value: FieldValuePayload;
  source: null;
  assumption: string | null;
  unknown: boolean;
  attachmentRefs: [];
  reviewRecords: [];
};

export type RepeatItemValue = {
  itemId: string;
  index: number;
  fieldValues: FieldValue[];
};

export type StepValueSet = {
  stepRefId: string;
  processStepTemplateId: string;
  processStepTemplateVersion: string;
  fieldValues: FieldValue[];
};

export type ProcessFlowInstance = {
  id: string;
  productName: string;
  lifecycleStatus: LifecycleStatus;
  processFlowTemplateId: string;
  processFlowTemplateVersion: string;
  stepValueSets: StepValueSet[];
  createdAt: string;
  updatedAt: string;
};

export type ProcessCatalog = {
  processStepTemplates: ProcessStepTemplate[];
  processFlowTemplates: ProcessFlowTemplate[];
};

export type ProcessInstanceStore = {
  processFlowInstances: ProcessFlowInstance[];
};

export type ProcessFlowExport = {
  schemaVersion: "process-flow-v1";
  processStepTemplates?: ProcessStepTemplate[];
  processFlowTemplates?: ProcessFlowTemplate[];
  processFlowInstances?: ProcessFlowInstance[];
};
