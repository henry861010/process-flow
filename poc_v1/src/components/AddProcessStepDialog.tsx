"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type {
  ControlType,
  FieldDefinition,
  FieldScope,
  Option,
  ReferenceDefinition,
  SelectionMode,
  ValidationRule,
  ValueType
} from "@/domain/types";
import {
  defaultControlTypeForValueType,
  defaultSelectionModeForValueType,
  isArrayValueType,
  isNumericValueType,
  isPrimitiveOptionValueType,
  isReferenceValueType,
  itemValueType,
  parseOptionValue,
  referenceTypeForValueType,
  slugify,
  createDraftStepTemplate
} from "@/domain/utils";

type AddProcessStepDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (template: ReturnType<typeof createDraftStepTemplate>) => void;
};

type DraftOption = {
  value: string;
  label: string;
  description: string;
  disabled: boolean;
};

type DraftReferenceOption = {
  entityId: string;
  displayName: string;
};

type DraftValidation = {
  min: string;
  max: string;
  exclusiveMin: boolean;
  exclusiveMax: boolean;
  minLength: string;
  maxLength: string;
  regex: string;
};

type DraftField = {
  label: string;
  id: string;
  description: string;
  scope: FieldScope;
  valueType: ValueType;
  controlType: ControlType;
  selectionMode: SelectionMode | null;
  unit: string;
  required: boolean;
  reviewRequired: boolean;
  validation: DraftValidation;
  optionSourceType: "static" | "externalReference";
  optionSourceId: string;
  options: DraftOption[];
  referenceSourceType: ReferenceDefinition["sourceType"];
  referenceSourceId: string;
  referenceEntityType: string;
  referenceOptions: DraftReferenceOption[];
  repeatItemLabelTemplate: string;
  repeatIndexBase: string;
  repeatMinItems: string;
  repeatMaxItems: string;
  childFields?: DraftField[];
};

const VALUE_TYPE_OPTIONS: ValueType[] = [
  "string",
  "integer",
  "float",
  "boolean",
  "material",
  "layoutReference",
  "geometryReference",
  "string[]",
  "integer[]",
  "float[]",
  "material[]",
  "layoutReference[]",
  "geometryReference[]",
  "fieldGroupArray"
];

const CHILD_VALUE_TYPE_OPTIONS = VALUE_TYPE_OPTIONS.filter(
  (valueType) => valueType !== "fieldGroupArray"
);

function emptyValidation(): DraftValidation {
  return {
    min: "",
    max: "",
    exclusiveMin: false,
    exclusiveMax: false,
    minLength: "",
    maxLength: "",
    regex: ""
  };
}

function defaultUnitForValueType(valueType: ValueType) {
  return isNumericValueType(valueType) ? "um" : "";
}

function isOptionControl(field: DraftField) {
  return (
    field.controlType === "select" ||
    (field.controlType === "checkbox" && field.valueType !== "boolean")
  );
}

function selectionControlNeedsMode(field: DraftField) {
  return isOptionControl(field) || field.controlType === "referenceSelect";
}

function isControlCompatible(valueType: ValueType, controlType: ControlType) {
  if (controlType === "text") {
    return valueType === "string";
  }

  if (controlType === "number") {
    return valueType === "integer" || valueType === "float";
  }

  if (controlType === "checkbox") {
    return (
      valueType === "boolean" ||
      valueType === "string" ||
      valueType === "string[]" ||
      valueType === "integer[]" ||
      valueType === "float[]"
    );
  }

  if (controlType === "select") {
    return isPrimitiveOptionValueType(valueType);
  }

  if (controlType === "referenceSelect") {
    return isReferenceValueType(valueType);
  }

  if (controlType === "repeater") {
    return valueType === "fieldGroupArray";
  }

  return false;
}

function controlOptionsForValueType(valueType: ValueType, allowRepeater: boolean): ControlType[] {
  const candidates: ControlType[] = [
    "text",
    "number",
    "checkbox",
    "select",
    "referenceSelect",
    "repeater"
  ];

  return candidates.filter(
    (controlType) =>
      controlType !== "computed" &&
      (allowRepeater || controlType !== "repeater") &&
      isControlCompatible(valueType, controlType)
  );
}

function coerceValueTypeForControl(controlType: ControlType): ValueType {
  if (controlType === "number") {
    return "float";
  }

  if (controlType === "checkbox") {
    return "boolean";
  }

  if (controlType === "select") {
    return "string";
  }

  if (controlType === "referenceSelect") {
    return "material";
  }

  if (controlType === "repeater") {
    return "fieldGroupArray";
  }

  return "string";
}

function arrayValueTypeFor(valueType: ValueType): ValueType {
  const baseValueType = itemValueType(valueType);

  if (baseValueType === "string") {
    return "string[]";
  }

  if (baseValueType === "integer") {
    return "integer[]";
  }

  if (baseValueType === "float") {
    return "float[]";
  }

  if (baseValueType === "material") {
    return "material[]";
  }

  if (baseValueType === "layoutReference") {
    return "layoutReference[]";
  }

  if (baseValueType === "geometryReference") {
    return "geometryReference[]";
  }

  return valueType;
}

function defaultReferenceEntityType(valueType: ValueType) {
  const baseValueType = itemValueType(valueType);

  if (baseValueType === "layoutReference") {
    return "layout_block";
  }

  if (baseValueType === "geometryReference") {
    return "geometry_feature";
  }

  return "material";
}

function defaultReferenceOption(valueType: ValueType): DraftReferenceOption {
  const referenceType = referenceTypeForValueType(valueType);

  return {
    entityId: `${referenceType.toUpperCase()}-001`,
    displayName: `Baseline ${referenceType} reference`
  };
}

function defaultOption(valueType: ValueType, index: number): DraftOption {
  const parsedValue =
    itemValueType(valueType) === "integer" || itemValueType(valueType) === "float"
      ? String(index + 1)
      : `option_${index + 1}`;

  return {
    value: parsedValue,
    label: `Option ${index + 1}`,
    description: "",
    disabled: false
  };
}

function reconcileField(field: DraftField, allowRepeater: boolean): DraftField {
  const controlType = isControlCompatible(field.valueType, field.controlType)
    ? field.controlType
    : defaultControlTypeForValueType(field.valueType);
  const nextControlType =
    controlType === "repeater" && !allowRepeater ? defaultControlTypeForValueType("string") : controlType;
  const usesSelectionMode =
    nextControlType === "select" ||
    nextControlType === "referenceSelect" ||
    (nextControlType === "checkbox" && field.valueType !== "boolean");
  const nextSelectionMode = usesSelectionMode
    ? field.selectionMode ?? defaultSelectionModeForValueType(field.valueType)
    : null;
  const isRepeater = field.valueType === "fieldGroupArray" && nextControlType === "repeater";

  return {
    ...field,
    controlType: nextControlType,
    selectionMode: nextSelectionMode,
    unit: isNumericValueType(field.valueType) ? field.unit || "um" : field.unit,
    referenceEntityType: field.referenceEntityType || defaultReferenceEntityType(field.valueType),
    referenceOptions:
      nextControlType === "referenceSelect" && field.referenceOptions.length === 0
        ? [defaultReferenceOption(field.valueType)]
        : field.referenceOptions,
    options:
      isOptionControl({ ...field, controlType: nextControlType }) && field.options.length === 0
        ? [defaultOption(field.valueType, 0)]
        : field.options,
    childFields: isRepeater
      ? field.childFields?.length
        ? field.childFields
        : [
            createDraftField("Material", `${field.id || "item"}_material`, "material", false),
            createDraftField("Thickness", `${field.id || "item"}_thickness`, "float", false)
          ]
      : undefined
  };
}

function createDraftField(
  label: string,
  id: string,
  valueType: ValueType = "string",
  allowRepeater = true
): DraftField {
  const controlType = defaultControlTypeForValueType(valueType);

  return reconcileField(
    {
      label,
      id,
      description: `${label} for this process step.`,
      scope: "processParameter",
      valueType,
      controlType,
      selectionMode: defaultSelectionModeForValueType(valueType),
      unit: defaultUnitForValueType(valueType),
      required: true,
      reviewRequired: false,
      validation: emptyValidation(),
      optionSourceType: "static",
      optionSourceId: "",
      options: [],
      referenceSourceType: "localMock",
      referenceSourceId: "material_db",
      referenceEntityType: defaultReferenceEntityType(valueType),
      referenceOptions: [],
      repeatItemLabelTemplate: `${label} {{index}}`,
      repeatIndexBase: "1",
      repeatMinItems: "1",
      repeatMaxItems: "12"
    },
    allowRepeater
  );
}

const initialField = createDraftField("Thickness", "thickness", "float");

function numberOrUndefined(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function integerOrUndefined(value: string) {
  const parsed = numberOrUndefined(value);

  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function validationFor(field: DraftField): ValidationRule | null {
  const validation: ValidationRule = {};
  const min = numberOrUndefined(field.validation.min);
  const max = numberOrUndefined(field.validation.max);
  const minLength = integerOrUndefined(field.validation.minLength);
  const maxLength = integerOrUndefined(field.validation.maxLength);

  if (min !== undefined) {
    validation.min = min;
    validation.exclusiveMin = field.validation.exclusiveMin || undefined;
  }

  if (max !== undefined) {
    validation.max = max;
    validation.exclusiveMax = field.validation.exclusiveMax || undefined;
  }

  if (minLength !== undefined) {
    validation.minLength = minLength;
  }

  if (maxLength !== undefined) {
    validation.maxLength = maxLength;
  }

  if (field.validation.regex.trim()) {
    validation.regex = field.validation.regex.trim();
  }

  return Object.keys(validation).length ? validation : null;
}

function optionSourceFor(field: DraftField) {
  if (!isOptionControl(field)) {
    return null;
  }

  const options: Option[] = field.options
    .filter((option) => option.value.trim() && option.label.trim())
    .map((option) => ({
      value: parseOptionValue(option.value.trim(), field.valueType) ?? option.value.trim(),
      label: option.label.trim(),
      description: option.description.trim() || undefined,
      disabled: option.disabled || undefined
    }));

  return {
    type: field.optionSourceType,
    sourceId: field.optionSourceType === "externalReference" ? field.optionSourceId.trim() : undefined,
    options: options.length ? options : undefined
  };
}

function referenceFor(field: DraftField) {
  if (field.controlType !== "referenceSelect") {
    return null;
  }

  return {
    sourceType: field.referenceSourceType,
    sourceId: field.referenceSourceId.trim(),
    entityType: field.referenceEntityType.trim(),
    mockOptions: field.referenceOptions
      .filter((option) => option.entityId.trim() && option.displayName.trim())
      .map((option) => ({
        referenceType: referenceTypeForValueType(field.valueType),
        sourceId: field.referenceSourceId.trim(),
        entityType: field.referenceEntityType.trim(),
        entityId: option.entityId.trim(),
        displayName: option.displayName.trim()
      }))
  };
}

function toFieldDefinition(field: DraftField): FieldDefinition {
  const validation = validationFor(field);
  const optionSource = optionSourceFor(field);
  const reference = referenceFor(field);
  const baseDefinition: FieldDefinition = {
    id: field.id.trim(),
    label: field.label.trim(),
    description: field.description.trim() || `${field.label.trim()} for this process step.`,
    scope: field.scope,
    valueType: field.valueType,
    controlType: field.controlType,
    selectionMode: selectionControlNeedsMode(field) ? field.selectionMode : null,
    unit: field.unit.trim() || null,
    required: field.required,
    reviewRequired: field.reviewRequired,
    validation,
    optionSource,
    reference
  };

  if (field.valueType !== "fieldGroupArray" || field.controlType !== "repeater") {
    return baseDefinition;
  }

  return {
    ...baseDefinition,
    repeatDefinition: {
      itemLabelTemplate: field.repeatItemLabelTemplate.trim() || `${field.label.trim()} {{index}}`,
      indexBase: integerOrUndefined(field.repeatIndexBase) ?? 1,
      minItems: integerOrUndefined(field.repeatMinItems),
      maxItems: integerOrUndefined(field.repeatMaxItems),
      itemFieldDefinitions: (field.childFields ?? []).map(toFieldDefinition)
    }
  };
}

function uniqueIds(fields: DraftField[]) {
  const ids = fields.map((field) => field.id.trim()).filter(Boolean);
  return ids.length === fields.length && new Set(ids).size === ids.length;
}

function validateDraftField(field: DraftField, path: string[], allowRepeater: boolean) {
  const errors: string[] = [];
  const currentPath = [...path, field.label.trim() || "Unnamed field"].join(" / ");

  if (!field.label.trim()) {
    errors.push(`${currentPath}: label is required.`);
  }

  if (!field.id.trim()) {
    errors.push(`${currentPath}: field id is required.`);
  }

  if (!isControlCompatible(field.valueType, field.controlType)) {
    errors.push(`${currentPath}: control type is not compatible with value type.`);
  }

  if (!allowRepeater && field.controlType === "repeater") {
    errors.push(`${currentPath}: nested repeater fields are not supported in V1.`);
  }

  if (selectionControlNeedsMode(field)) {
    if (!field.selectionMode) {
      errors.push(`${currentPath}: selectionMode is required.`);
    } else if (field.selectionMode === "multiple" && !isArrayValueType(field.valueType)) {
      errors.push(`${currentPath}: multiple selection requires an array valueType.`);
    } else if (field.selectionMode === "single" && isArrayValueType(field.valueType)) {
      errors.push(`${currentPath}: single selection requires a non-array valueType.`);
    }
  }

  if (field.optionSourceType === "externalReference" && isOptionControl(field) && !field.optionSourceId.trim()) {
    errors.push(`${currentPath}: external option source requires sourceId.`);
  }

  if (isOptionControl(field)) {
    if (field.optionSourceType === "static" && field.options.length === 0) {
      errors.push(`${currentPath}: static optionSource requires at least one option.`);
    }

    for (const option of field.options) {
      if (!option.value.trim() || !option.label.trim()) {
        errors.push(`${currentPath}: every option needs value and label.`);
      }

      if (
        option.value.trim() &&
        (itemValueType(field.valueType) === "integer" || itemValueType(field.valueType) === "float") &&
        parseOptionValue(option.value.trim(), field.valueType) === null
      ) {
        errors.push(`${currentPath}: numeric option values must be valid numbers.`);
      }
    }
  }

  if (field.controlType === "referenceSelect") {
    if (!field.referenceSourceId.trim()) {
      errors.push(`${currentPath}: reference sourceId is required.`);
    }

    if (!field.referenceEntityType.trim()) {
      errors.push(`${currentPath}: reference entityType is required.`);
    }

    if (field.referenceOptions.length === 0) {
      errors.push(`${currentPath}: V1 referenceSelect needs at least one mock option.`);
    }

    for (const option of field.referenceOptions) {
      if (!option.entityId.trim() || !option.displayName.trim()) {
        errors.push(`${currentPath}: every reference mock option needs entityId and displayName.`);
      }
    }
  }

  if (field.valueType === "fieldGroupArray" || field.controlType === "repeater") {
    const childFields = field.childFields ?? [];

    if (!childFields.length) {
      errors.push(`${currentPath}: repeater needs at least one child field.`);
    }

    if (!uniqueIds(childFields)) {
      errors.push(`${currentPath}: child field ids must be unique.`);
    }

    for (const childField of childFields) {
      errors.push(...validateDraftField(childField, [...path, field.label.trim() || "Repeater"], false));
    }
  }

  return errors;
}

function updateArrayItem<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function selectClassName(size: "sm" | "md" = "md") {
  return `${
    size === "sm" ? "h-8 px-2 text-sm" : "h-9 px-2 text-sm"
  } w-full rounded-md border border-slate-300 bg-white font-normal normal-case text-slate-900 outline-none focus:border-teal-700`;
}

function normalizeCategoryId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 72);
}

type FieldEditorProps = {
  allowRepeater: boolean;
  field: DraftField;
  index: number;
  level?: number;
  onChange: (nextField: DraftField) => void;
  onRemove: () => void;
};

function FieldEditor({
  allowRepeater,
  field,
  index,
  level = 0,
  onChange,
  onRemove
}: FieldEditorProps) {
  const valueTypeOptions = allowRepeater ? VALUE_TYPE_OPTIONS : CHILD_VALUE_TYPE_OPTIONS;
  const controlTypes = controlOptionsForValueType(field.valueType, allowRepeater);
  const showNumericValidation = isNumericValueType(field.valueType) && field.valueType !== "fieldGroupArray";
  const showTextValidation = itemValueType(field.valueType) === "string";

  const updateValueType = (valueType: ValueType) => {
    onChange(
      reconcileField(
        {
          ...field,
          valueType,
          controlType: defaultControlTypeForValueType(valueType),
          selectionMode: defaultSelectionModeForValueType(valueType),
          unit: defaultUnitForValueType(valueType),
          referenceEntityType: defaultReferenceEntityType(valueType)
        },
        allowRepeater
      )
    );
  };

  const updateControlType = (controlType: ControlType) => {
    const nextValueType = isControlCompatible(field.valueType, controlType)
      ? field.valueType
      : coerceValueTypeForControl(controlType);

    onChange(
      reconcileField(
        {
          ...field,
          valueType: nextValueType,
          controlType,
          selectionMode: defaultSelectionModeForValueType(nextValueType),
          unit: defaultUnitForValueType(nextValueType),
          referenceEntityType: defaultReferenceEntityType(nextValueType)
        },
        allowRepeater
      )
    );
  };

  const updateSelectionMode = (selectionMode: SelectionMode) => {
    const nextValueType =
      selectionMode === "multiple" ? arrayValueTypeFor(field.valueType) : itemValueType(field.valueType);

    onChange(
      reconcileField(
        {
          ...field,
          valueType: nextValueType,
          selectionMode,
          unit: defaultUnitForValueType(nextValueType)
        },
        allowRepeater
      )
    );
  };

  const updateChildField = (childIndex: number, nextChildField: DraftField) => {
    onChange({
      ...field,
      childFields: updateArrayItem(field.childFields ?? [], childIndex, nextChildField)
    });
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">
          {level === 0 ? `Field ${index + 1}` : `Child field ${index + 1}`}
        </h4>
        <Button
          aria-label={`Remove ${field.label || "field"}`}
          className="h-8 w-8 border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700"
          size="icon"
          title="Remove field"
          type="button"
          variant="outline"
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Label
          <Input
            className="mt-1 h-9 bg-white text-sm font-normal normal-case text-slate-900"
            value={field.label}
            onChange={(event) => {
              const nextLabel = event.target.value;
              onChange({
                ...field,
                label: nextLabel,
                id: field.id ? field.id : slugify(nextLabel),
                repeatItemLabelTemplate:
                  field.repeatItemLabelTemplate || `${nextLabel || "Item"} {{index}}`
              });
            }}
          />
        </Label>

        <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Field id
          <Input
            className="mt-1 h-9 bg-white text-sm font-normal normal-case text-slate-900"
            value={field.id}
            onChange={(event) =>
              onChange({
                ...field,
                id: slugify(event.target.value)
              })
            }
          />
        </Label>

        <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Scope
          <select
            className={selectClassName()}
            value={field.scope}
            onChange={(event) =>
              onChange({
                ...field,
                scope: event.target.value as FieldScope
              })
            }
          >
            <option value="inputState">Input state</option>
            <option value="outputState">Output state</option>
            <option value="processParameter">Process parameter</option>
          </select>
        </Label>

        <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Value type
          <select
            className={selectClassName()}
            value={field.valueType}
            onChange={(event) => updateValueType(event.target.value as ValueType)}
          >
            {valueTypeOptions.map((valueType) => (
              <option key={valueType} value={valueType}>
                {valueType}
              </option>
            ))}
          </select>
        </Label>

        <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Control
          <select
            className={selectClassName()}
            value={field.controlType}
            onChange={(event) => updateControlType(event.target.value as ControlType)}
          >
            {controlTypes.map((controlType) => (
              <option key={controlType} value={controlType}>
                {controlType}
              </option>
            ))}
          </select>
        </Label>

        {selectionControlNeedsMode(field) ? (
          <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Selection
            <select
              className={selectClassName()}
              value={field.selectionMode ?? "single"}
              onChange={(event) => updateSelectionMode(event.target.value as SelectionMode)}
            >
              <option value="single">single</option>
              <option value="multiple">multiple</option>
            </select>
          </Label>
        ) : null}

        <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Unit
          <Input
            className="mt-1 h-9 bg-white text-sm font-normal normal-case text-slate-900"
            placeholder="null"
            value={field.unit}
            onChange={(event) =>
              onChange({
                ...field,
                unit: event.target.value
              })
            }
          />
        </Label>

        <div className="flex flex-wrap items-end gap-2">
          <Label className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <Checkbox
              checked={field.required}
              onCheckedChange={(checked) =>
                onChange({
                  ...field,
                  required: Boolean(checked)
                })
              }
            />
            Required
          </Label>
          <Label className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <Checkbox
              checked={field.reviewRequired}
              onCheckedChange={(checked) =>
                onChange({
                  ...field,
                  reviewRequired: Boolean(checked)
                })
              }
            />
            Review
          </Label>
        </div>
      </div>

      <Label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Description
        <Textarea
          className="mt-1 min-h-20 bg-white text-sm font-normal normal-case text-slate-900"
          value={field.description}
          onChange={(event) =>
            onChange({
              ...field,
              description: event.target.value
            })
          }
        />
      </Label>

      {showNumericValidation || showTextValidation ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Validation
          </h5>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {showNumericValidation ? (
              <>
                <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Min
                  <Input
                    className="mt-1 h-8 text-sm font-normal normal-case"
                    type="number"
                    value={field.validation.min}
                    onChange={(event) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, min: event.target.value }
                      })
                    }
                  />
                </Label>
                <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Max
                  <Input
                    className="mt-1 h-8 text-sm font-normal normal-case"
                    type="number"
                    value={field.validation.max}
                    onChange={(event) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, max: event.target.value }
                      })
                    }
                  />
                </Label>
                <Label className="inline-flex h-8 items-center gap-2 self-end rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700">
                  <Checkbox
                    checked={field.validation.exclusiveMin}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, exclusiveMin: Boolean(checked) }
                      })
                    }
                  />
                  Exclusive min
                </Label>
                <Label className="inline-flex h-8 items-center gap-2 self-end rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700">
                  <Checkbox
                    checked={field.validation.exclusiveMax}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, exclusiveMax: Boolean(checked) }
                      })
                    }
                  />
                  Exclusive max
                </Label>
              </>
            ) : null}

            {showTextValidation ? (
              <>
                <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Min length
                  <Input
                    className="mt-1 h-8 text-sm font-normal normal-case"
                    min={0}
                    type="number"
                    value={field.validation.minLength}
                    onChange={(event) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, minLength: event.target.value }
                      })
                    }
                  />
                </Label>
                <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Max length
                  <Input
                    className="mt-1 h-8 text-sm font-normal normal-case"
                    min={0}
                    type="number"
                    value={field.validation.maxLength}
                    onChange={(event) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, maxLength: event.target.value }
                      })
                    }
                  />
                </Label>
                <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Regex
                  <Input
                    className="mt-1 h-8 text-sm font-normal normal-case"
                    value={field.validation.regex}
                    onChange={(event) =>
                      onChange({
                        ...field,
                        validation: { ...field.validation, regex: event.target.value }
                      })
                    }
                  />
                </Label>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isOptionControl(field) ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Option source
            </h5>
            <Button
              className="h-8 px-3 text-xs font-semibold"
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...field,
                  options: [...field.options, defaultOption(field.valueType, field.options.length)]
                })
              }
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Option
            </Button>
          </div>

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Type
              <select
                className={selectClassName("sm")}
                value={field.optionSourceType}
                onChange={(event) =>
                  onChange({
                    ...field,
                    optionSourceType: event.target.value as DraftField["optionSourceType"]
                  })
                }
              >
                <option value="static">static</option>
                <option value="externalReference">externalReference</option>
              </select>
            </Label>
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source ID
              <Input
                className="mt-1 h-8 text-sm font-normal normal-case"
                disabled={field.optionSourceType === "static"}
                placeholder="required for externalReference"
                value={field.optionSourceId}
                onChange={(event) =>
                  onChange({
                    ...field,
                    optionSourceId: event.target.value
                  })
                }
              />
            </Label>
          </div>

          <div className="mt-3 grid gap-2">
            {field.options.map((option, optionIndex) => (
              <div
                className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_auto_auto]"
                key={`${option.value}-${optionIndex}`}
              >
                <Input
                  className="h-8 bg-white text-sm"
                  placeholder="value"
                  value={option.value}
                  onChange={(event) =>
                    onChange({
                      ...field,
                      options: updateArrayItem(field.options, optionIndex, {
                        ...option,
                        value: event.target.value
                      })
                    })
                  }
                />
                <Input
                  className="h-8 bg-white text-sm"
                  placeholder="label"
                  value={option.label}
                  onChange={(event) =>
                    onChange({
                      ...field,
                      options: updateArrayItem(field.options, optionIndex, {
                        ...option,
                        label: event.target.value
                      })
                    })
                  }
                />
                <Label className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700">
                  <Checkbox
                    checked={option.disabled}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...field,
                        options: updateArrayItem(field.options, optionIndex, {
                          ...option,
                          disabled: Boolean(checked)
                        })
                      })
                    }
                  />
                  Disabled
                </Label>
                <Button
                  aria-label="Remove option"
                  className="h-8 w-8 border-slate-200 bg-white"
                  size="icon"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onChange({
                      ...field,
                      options: field.options.filter((_, currentIndex) => currentIndex !== optionIndex)
                    })
                  }
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {field.controlType === "referenceSelect" ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reference
            </h5>
            <Button
              className="h-8 px-3 text-xs font-semibold"
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...field,
                  referenceOptions: [
                    ...field.referenceOptions,
                    defaultReferenceOption(field.valueType)
                  ]
                })
              }
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Mock option
            </Button>
          </div>

          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source type
              <select
                className={selectClassName("sm")}
                value={field.referenceSourceType}
                onChange={(event) =>
                  onChange({
                    ...field,
                    referenceSourceType: event.target.value as ReferenceDefinition["sourceType"]
                  })
                }
              >
                <option value="localMock">localMock</option>
                <option value="dbReference">dbReference</option>
                <option value="fileReference">fileReference</option>
                <option value="manualReference">manualReference</option>
                <option value="apiReference">apiReference</option>
              </select>
            </Label>
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source ID
              <Input
                className="mt-1 h-8 text-sm font-normal normal-case"
                value={field.referenceSourceId}
                onChange={(event) =>
                  onChange({
                    ...field,
                    referenceSourceId: event.target.value
                  })
                }
              />
            </Label>
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Entity type
              <Input
                className="mt-1 h-8 text-sm font-normal normal-case"
                value={field.referenceEntityType}
                onChange={(event) =>
                  onChange({
                    ...field,
                    referenceEntityType: slugify(event.target.value)
                  })
                }
              />
            </Label>
          </div>

          <div className="mt-3 grid gap-2">
            {field.referenceOptions.map((option, optionIndex) => (
              <div
                className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_auto]"
                key={`${option.entityId}-${optionIndex}`}
              >
                <Input
                  className="h-8 bg-white text-sm"
                  placeholder="entityId"
                  value={option.entityId}
                  onChange={(event) =>
                    onChange({
                      ...field,
                      referenceOptions: updateArrayItem(field.referenceOptions, optionIndex, {
                        ...option,
                        entityId: event.target.value
                      })
                    })
                  }
                />
                <Input
                  className="h-8 bg-white text-sm"
                  placeholder="displayName"
                  value={option.displayName}
                  onChange={(event) =>
                    onChange({
                      ...field,
                      referenceOptions: updateArrayItem(field.referenceOptions, optionIndex, {
                        ...option,
                        displayName: event.target.value
                      })
                    })
                  }
                />
                <Button
                  aria-label="Remove reference option"
                  className="h-8 w-8 border-slate-200 bg-white"
                  size="icon"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onChange({
                      ...field,
                      referenceOptions: field.referenceOptions.filter(
                        (_, currentIndex) => currentIndex !== optionIndex
                      )
                    })
                  }
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {field.controlType === "repeater" ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Repeat definition
              </h5>
              <p className="mt-1 text-xs text-slate-500">
                V1 supports one repeater level only.
              </p>
            </div>
            <Button
              className="h-8 px-3 text-xs font-semibold"
              type="button"
              variant="outline"
              onClick={() => {
                const childFields = field.childFields ?? [];

                onChange({
                  ...field,
                  childFields: [
                    ...childFields,
                    createDraftField("Parameter", `${field.id || "item"}_field_${childFields.length + 1}`, "string", false)
                  ]
                });
              }}
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Child field
            </Button>
          </div>

          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
              Item label template
              <Input
                className="mt-1 h-8 text-sm font-normal normal-case"
                value={field.repeatItemLabelTemplate}
                onChange={(event) =>
                  onChange({
                    ...field,
                    repeatItemLabelTemplate: event.target.value
                  })
                }
              />
            </Label>
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Index base
              <Input
                className="mt-1 h-8 text-sm font-normal normal-case"
                min={0}
                type="number"
                value={field.repeatIndexBase}
                onChange={(event) =>
                  onChange({
                    ...field,
                    repeatIndexBase: event.target.value
                  })
                }
              />
            </Label>
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Max items
              <Input
                className="mt-1 h-8 text-sm font-normal normal-case"
                min={0}
                type="number"
                value={field.repeatMaxItems}
                onChange={(event) =>
                  onChange({
                    ...field,
                    repeatMaxItems: event.target.value
                  })
                }
              />
            </Label>
            <Label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Min items
              <Input
                className="mt-1 h-8 text-sm font-normal normal-case"
                min={0}
                type="number"
                value={field.repeatMinItems}
                onChange={(event) =>
                  onChange({
                    ...field,
                    repeatMinItems: event.target.value
                  })
                }
              />
            </Label>
          </div>

          <div className="mt-3 grid gap-3">
            {(field.childFields ?? []).map((childField, childIndex) => (
              <FieldEditor
                allowRepeater={false}
                field={childField}
                index={childIndex}
                key={`${childField.id}-${childIndex}`}
                level={level + 1}
                onChange={(nextChildField) => updateChildField(childIndex, nextChildField)}
                onRemove={() =>
                  onChange({
                    ...field,
                    childFields: (field.childFields ?? []).filter(
                      (_, currentIndex) => currentIndex !== childIndex
                    )
                  })
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AddProcessStepDialog({ open, onClose, onSave }: AddProcessStepDialogProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("custom.general");
  const [fields, setFields] = useState<DraftField[]>([initialField]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push("Step template name is required.");
    }

    if (!categoryId.trim()) {
      errors.push("categoryId is required.");
    }

    if (!uniqueIds(fields)) {
      errors.push("Top-level field ids must be unique.");
    }

    for (const field of fields) {
      errors.push(...validateDraftField(field, [], true));
    }

    return errors;
  }, [categoryId, fields, name]);
  const canSave = validationErrors.length === 0;

  if (!open) {
    return null;
  }

  const updateField = (index: number, nextField: DraftField) => {
    setFields((current) => updateArrayItem(current, index, nextField));
  };

  const removeField = (index: number) => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const fieldDefinitions: FieldDefinition[] = fields
      .filter((field) => field.label.trim() && field.id.trim())
      .map(toFieldDefinition);

    onSave(createDraftStepTemplate(name.trim(), categoryId.trim(), fieldDefinitions));
    setName("");
    setCategoryId("custom.general");
    setFields([initialField]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100vh-3rem)] max-w-5xl gap-0 overflow-hidden rounded-lg p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-base font-semibold text-slate-950">
            Add process step
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Create a reusable process step template and its field definitions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100vh-12rem)]">
          <div className="px-5 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Label className="block text-sm font-semibold text-slate-800" htmlFor="step-name">
                Step template name
                <Input
                  className="mt-2 h-10 font-normal"
                  id="step-name"
                  placeholder="Example: Plasma clean"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Label>

              <Label className="block text-sm font-semibold text-slate-800" htmlFor="category-id">
                Category ID
                <Input
                  className="mt-2 h-10 font-normal"
                  id="category-id"
                  placeholder="Example: bonding.micro_bump"
                  value={categoryId}
                  onChange={(event) => setCategoryId(normalizeCategoryId(event.target.value))}
                />
              </Label>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Field definitions</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Computed fields are intentionally not created in V1.
                </p>
              </div>
              <Button
                className="h-9 px-3 font-semibold"
                variant="outline"
                type="button"
                onClick={() =>
                  setFields((current) => [
                    ...current,
                    createDraftField("Parameter", `field_${current.length + 1}`, "string")
                  ])
                }
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Field
              </Button>
            </div>

            <div className="mt-3 grid gap-3">
              {fields.map((field, index) => (
                <FieldEditor
                  allowRepeater
                  field={field}
                  index={index}
                  key={`${field.id}-${index}`}
                  onChange={(nextField) => updateField(index, nextField)}
                  onRemove={() => removeField(index)}
                />
              ))}
            </div>

            {validationErrors.length > 0 ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Cannot save yet:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {validationErrors.slice(0, 8).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
                {validationErrors.length > 8 ? (
                  <p className="mt-2 text-xs font-semibold">
                    {validationErrors.length - 8} more issue(s).
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 gap-3 rounded-none border-t border-slate-200 bg-white px-5 py-4">
          <Button
            className="h-10 px-4 font-semibold"
            variant="outline"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-10 px-4 font-semibold disabled:bg-slate-300"
            disabled={!canSave}
            type="button"
            onClick={handleSave}
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
