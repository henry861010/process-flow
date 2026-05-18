import type {
  ControlType,
  FieldDefinition,
  FieldGroupArrayValue,
  FieldValue,
  FieldValuePayload,
  Option,
  PrimitiveOptionValue,
  ProcessFlowInstance,
  ProcessFlowTemplate,
  ProcessStepTemplate,
  ReferenceValue,
  RepeatItemValue,
  SelectionMode,
  StepValueSet,
  ValueType
} from "./types";

const ARRAY_VALUE_TYPES = new Set<ValueType>([
  "string[]",
  "integer[]",
  "float[]",
  "material[]",
  "layoutReference[]",
  "geometryReference[]"
]);

const REFERENCE_VALUE_TYPES = new Set<ValueType>([
  "material",
  "layoutReference",
  "geometryReference",
  "material[]",
  "layoutReference[]",
  "geometryReference[]"
]);

const PRIMITIVE_OPTION_VALUE_TYPES = new Set<ValueType>([
  "string",
  "integer",
  "float",
  "string[]",
  "integer[]",
  "float[]"
]);

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export function nowIso() {
  return new Date().toISOString();
}

export function findStepTemplate(
  stepTemplates: ProcessStepTemplate[],
  stepTemplateId: string,
  stepTemplateVersion: string
) {
  return stepTemplates.find(
    (template) => template.id === stepTemplateId && template.version === stepTemplateVersion
  );
}

export function isArrayValueType(valueType: ValueType) {
  return ARRAY_VALUE_TYPES.has(valueType);
}

export function itemValueType(valueType: ValueType): ValueType {
  if (valueType === "string[]") {
    return "string";
  }

  if (valueType === "integer[]") {
    return "integer";
  }

  if (valueType === "float[]") {
    return "float";
  }

  if (valueType === "material[]") {
    return "material";
  }

  if (valueType === "layoutReference[]") {
    return "layoutReference";
  }

  if (valueType === "geometryReference[]") {
    return "geometryReference";
  }

  return valueType;
}

export function isNumericValueType(valueType: ValueType) {
  return itemValueType(valueType) === "integer" || itemValueType(valueType) === "float";
}

export function isReferenceValueType(valueType: ValueType) {
  return REFERENCE_VALUE_TYPES.has(valueType);
}

export function isPrimitiveOptionValueType(valueType: ValueType) {
  return PRIMITIVE_OPTION_VALUE_TYPES.has(valueType);
}

export function referenceTypeForValueType(valueType: ValueType) {
  const baseValueType = itemValueType(valueType);

  if (baseValueType === "layoutReference") {
    return "layout";
  }

  if (baseValueType === "geometryReference") {
    return "geometry";
  }

  return "material";
}

export function defaultControlTypeForValueType(valueType: ValueType): ControlType {
  if (valueType === "fieldGroupArray") {
    return "repeater";
  }

  if (valueType === "boolean") {
    return "checkbox";
  }

  if (valueType === "integer" || valueType === "float") {
    return "number";
  }

  if (isReferenceValueType(valueType)) {
    return "referenceSelect";
  }

  if (isArrayValueType(valueType)) {
    return "select";
  }

  return "text";
}

export function defaultSelectionModeForValueType(valueType: ValueType): SelectionMode | null {
  if (isArrayValueType(valueType)) {
    return "multiple";
  }

  if (
    valueType === "string" ||
    valueType === "integer" ||
    valueType === "float" ||
    isReferenceValueType(valueType)
  ) {
    return "single";
  }

  return null;
}

export function isRepeaterField(field: FieldDefinition) {
  return field.controlType === "repeater" || field.valueType === "fieldGroupArray";
}

export function isFieldGroupArrayValue(value: FieldValue["value"]): value is FieldGroupArrayValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "items" in value &&
      Array.isArray(value.items)
  );
}

function repeatItemLabel(field: FieldDefinition, index: number) {
  const template = field.repeatDefinition?.itemLabelTemplate ?? `${field.label} {{index}}`;

  return template.replaceAll("{{index}}", String(index));
}

export function createRepeatItem(field: FieldDefinition, itemOffset: number): RepeatItemValue {
  const repeatDefinition = field.repeatDefinition;
  const indexBase = repeatDefinition?.indexBase ?? 1;
  const index = indexBase + itemOffset;

  return {
    itemId: `${field.id}_${index}_${shortId()}`,
    index,
    label: repeatItemLabel(field, index),
    fieldValues: repeatDefinition?.itemFieldDefinitions.map(createFieldValue) ?? []
  };
}

export function createFieldGroupArrayValue(field: FieldDefinition, count?: number): FieldGroupArrayValue {
  const repeatDefinition = field.repeatDefinition;
  const minItems = repeatDefinition?.minItems ?? (field.required ? 1 : 0);
  const maxItems = repeatDefinition?.maxItems;
  const requestedCount = Math.max(0, count ?? minItems);
  const itemCount = maxItems === undefined ? requestedCount : Math.min(requestedCount, maxItems);

  return {
    items: Array.from({ length: itemCount }, (_, index) => createRepeatItem(field, index))
  };
}

export function initialValueForField(field: FieldDefinition): FieldValuePayload {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (isRepeaterField(field)) {
    return createFieldGroupArrayValue(field);
  }

  if (isArrayValueType(field.valueType)) {
    return [];
  }

  if (field.valueType === "boolean") {
    return false;
  }

  return null;
}

export function createFieldValue(field: FieldDefinition): FieldValue {
  return {
    fieldId: field.id,
    value: initialValueForField(field),
    source: null,
    assumption: null,
    unknown: false,
    attachmentRefs: [],
    reviewRecords: []
  };
}

export function createStepValueSet(
  stepRefId: string,
  stepTemplate: ProcessStepTemplate
): StepValueSet {
  return {
    stepRefId,
    processStepTemplateId: stepTemplate.id,
    processStepTemplateVersion: stepTemplate.version,
    fieldValues: stepTemplate.fieldDefinitions.map(createFieldValue)
  };
}

export function createInstanceFromTemplate(
  template: ProcessFlowTemplate,
  stepTemplates: ProcessStepTemplate[],
  productName: string
): ProcessFlowInstance {
  const timestamp = nowIso();
  const nameSlug = slugify(productName) || "instance";

  return {
    id: `flow_inst_${nameSlug}_${Date.now()}`,
    productName,
    lifecycleStatus: "draft",
    processFlowTemplateId: template.id,
    processFlowTemplateVersion: template.version,
    stepValueSets: template.stepRefs
      .filter((stepRef) => stepRef.enabled)
      .map((stepRef) => {
        const stepTemplate = findStepTemplate(
          stepTemplates,
          stepRef.processStepTemplateId,
          stepRef.processStepTemplateVersion
        );

        if (!stepTemplate) {
          return {
            stepRefId: stepRef.stepRefId,
            processStepTemplateId: stepRef.processStepTemplateId,
            processStepTemplateVersion: stepRef.processStepTemplateVersion,
            fieldValues: []
          };
        }

        return createStepValueSet(stepRef.stepRefId, stepTemplate);
      }),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createDraftFlowTemplate(name: string, stepRefs: ProcessFlowTemplate["stepRefs"]) {
  const nameSlug = slugify(name) || "new_technology";

  return {
    id: `flow_tpl_${nameSlug}_${Date.now()}`,
    name,
    description: `${name} process flow template created from the V1 PoC flow builder.`,
    version: "0.1.0",
    owner: "simulation-team",
    status: "draft" as const,
    stepRefs
  };
}

export function createDraftStepTemplate(
  name: string,
  categoryId: string,
  fields: FieldDefinition[]
): ProcessStepTemplate {
  const nameSlug = slugify(name) || "custom_step";

  return {
    id: `step_tpl_${nameSlug}_${Date.now()}`,
    version: "1.0.0",
    name,
    categoryId: categoryId.trim() || "custom.general",
    purpose: "User-created process step template for V1 PoC testing.",
    owner: "simulation-team",
    status: "draft",
    fieldDefinitions: fields
  };
}

export function updateFieldValue(
  valueSet: StepValueSet,
  fieldId: string,
  nextValue: FieldValue
): StepValueSet {
  return {
    ...valueSet,
    fieldValues: valueSet.fieldValues.map((fieldValue) =>
      fieldValue.fieldId === fieldId ? nextValue : fieldValue
    )
  };
}

export function parseOptionValue(value: string, valueType: ValueType): PrimitiveOptionValue | null {
  const primitiveType = itemValueType(valueType);

  if (primitiveType === "integer" || primitiveType === "float") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return value;
}

function fieldPath(stepTemplateName: string, parts: string[]) {
  return `${stepTemplateName}: ${parts.join(" / ")}`;
}

function isEmptyFieldValue(field: FieldDefinition, fieldValue: FieldValue) {
  if (isRepeaterField(field)) {
    return !isFieldGroupArrayValue(fieldValue.value) || fieldValue.value.items.length === 0;
  }

  if (Array.isArray(fieldValue.value)) {
    return fieldValue.value.length === 0;
  }

  return fieldValue.value === null || fieldValue.value === "";
}

function repeatValueLabel(field: FieldDefinition, item: RepeatItemValue) {
  return item.label ?? repeatItemLabel(field, item.index);
}

function validateNumber(
  field: FieldDefinition,
  value: unknown,
  stepTemplateName: string,
  currentPath: string[]
) {
  const errors: string[] = [];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${fieldPath(stepTemplateName, currentPath)} must be a valid number.`);
    return errors;
  }

  if (itemValueType(field.valueType) === "integer" && !Number.isInteger(value)) {
    errors.push(`${fieldPath(stepTemplateName, currentPath)} must be an integer.`);
  }

  if (field.validation?.min !== undefined) {
    const invalid = field.validation.exclusiveMin
      ? value <= field.validation.min
      : value < field.validation.min;

    if (invalid) {
      errors.push(
        `${fieldPath(stepTemplateName, currentPath)} must be ${
          field.validation.exclusiveMin ? ">" : ">="
        } ${field.validation.min}.`
      );
    }
  }

  if (field.validation?.max !== undefined) {
    const invalid = field.validation.exclusiveMax
      ? value >= field.validation.max
      : value > field.validation.max;

    if (invalid) {
      errors.push(
        `${fieldPath(stepTemplateName, currentPath)} must be ${
          field.validation.exclusiveMax ? "<" : "<="
        } ${field.validation.max}.`
      );
    }
  }

  return errors;
}

function validateString(
  field: FieldDefinition,
  value: unknown,
  stepTemplateName: string,
  currentPath: string[]
) {
  const errors: string[] = [];

  if (typeof value !== "string") {
    errors.push(`${fieldPath(stepTemplateName, currentPath)} must be text.`);
    return errors;
  }

  if (field.validation?.minLength !== undefined && value.length < field.validation.minLength) {
    errors.push(`${fieldPath(stepTemplateName, currentPath)} must be at least ${field.validation.minLength} characters.`);
  }

  if (field.validation?.maxLength !== undefined && value.length > field.validation.maxLength) {
    errors.push(`${fieldPath(stepTemplateName, currentPath)} must be at most ${field.validation.maxLength} characters.`);
  }

  if (field.validation?.regex) {
    try {
      const pattern = new RegExp(field.validation.regex);

      if (!pattern.test(value)) {
        errors.push(`${fieldPath(stepTemplateName, currentPath)} does not match the required format.`);
      }
    } catch {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} has an invalid validation regex.`);
    }
  }

  return errors;
}

function optionMatches(option: Option, value: PrimitiveOptionValue) {
  return option.value === value && !option.disabled;
}

function validateOptionValue(
  field: FieldDefinition,
  value: unknown,
  stepTemplateName: string,
  currentPath: string[]
) {
  const errors: string[] = [];
  const options = field.optionSource?.options;

  if (!options?.length) {
    return errors;
  }

  const values = Array.isArray(value) ? value : [value];

  for (const item of values) {
    if (typeof item !== "string" && typeof item !== "number") {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must use primitive option values.`);
      continue;
    }

    if (!options.some((option) => optionMatches(option, item))) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} includes an option not allowed by optionSource.`);
    }
  }

  return errors;
}

function isReferenceValue(value: unknown): value is ReferenceValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "referenceType" in value &&
      "sourceId" in value &&
      "entityType" in value &&
      "entityId" in value &&
      "displayName" in value
  );
}

function validateReferenceValue(
  field: FieldDefinition,
  value: unknown,
  stepTemplateName: string,
  currentPath: string[]
) {
  const errors: string[] = [];
  const values = Array.isArray(value) ? value : [value];

  for (const item of values) {
    if (!isReferenceValue(item)) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must be a valid reference value.`);
      continue;
    }

    if (field.reference?.sourceId && item.sourceId !== field.reference.sourceId) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must reference source ${field.reference.sourceId}.`);
    }

    if (field.reference?.entityType && item.entityType !== field.reference.entityType) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must reference entity type ${field.reference.entityType}.`);
    }
  }

  return errors;
}

function validateFieldValueShape(
  field: FieldDefinition,
  fieldValue: FieldValue,
  stepTemplateName: string,
  currentPath: string[]
) {
  const errors: string[] = [];
  const value = fieldValue.value;

  if (value === null || value === "") {
    return errors;
  }

  if (isRepeaterField(field)) {
    return errors;
  }

  if (isArrayValueType(field.valueType)) {
    if (!Array.isArray(value)) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must be an array.`);
      return errors;
    }

    if (isReferenceValueType(field.valueType)) {
      return validateReferenceValue(field, value, stepTemplateName, currentPath);
    }

    for (const item of value) {
      if (isNumericValueType(field.valueType)) {
        errors.push(...validateNumber(field, item, stepTemplateName, currentPath));
      } else {
        errors.push(...validateString(field, item, stepTemplateName, currentPath));
      }
    }

    errors.push(...validateOptionValue(field, value, stepTemplateName, currentPath));
    return errors;
  }

  if (isReferenceValueType(field.valueType)) {
    errors.push(...validateReferenceValue(field, value, stepTemplateName, currentPath));
    return errors;
  }

  if (isNumericValueType(field.valueType)) {
    errors.push(...validateNumber(field, value, stepTemplateName, currentPath));
    errors.push(...validateOptionValue(field, value, stepTemplateName, currentPath));
    return errors;
  }

  if (field.valueType === "boolean") {
    if (typeof value !== "boolean") {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must be true or false.`);
    }

    return errors;
  }

  if (field.valueType === "string") {
    errors.push(...validateString(field, value, stepTemplateName, currentPath));
    errors.push(...validateOptionValue(field, value, stepTemplateName, currentPath));
  }

  return errors;
}

function validateFieldValue(
  field: FieldDefinition,
  fieldValue: FieldValue,
  stepTemplateName: string,
  path: string[]
) {
  const errors: string[] = [];
  const currentPath = [...path, field.label];

  if (fieldValue.unknown) {
    if (fieldValue.value !== null) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must have null value when marked unknown.`);
    }

    return errors;
  }

  if (field.required && isEmptyFieldValue(field, fieldValue)) {
    errors.push(`${fieldPath(stepTemplateName, currentPath)} is required.`);
  }

  if (isRepeaterField(field)) {
    if (!isFieldGroupArrayValue(fieldValue.value)) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must be a repeatable field group.`);
      return errors;
    }

    const itemCount = fieldValue.value.items.length;
    const minItems = field.repeatDefinition?.minItems;
    const maxItems = field.repeatDefinition?.maxItems;

    if (minItems !== undefined && itemCount < minItems) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must include at least ${minItems} item(s).`);
    }

    if (maxItems !== undefined && itemCount > maxItems) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must include no more than ${maxItems} item(s).`);
    }

    const childDefinitions = field.repeatDefinition?.itemFieldDefinitions ?? [];

    for (const item of fieldValue.value.items) {
      for (const childField of childDefinitions) {
        const childValue = item.fieldValues.find((candidate) => candidate.fieldId === childField.id);

        if (!childValue) {
          errors.push(
            `${fieldPath(stepTemplateName, [...currentPath, repeatValueLabel(field, item)])}: missing field value for ${childField.label}.`
          );
          continue;
        }

        errors.push(
          ...validateFieldValue(childField, childValue, stepTemplateName, [
            ...currentPath,
            repeatValueLabel(field, item)
          ])
        );
      }
    }

    return errors;
  }

  errors.push(...validateFieldValueShape(field, fieldValue, stepTemplateName, currentPath));
  return errors;
}

export function validateInstance(
  instance: ProcessFlowInstance,
  template: ProcessFlowTemplate,
  stepTemplates: ProcessStepTemplate[]
) {
  const errors: string[] = [];

  if (!instance.productName.trim()) {
    errors.push("Product / instance name is required.");
  }

  if (!instance.processFlowTemplateId || !instance.processFlowTemplateVersion) {
    errors.push("Instance must reference a process flow template id and version.");
  }

  const enabledStepRefs = template.stepRefs.filter((stepRef) => stepRef.enabled);

  for (const stepRef of enabledStepRefs) {
    const valueSet = instance.stepValueSets.find((item) => item.stepRefId === stepRef.stepRefId);
    const stepTemplate = findStepTemplate(
      stepTemplates,
      stepRef.processStepTemplateId,
      stepRef.processStepTemplateVersion
    );

    if (!valueSet) {
      errors.push(`Missing value set for ${stepRef.stepRefId}.`);
      continue;
    }

    if (!stepTemplate) {
      errors.push(`Missing step template for ${stepRef.processStepTemplateId}.`);
      continue;
    }

    for (const field of stepTemplate.fieldDefinitions) {
      const fieldValue = valueSet.fieldValues.find((item) => item.fieldId === field.id);

      if (!fieldValue) {
        errors.push(`${stepTemplate.name}: missing field value for ${field.label}.`);
        continue;
      }

      errors.push(...validateFieldValue(field, fieldValue, stepTemplate.name, []));
    }
  }

  return errors;
}
