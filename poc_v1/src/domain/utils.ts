import type {
  FieldDefinition,
  FieldGroupArrayValue,
  FieldValue,
  ProcessFlowInstance,
  ProcessFlowTemplate,
  ProcessStepTemplate,
  RepeatItemValue,
  StepValueSet
} from "./types";

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

export function createRepeatItem(field: FieldDefinition, itemOffset: number): RepeatItemValue {
  const repeatDefinition = field.repeatDefinition;
  const indexBase = repeatDefinition?.indexBase ?? 1;
  const index = indexBase + itemOffset;

  return {
    itemId: `${field.id}_${index}_${shortId()}`,
    index,
    fieldValues: repeatDefinition?.itemFieldDefinitions.map(createFieldValue) ?? []
  };
}

export function createFieldGroupArrayValue(field: FieldDefinition, count?: number): FieldGroupArrayValue {
  const repeatDefinition = field.repeatDefinition;
  const minItems = repeatDefinition?.minItems ?? (field.required ? 1 : 0);
  const itemCount = Math.max(0, count ?? minItems);

  return {
    items: Array.from({ length: itemCount }, (_, index) => createRepeatItem(field, index))
  };
}

export function initialValueForField(field: FieldDefinition) {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (isRepeaterField(field)) {
    return createFieldGroupArrayValue(field);
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
  fields: FieldDefinition[]
): ProcessStepTemplate {
  const nameSlug = slugify(name) || "custom_step";

  return {
    id: `step_tpl_${nameSlug}_${Date.now()}`,
    version: "1.0.0",
    name,
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

function repeatItemLabel(field: FieldDefinition, item: RepeatItemValue) {
  const template = field.repeatDefinition?.itemLabelTemplate ?? `${field.label} {{index}}`;

  return template.replaceAll("{{index}}", String(item.index));
}

function validateFieldValue(
  field: FieldDefinition,
  fieldValue: FieldValue,
  stepTemplateName: string,
  path: string[]
) {
  const errors: string[] = [];
  const currentPath = [...path, field.label];

  if (field.required && !fieldValue.unknown && isEmptyFieldValue(field, fieldValue)) {
    errors.push(`${fieldPath(stepTemplateName, currentPath)} is required.`);
  }

  if (isRepeaterField(field)) {
    if (fieldValue.unknown) {
      return errors;
    }

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
            `${fieldPath(stepTemplateName, [...currentPath, repeatItemLabel(field, item)])}: missing field value for ${childField.label}.`
          );
          continue;
        }

        errors.push(
          ...validateFieldValue(childField, childValue, stepTemplateName, [
            ...currentPath,
            repeatItemLabel(field, item)
          ])
        );
      }
    }

    return errors;
  }

  if (
    field.controlType === "number" &&
    !fieldValue.unknown &&
    fieldValue.value !== null &&
    fieldValue.value !== ""
  ) {
    if (typeof fieldValue.value !== "number" || !Number.isFinite(fieldValue.value)) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must be a valid number.`);
    }

    if (
      typeof fieldValue.value === "number" &&
      field.validation?.min !== undefined &&
      fieldValue.value < field.validation.min
    ) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must be >= ${field.validation.min}.`);
    }

    if (
      typeof fieldValue.value === "number" &&
      field.validation?.max !== undefined &&
      fieldValue.value > field.validation.max
    ) {
      errors.push(`${fieldPath(stepTemplateName, currentPath)} must be <= ${field.validation.max}.`);
    }
  }

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
