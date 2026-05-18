export type TemplateStatus = "draft" | "published" | "deprecated";

export type FieldScope = "inputState" | "outputState" | "processParameter";

export type ValueType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "material"
  | "layoutReference"
  | "geometryReference"
  | "fieldGroupArray"
  | "string[]"
  | "integer[]"
  | "float[]"
  | "material[]"
  | "layoutReference[]"
  | "geometryReference[]";

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

export type PrimitiveOptionValue = string | number;

export type FieldPrimitiveValue = string | number | boolean | null;

export type ReferenceValue = {
  referenceType: "material" | "layout" | "geometry" | string;
  sourceId: string;
  entityType: string;
  entityId: string;
  displayName: string;
};

export type FieldGroupArrayValue = {
  items: RepeatItemValue[];
};

export type FieldValuePayload =
  | FieldPrimitiveValue
  | string[]
  | number[]
  | ReferenceValue
  | ReferenceValue[]
  | FieldGroupArrayValue;

export type Option = {
  value: PrimitiveOptionValue;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type OptionSource = {
  type: "static" | "externalReference";
  sourceId?: string;
  options?: Option[];
};

export type ReferenceDefinition = {
  sourceType: "dbReference" | "fileReference" | "manualReference" | "apiReference" | "localMock";
  sourceId: string;
  entityType: string;
  mockOptions?: ReferenceValue[];
};

export type DerivedRule = {
  calculationType?: "formula";
  expression: string;
  inputs: {
    fieldId: string;
    alias: string;
  }[];
  outputValueType?: "integer" | "float" | "string" | "boolean";
  unit?: string | null;
  recompute?: "onInputChange";
};

export type RepeatDefinition = {
  itemLabelTemplate?: string;
  indexBase?: number;
  minItems?: number;
  maxItems?: number;
  itemFieldDefinitions: FieldDefinition[];
};

export type ValidationRule = {
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  allowedUnits?: string[];
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
  validation?: ValidationRule | null;
  optionSource?: OptionSource | null;
  reference?: ReferenceDefinition | null;
  derivedRule?: DerivedRule | null;
  repeatDefinition?: RepeatDefinition | null;
};

export type StepTemplateCategory = {
  id: string;
  label: string;
  parentId: string | null;
  technologyFamily: string;
  description: string;
  tags?: string[];
};

export type ProcessStepTemplate = {
  id: string;
  version: string;
  name: string;
  categoryId: string;
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

export type SourceReference = {
  type: "spec" | "integrationNote" | "manualInput" | "materialDb" | "computed" | string;
  ref: string;
  label: string;
};

export type AttachmentReference = {
  type: "document" | "image" | "layoutFile" | string;
  ref: string;
  label: string;
};

export type ReviewStatus = "approved" | "needsClarification" | "rejected" | "waived";

export type ReviewRecord = {
  status: ReviewStatus;
  reviewer: string;
  comment: string;
  reviewedAt: string;
};

export type FieldValue = {
  fieldId: string;
  value: FieldValuePayload;
  source: SourceReference | null;
  assumption: string | null;
  unknown: boolean;
  attachmentRefs: AttachmentReference[];
  reviewRecords: ReviewRecord[];
};

export type RepeatItemValue = {
  itemId: string;
  index: number;
  label?: string;
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
  processStepTemplateCategories?: StepTemplateCategory[];
  processStepTemplates: ProcessStepTemplate[];
  processFlowTemplates: ProcessFlowTemplate[];
};

export type ProcessInstanceStore = {
  processFlowInstances: ProcessFlowInstance[];
};

export type ProcessFlowExport = {
  schemaVersion: "process-flow-v1";
  processStepTemplateCategories?: StepTemplateCategory[];
  processStepTemplates?: ProcessStepTemplate[];
  processFlowTemplates?: ProcessFlowTemplate[];
  processFlowInstances?: ProcessFlowInstance[];
};
