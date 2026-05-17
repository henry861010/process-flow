"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FieldDefinition, FieldPrimitiveValue, FieldValue, FieldValuePayload } from "@/domain/types";
import {
  createFieldGroupArrayValue,
  createRepeatItem,
  isFieldGroupArrayValue,
  isRepeaterField
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

function itemLabel(field: FieldDefinition, index: number) {
  const template = field.repeatDefinition?.itemLabelTemplate ?? `${field.label} {{index}}`;

  return template.replaceAll("{{index}}", String(index));
}

function optionValue(value: FieldValuePayload) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && !Array.isArray(value) && "entityId" in value) {
    return value.entityId;
  }

  return "";
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
        items: [...groupValue.items, createRepeatItem(field, groupValue.items.length)]
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
          <label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId}>
            {field.label}
            {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-500" id={describedBy}>
            {field.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600"
            id={fieldId}
          >
            {groupValue.items.length} items
          </span>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canAdd}
            type="button"
            onClick={addItem}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Item
          </button>
          <label className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
            <input
              checked={value.unknown}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              type="checkbox"
              onChange={(event) => updateUnknown(event.target.checked)}
            />
            Unknown
          </label>
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
          {groupValue.items.map((item) => (
            <div className="rounded-md border border-slate-200 bg-slate-50" key={item.itemId}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                <h4 className="text-sm font-semibold text-slate-800">{itemLabel(field, item.index)}</h4>
                <button
                  aria-label={`Remove ${itemLabel(field, item.index)}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={disabled || groupValue.items.length <= minItems}
                  title="Remove item"
                  type="button"
                  onClick={() => removeItem(item.itemId)}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
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
          ))}
        </div>
      )}
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

  const disabled = value.unknown;
  const fieldId = `${idPrefix ? `${idPrefix}-` : ""}${field.id}`;
  const describedBy = `${fieldId}-description`;

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
      value: unknown ? null : value.value
    });
  };

  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(180px,240px)_1fr_auto] sm:items-start">
      <div className="min-w-0">
        <label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId}>
          {field.label}
          {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
        </label>
        <p className="mt-1 text-xs leading-5 text-slate-500" id={describedBy}>
          {field.description}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {field.controlType === "number" ? (
          <input
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-teal-600/20 transition focus:border-teal-700 focus:ring-4 disabled:bg-slate-100"
            disabled={disabled}
            id={fieldId}
            min={field.validation?.min}
            type="number"
            value={typeof value.value === "number" ? value.value : ""}
            onChange={(event) => updateValue(parseNumber(event.target.value))}
          />
        ) : field.controlType === "checkbox" || field.valueType === "boolean" ? (
          <input
            aria-describedby={describedBy}
            checked={Boolean(value.value)}
            className="h-5 w-5 rounded border-slate-300 text-teal-700 focus:ring-teal-700 disabled:opacity-50"
            disabled={disabled}
            id={fieldId}
            type="checkbox"
            onChange={(event) => updateValue(event.target.checked)}
          />
        ) : field.controlType === "select" && field.optionSource?.options?.length ? (
          <select
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-teal-600/20 transition focus:border-teal-700 focus:ring-4 disabled:bg-slate-100"
            disabled={disabled}
            id={fieldId}
            value={typeof value.value === "string" ? value.value : ""}
            onChange={(event) => updateValue(event.target.value)}
          >
            <option value="">Select</option>
            {field.optionSource.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.controlType === "referenceSelect" && field.reference?.mockOptions?.length ? (
          <select
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-teal-600/20 transition focus:border-teal-700 focus:ring-4 disabled:bg-slate-100"
            disabled={disabled}
            id={fieldId}
            value={optionValue(value.value)}
            onChange={(event) => {
              const selected = field.reference?.mockOptions?.find(
                (option) => option.entityId === event.target.value
              );

              updateValue(selected ?? null);
            }}
          >
            <option value="">Select</option>
            {field.reference.mockOptions.map((option) => (
              <option key={option.entityId} value={option.entityId}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.controlType === "computed" ? (
          <input
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-100 px-3 text-sm text-slate-600 outline-none"
            disabled
            id={fieldId}
            type="text"
            value={typeof value.value === "string" || typeof value.value === "number" ? String(value.value) : ""}
            readOnly
          />
        ) : (
          <input
            aria-describedby={describedBy}
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-teal-600/20 transition focus:border-teal-700 focus:ring-4 disabled:bg-slate-100"
            disabled={disabled}
            id={fieldId}
            type="text"
            value={typeof value.value === "string" ? value.value : ""}
            onChange={(event) => updateValue(event.target.value)}
          />
        )}

        {field.unit ? (
          <span className="inline-flex h-10 shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
            {field.unit}
          </span>
        ) : null}
      </div>

      <label className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
        <input
          checked={value.unknown}
          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
          type="checkbox"
          onChange={(event) => updateUnknown(event.target.checked)}
        />
        Unknown
      </label>
    </div>
  );
}
