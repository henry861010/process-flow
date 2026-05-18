"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type {
  FieldDefinition,
  FieldPrimitiveValue,
  FieldValue,
  FieldValuePayload,
  PrimitiveOptionValue,
  ReferenceValue
} from "@/domain/types";
import {
  createFieldGroupArrayValue,
  createRepeatItem,
  initialValueForField,
  isArrayValueType,
  isFieldGroupArrayValue,
  isNumericValueType,
  isRepeaterField,
  itemValueType
} from "@/domain/utils";

type ParameterFieldProps = {
  field: FieldDefinition;
  value: FieldValue;
  idPrefix?: string;
  onChange: (nextValue: FieldValue) => void;
};

function parseNumber(value: string): FieldPrimitiveValue {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function itemLabel(field: FieldDefinition, itemIndex: number, fallbackLabel?: string) {
  if (fallbackLabel) {
    return fallbackLabel;
  }

  const template = field.repeatDefinition?.itemLabelTemplate ?? `${field.label} {{index}}`;

  return template.replaceAll("{{index}}", String(itemIndex));
}

function primitiveKey(value: PrimitiveOptionValue) {
  return String(value);
}

function primitiveValue(value: FieldValuePayload): PrimitiveOptionValue | null {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return null;
}

function primitiveArrayValue(value: FieldValuePayload): PrimitiveOptionValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is PrimitiveOptionValue =>
    typeof item === "string" || typeof item === "number"
  );
}

function referenceValue(value: FieldValuePayload): ReferenceValue | null {
  if (value && typeof value === "object" && !Array.isArray(value) && "entityId" in value) {
    return value as ReferenceValue;
  }

  return null;
}

function referenceArrayValue(value: FieldValuePayload): ReferenceValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ReferenceValue =>
      Boolean(item && typeof item === "object" && "entityId" in item)
  );
}

function optionIsSelected(currentValue: FieldValuePayload, optionValue: PrimitiveOptionValue) {
  if (Array.isArray(currentValue)) {
    return primitiveArrayValue(currentValue).some((item) => item === optionValue);
  }

  return primitiveValue(currentValue) === optionValue;
}

function updatePrimitiveSelection(
  field: FieldDefinition,
  currentValue: FieldValuePayload,
  optionValue: PrimitiveOptionValue,
  checked: boolean
): FieldValuePayload {
  if (field.selectionMode === "multiple" || isArrayValueType(field.valueType)) {
    const currentValues = primitiveArrayValue(currentValue);

    if (checked) {
      const nextValues = currentValues.some((item) => item === optionValue)
        ? currentValues
        : [...currentValues, optionValue];

      return nextValues as string[] | number[];
    }

    return currentValues.filter((item) => item !== optionValue) as string[] | number[];
  }

  return checked ? optionValue : null;
}

function updateReferenceSelection(
  field: FieldDefinition,
  currentValue: FieldValuePayload,
  option: ReferenceValue,
  checked: boolean
) {
  if (field.selectionMode === "multiple" || isArrayValueType(field.valueType)) {
    const currentValues = referenceArrayValue(currentValue);

    if (checked) {
      return currentValues.some((item) => item.entityId === option.entityId)
        ? currentValues
        : [...currentValues, option];
    }

    return currentValues.filter((item) => item.entityId !== option.entityId);
  }

  return checked ? option : null;
}

function nextRepeatOffset(field: FieldDefinition, items: { index: number }[]) {
  const indexBase = field.repeatDefinition?.indexBase ?? 1;
  const maxIndex = items.reduce((currentMax, item) => Math.max(currentMax, item.index), indexBase - 1);

  return maxIndex - indexBase + 1;
}

function ParameterRepeaterField({ field, value, idPrefix, onChange }: ParameterFieldProps) {
  const disabled = value.unknown;
  const fieldId = `${idPrefix ? `${idPrefix}-` : ""}${field.id}`;
  const describedBy = `${fieldId}-description`;
  const groupValue = isFieldGroupArrayValue(value.value)
    ? value.value
    : createFieldGroupArrayValue(field, 0);
  const minItems = field.repeatDefinition?.minItems ?? 0;
  const maxItems = field.repeatDefinition?.maxItems;
  const childFields = field.repeatDefinition?.itemFieldDefinitions ?? [];
  const canAdd = !disabled && (maxItems === undefined || groupValue.items.length < maxItems);

  const updateUnknown = (unknown: boolean) => {
    onChange({
      ...value,
      unknown,
      value: unknown ? null : isFieldGroupArrayValue(value.value) ? value.value : createFieldGroupArrayValue(field)
    });
  };

  const addItem = () => {
    if (!canAdd) {
      return;
    }

    onChange({
      ...value,
      value: {
        items: [
          ...groupValue.items,
          createRepeatItem(field, nextRepeatOffset(field, groupValue.items))
        ]
      }
    });
  };

  const removeItem = (itemId: string) => {
    if (disabled || groupValue.items.length <= minItems) {
      return;
    }

    onChange({
      ...value,
      value: {
        items: groupValue.items.filter((item) => item.itemId !== itemId)
      }
    });
  };

  const updateItemFieldValue = (itemId: string, nextFieldValue: FieldValue) => {
    onChange({
      ...value,
      value: {
        items: groupValue.items.map((item) => {
          if (item.itemId !== itemId) {
            return item;
          }

          const hasField = item.fieldValues.some((fieldValue) => fieldValue.fieldId === nextFieldValue.fieldId);

          return {
            ...item,
            fieldValues: hasField
              ? item.fieldValues.map((fieldValue) =>
                  fieldValue.fieldId === nextFieldValue.fieldId ? nextFieldValue : fieldValue
                )
              : [...item.fieldValues, nextFieldValue]
          };
        })
      }
    });
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId}>
            {field.label}
            {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
          </Label>
          <p className="mt-1 text-xs leading-5 text-slate-500" id={describedBy}>
            {field.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="h-9 rounded-md border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600"
            variant="outline"
            id={fieldId}
          >
            {groupValue.items.length} items
          </Badge>
          <Button
            className="h-9 px-3 font-semibold"
            disabled={!canAdd}
            type="button"
            variant="outline"
            onClick={addItem}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Item
          </Button>
          <Label className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
            <Checkbox
              checked={value.unknown}
              onCheckedChange={(checked) => updateUnknown(Boolean(checked))}
            />
            Unknown
          </Label>
        </div>
      </div>

      {childFields.length === 0 ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          Missing repeat item field definitions.
        </p>
      ) : groupValue.items.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No repeat items.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {groupValue.items.map((item) => {
            const label = itemLabel(field, item.index, item.label);

            return (
              <div className="rounded-md border border-slate-200 bg-slate-50" key={item.itemId}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                  <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
                  <Button
                    aria-label={`Remove ${label}`}
                    className="h-8 w-8 border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                    disabled={disabled || groupValue.items.length <= minItems}
                    size="icon"
                    title="Remove item"
                    type="button"
                    variant="outline"
                    onClick={() => removeItem(item.itemId)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 p-3">
                  {childFields.map((childField) => {
                    const childValue = item.fieldValues.find(
                      (fieldValue) => fieldValue.fieldId === childField.id
                    );

                    if (!childValue) {
                      return (
                        <p className="text-sm text-rose-700" key={childField.id}>
                          Missing value for {childField.label}.
                        </p>
                      );
                    }

                    return (
                      <ParameterField
                        field={childField}
                        idPrefix={`${fieldId}-${item.itemId}`}
                        key={childField.id}
                        value={childValue}
                        onChange={(nextFieldValue) => updateItemFieldValue(item.itemId, nextFieldValue)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PrimitiveOptionField({
  disabled,
  field,
  fieldId,
  value,
  onChange
}: {
  disabled: boolean;
  field: FieldDefinition;
  fieldId: string;
  value: FieldValuePayload;
  onChange: (nextValue: FieldValuePayload) => void;
}) {
  const options = field.optionSource?.options ?? [];
  const isMultiple = field.selectionMode === "multiple" || isArrayValueType(field.valueType);

  if (!options.length) {
    return (
      <p className="min-h-10 flex-1 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        No options configured.
      </p>
    );
  }

  if (!isMultiple && field.controlType === "select") {
    const currentValue = primitiveValue(value);

    return (
      <Select
        disabled={disabled}
        id={fieldId}
        value={currentValue === null ? null : primitiveKey(currentValue)}
        onValueChange={(nextValue) => {
          const selected = options.find((option) => primitiveKey(option.value) === nextValue);

          onChange(selected?.value ?? null);
        }}
      >
        <SelectTrigger className="h-10 min-w-0 flex-1 bg-white">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              disabled={option.disabled}
              key={primitiveKey(option.value)}
              value={primitiveKey(option.value)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = optionIsSelected(value, option.value);

        return (
          <Label
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            key={primitiveKey(option.value)}
          >
            <Checkbox
              checked={checked}
              disabled={disabled || option.disabled}
              onCheckedChange={(nextChecked) =>
                onChange(updatePrimitiveSelection(field, value, option.value, Boolean(nextChecked)))
              }
            />
            <span>{option.label}</span>
          </Label>
        );
      })}
    </div>
  );
}

function ReferenceOptionField({
  disabled,
  field,
  fieldId,
  value,
  onChange
}: {
  disabled: boolean;
  field: FieldDefinition;
  fieldId: string;
  value: FieldValuePayload;
  onChange: (nextValue: FieldValuePayload) => void;
}) {
  const options = field.reference?.mockOptions ?? [];
  const isMultiple = field.selectionMode === "multiple" || isArrayValueType(field.valueType);

  if (!options.length) {
    return (
      <p className="min-h-10 flex-1 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        No reference mock options configured.
      </p>
    );
  }

  if (!isMultiple) {
    const currentValue = referenceValue(value);

    return (
      <Select
        disabled={disabled}
        id={fieldId}
        value={currentValue?.entityId ?? null}
        onValueChange={(nextValue) => {
          const selected = options.find((option) => option.entityId === nextValue);

          onChange(selected ?? null);
        }}
      >
        <SelectTrigger className="h-10 min-w-0 flex-1 bg-white">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.entityId} value={option.entityId}>
              {option.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selectedValues = referenceArrayValue(value);

  return (
    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = selectedValues.some((selected) => selected.entityId === option.entityId);

        return (
          <Label
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            key={option.entityId}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(nextChecked) =>
                onChange(updateReferenceSelection(field, value, option, Boolean(nextChecked)))
              }
            />
            <span>{option.displayName}</span>
          </Label>
        );
      })}
    </div>
  );
}

export function ParameterField({ field, value, idPrefix, onChange }: ParameterFieldProps) {
  if (isRepeaterField(field)) {
    return (
      <ParameterRepeaterField
        field={field}
        idPrefix={idPrefix}
        value={value}
        onChange={onChange}
      />
    );
  }

  const disabled = value.unknown || field.controlType === "computed";
  const fieldId = `${idPrefix ? `${idPrefix}-` : ""}${field.id}`;
  const describedBy = `${fieldId}-description`;
  const isPrimitiveOption =
    field.controlType === "select" ||
    (field.controlType === "checkbox" && field.valueType !== "boolean");

  const updateValue = (nextValue: FieldValuePayload) => {
    onChange({
      ...value,
      value: nextValue
    });
  };

  const updateUnknown = (unknown: boolean) => {
    onChange({
      ...value,
      unknown,
      value: unknown ? null : value.value ?? initialValueForField(field)
    });
  };

  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(180px,240px)_1fr_auto] sm:items-start">
      <div className="min-w-0">
        <Label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId}>
          {field.label}
          {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
        </Label>
        <p className="mt-1 text-xs leading-5 text-slate-500" id={describedBy}>
          {field.description}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        {field.controlType === "number" ? (
          <Input
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 bg-white disabled:bg-slate-100"
            disabled={disabled}
            id={fieldId}
            max={field.validation?.max}
            min={field.validation?.min}
            step={itemValueType(field.valueType) === "integer" ? 1 : "any"}
            type="number"
            value={typeof value.value === "number" ? value.value : ""}
            onChange={(event) => updateValue(parseNumber(event.target.value))}
          />
        ) : field.controlType === "checkbox" && field.valueType === "boolean" ? (
          <div className="flex h-10 items-center">
            <Checkbox
              aria-describedby={describedBy}
              checked={Boolean(value.value)}
              disabled={disabled}
              id={fieldId}
              onCheckedChange={(checked) => updateValue(Boolean(checked))}
            />
          </div>
        ) : isPrimitiveOption ? (
          <PrimitiveOptionField
            disabled={disabled}
            field={field}
            fieldId={fieldId}
            value={value.value}
            onChange={updateValue}
          />
        ) : field.controlType === "referenceSelect" ? (
          <ReferenceOptionField
            disabled={disabled}
            field={field}
            fieldId={fieldId}
            value={value.value}
            onChange={updateValue}
          />
        ) : field.controlType === "computed" ? (
          <Input
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 bg-slate-100 text-slate-600"
            disabled
            id={fieldId}
            type="text"
            value={typeof value.value === "string" || typeof value.value === "number" ? String(value.value) : ""}
            readOnly
          />
        ) : (
          <Input
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 bg-white disabled:bg-slate-100"
            disabled={disabled}
            id={fieldId}
            maxLength={field.validation?.maxLength}
            minLength={field.validation?.minLength}
            type={isNumericValueType(field.valueType) ? "number" : "text"}
            value={typeof value.value === "string" ? value.value : ""}
            onChange={(event) => updateValue(event.target.value)}
          />
        )}

        {field.unit ? (
          <Badge
            className="h-10 shrink-0 rounded-md border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600"
            variant="outline"
          >
            {field.unit}
          </Badge>
        ) : null}
      </div>

      <Label className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
        <Checkbox
          checked={value.unknown}
          onCheckedChange={(checked) => updateUnknown(Boolean(checked))}
        />
        Unknown
      </Label>
    </div>
  );
}
