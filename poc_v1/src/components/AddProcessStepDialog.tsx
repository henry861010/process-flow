"use client";

import { Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FieldDefinition, ValueType } from "@/domain/types";
import { createDraftStepTemplate, slugify } from "@/domain/utils";

type AddProcessStepDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (template: ReturnType<typeof createDraftStepTemplate>) => void;
};

type DraftField = {
  label: string;
  id: string;
  valueType: ValueType;
  required: boolean;
  childFields?: DraftField[];
};

function controlTypeFor(valueType: ValueType) {
  if (valueType === "fieldGroupArray") {
    return "repeater" as const;
  }

  if (valueType === "boolean") {
    return "checkbox" as const;
  }

  if (valueType === "float" || valueType === "integer") {
    return "number" as const;
  }

  return "text" as const;
}

function unitFor(valueType: ValueType) {
  return valueType === "float" || valueType === "integer" ? ("um" as const) : null;
}

const initialField: DraftField = {
  label: "Thickness",
  id: "thickness",
  valueType: "float",
  required: true
};

function createDraftField(
  label: string,
  id: string,
  valueType: ValueType = "string"
): DraftField {
  return {
    label,
    id,
    valueType,
    required: true
  };
}

function defaultRepeaterChildFields(parentId: string): DraftField[] {
  return [
    createDraftField("Material", `${parentId}_material`, "material"),
    createDraftField("Thickness", `${parentId}_thickness`, "float")
  ];
}

function draftFieldWithValueType(field: DraftField, valueType: ValueType): DraftField {
  if (valueType === "fieldGroupArray") {
    return {
      ...field,
      valueType,
      childFields: field.childFields?.length ? field.childFields : defaultRepeaterChildFields(field.id)
    };
  }

  return {
    ...field,
    valueType,
    childFields: undefined
  };
}

function hasUniqueIds(fields: DraftField[]) {
  const ids = fields.map((field) => field.id.trim()).filter(Boolean);

  return ids.length === fields.length && new Set(ids).size === ids.length;
}

function isValidDraftField(field: DraftField) {
  if (!field.label.trim() || !field.id.trim()) {
    return false;
  }

  if (field.valueType !== "fieldGroupArray") {
    return true;
  }

  const childFields = field.childFields ?? [];

  return childFields.length > 0 && hasUniqueIds(childFields) && childFields.every(isValidDraftField);
}

function toFieldDefinition(field: DraftField): FieldDefinition {
  const baseDefinition = {
    id: field.id.trim(),
    label: field.label.trim(),
    description: `${field.label.trim()} for this process step.`,
    scope: "processParameter" as const,
    valueType: field.valueType,
    controlType: controlTypeFor(field.valueType),
    unit: unitFor(field.valueType),
    required: field.required,
    reviewRequired: false,
    validation:
      field.valueType === "float" || field.valueType === "integer" ? { min: 0 } : undefined
  };

  if (field.valueType !== "fieldGroupArray") {
    return baseDefinition;
  }

  return {
    ...baseDefinition,
    repeatDefinition: {
      itemLabelTemplate: `${field.label.trim()} {{index}}`,
      indexBase: 1,
      minItems: field.required ? 1 : 0,
      maxItems: 12,
      itemFieldDefinitions: (field.childFields ?? []).map(toFieldDefinition)
    }
  };
}

export function AddProcessStepDialog({ open, onClose, onSave }: AddProcessStepDialogProps) {
  const [name, setName] = useState("");
  const [fields, setFields] = useState<DraftField[]>([initialField]);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && hasUniqueIds(fields) && fields.every(isValidDraftField);
  }, [fields, name]);

  if (!open) {
    return null;
  }

  const updateField = (index: number, nextField: DraftField) => {
    setFields((current) => current.map((field, fieldIndex) => (fieldIndex === index ? nextField : field)));
  };

  const removeField = (index: number) => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const updateChildField = (fieldIndex: number, childIndex: number, nextField: DraftField) => {
    setFields((current) =>
      current.map((field, index) => {
        if (index !== fieldIndex) {
          return field;
        }

        return {
          ...field,
          childFields: (field.childFields ?? []).map((childField, currentChildIndex) =>
            currentChildIndex === childIndex ? nextField : childField
          )
        };
      })
    );
  };

  const addChildField = (fieldIndex: number) => {
    setFields((current) =>
      current.map((field, index) => {
        if (index !== fieldIndex) {
          return field;
        }

        const childFields = field.childFields ?? [];

        return {
          ...field,
          childFields: [
            ...childFields,
            createDraftField("Parameter", `${field.id}_field_${childFields.length + 1}`, "string")
          ]
        };
      })
    );
  };

  const removeChildField = (fieldIndex: number, childIndex: number) => {
    setFields((current) =>
      current.map((field, index) => {
        if (index !== fieldIndex) {
          return field;
        }

        return {
          ...field,
          childFields: (field.childFields ?? []).filter((_, currentChildIndex) => currentChildIndex !== childIndex)
        };
      })
    );
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const fieldDefinitions: FieldDefinition[] = fields
      .filter((field) => field.label.trim() && field.id.trim())
      .map(toFieldDefinition);

    onSave(createDraftStepTemplate(name.trim(), fieldDefinitions));
    setName("");
    setFields([initialField]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 py-6">
      <div className="max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Add process step</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a reusable process step template for the local catalog.
            </p>
          </div>
          <button
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            title="Close"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-5">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="step-name">
            Step template name
          </label>
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-teal-600/20 transition focus:border-teal-700 focus:ring-4"
            id="step-name"
            placeholder="Example: Plasma clean"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Fields</h3>
              <p className="mt-1 text-xs text-slate-500">
                Numeric fields default to `um` and non-negative validation.
              </p>
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={() =>
                setFields((current) => [
                  ...current,
                  {
                    label: "Material",
                    id: `field_${current.length + 1}`,
                    valueType: "string",
                    required: true
                  }
                ])
              }
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Field
            </button>
          </div>

          <div className="mt-3 grid gap-3">
            {fields.map((field, index) => (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                key={`${field.id}-${index}`}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_170px_auto_auto] sm:items-end">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Label
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case text-slate-900 outline-none focus:border-teal-700"
                      value={field.label}
                      onChange={(event) => {
                        const nextLabel = event.target.value;
                        updateField(index, {
                          ...field,
                          label: nextLabel,
                          id: field.id ? field.id : slugify(nextLabel)
                        });
                      }}
                    />
                  </label>

                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Field id
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case text-slate-900 outline-none focus:border-teal-700"
                      value={field.id}
                      onChange={(event) =>
                        updateField(index, {
                          ...field,
                          id: slugify(event.target.value)
                        })
                      }
                    />
                  </label>

                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-teal-700"
                      value={field.valueType}
                      onChange={(event) =>
                        updateField(index, draftFieldWithValueType(field, event.target.value as ValueType))
                      }
                    >
                      <option value="string">String</option>
                      <option value="material">Material</option>
                      <option value="float">Float</option>
                      <option value="integer">Integer</option>
                      <option value="boolean">Boolean</option>
                      <option value="fieldGroupArray">Repeater</option>
                    </select>
                  </label>

                  <label className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                    <input
                      checked={field.required}
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      type="checkbox"
                      onChange={(event) =>
                        updateField(index, {
                          ...field,
                          required: event.target.checked
                        })
                      }
                    />
                    Required
                  </label>

                  <button
                    aria-label={`Remove ${field.label}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                    title="Remove field"
                    type="button"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>

                {field.valueType === "fieldGroupArray" ? (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Repeat item fields
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          These child fields appear inside each repeated item.
                        </p>
                      </div>
                      <button
                        className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        type="button"
                        onClick={() => addChildField(index)}
                      >
                        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                        Child field
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {(field.childFields ?? []).map((childField, childIndex) => (
                        <div
                          className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_150px_auto_auto] sm:items-end"
                          key={`${childField.id}-${childIndex}`}
                        >
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Label
                            <input
                              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-teal-700"
                              value={childField.label}
                              onChange={(event) => {
                                const nextLabel = event.target.value;
                                updateChildField(index, childIndex, {
                                  ...childField,
                                  label: nextLabel,
                                  id: childField.id ? childField.id : slugify(nextLabel)
                                });
                              }}
                            />
                          </label>

                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Field id
                            <input
                              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-teal-700"
                              value={childField.id}
                              onChange={(event) =>
                                updateChildField(index, childIndex, {
                                  ...childField,
                                  id: slugify(event.target.value)
                                })
                              }
                            />
                          </label>

                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Type
                            <select
                              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-teal-700"
                              value={childField.valueType}
                              onChange={(event) =>
                                updateChildField(index, childIndex, {
                                  ...childField,
                                  valueType: event.target.value as ValueType
                                })
                              }
                            >
                              <option value="string">String</option>
                              <option value="material">Material</option>
                              <option value="float">Float</option>
                              <option value="integer">Integer</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </label>

                          <label className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700">
                            <input
                              checked={childField.required}
                              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                              type="checkbox"
                              onChange={(event) =>
                                updateChildField(index, childIndex, {
                                  ...childField,
                                  required: event.target.checked
                                })
                              }
                            />
                            Required
                          </label>

                          <button
                            aria-label={`Remove ${childField.label}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                            title="Remove child field"
                            type="button"
                            onClick={() => removeChildField(index, childIndex)}
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {!canSave ? (
            <p className="mt-3 text-sm text-amber-700">
              Step name is required, field ids must be unique, and repeater fields need at least one child field.
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canSave}
            type="button"
            onClick={handleSave}
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save step
          </button>
        </div>
      </div>
    </div>
  );
}
