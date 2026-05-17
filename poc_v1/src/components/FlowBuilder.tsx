"use client";

import { Database, Download, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { exportInstance, exportTemplateAndInstance } from "@/domain/export";
import { addFlowTemplateToStorage, addInstanceToStorage } from "@/domain/storage";
import type {
  ProcessCatalog,
  ProcessFlowInstance,
  ProcessFlowTemplate,
  ProcessStepTemplate,
  StepRef,
  StepValueSet
} from "@/domain/types";
import {
  createDraftFlowTemplate,
  createInstanceFromTemplate,
  createStepValueSet,
  findStepTemplate,
  shortId,
  slugify,
  updateFieldValue,
  validateInstance
} from "@/domain/utils";
import { ParameterField } from "./ParameterField";
import { StepFlowBlocks } from "./StepFlowBlocks";

type FlowBuilderProps = {
  catalog: ProcessCatalog;
  onCatalogChange: (catalog: ProcessCatalog) => void;
  onDone: (instance: ProcessFlowInstance) => void;
  onCancel: () => void;
};

function referencedStepTemplates(
  catalog: ProcessCatalog,
  flowTemplate: ProcessFlowTemplate
): ProcessStepTemplate[] {
  const templates = flowTemplate.stepRefs
    .map((stepRef) =>
      findStepTemplate(
        catalog.processStepTemplates,
        stepRef.processStepTemplateId,
        stepRef.processStepTemplateVersion
      )
    )
    .filter(Boolean) as ProcessStepTemplate[];

  return Array.from(
    new Map(templates.map((template) => [`${template.id}@${template.version}`, template])).values()
  );
}

export function FlowBuilder({ catalog, onCatalogChange, onDone, onCancel }: FlowBuilderProps) {
  const [technologyName, setTechnologyName] = useState("");
  const [productName, setProductName] = useState("");
  const [stepRefs, setStepRefs] = useState<StepRef[]>([]);
  const [stepValueSets, setStepValueSets] = useState<StepValueSet[]>([]);
  const [selectedStepRefId, setSelectedStepRefId] = useState<string | null>(null);
  const [stepPickerOpen, setStepPickerOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const draftFlowTemplate = useMemo(
    () => createDraftFlowTemplate(technologyName || "Draft technology", stepRefs),
    [stepRefs, technologyName]
  );

  const draftInstance = useMemo(
    () =>
      createInstanceFromTemplate(
        draftFlowTemplate,
        catalog.processStepTemplates,
        productName || "Draft instance"
      ),
    [catalog.processStepTemplates, draftFlowTemplate, productName]
  );

  const instance: ProcessFlowInstance = {
    ...draftInstance,
    productName,
    stepValueSets
  };

  const addStep = (stepTemplate: ProcessStepTemplate) => {
    const index = stepRefs.length + 1;
    const stepRefId = `new_${String(index).padStart(2, "0")}_${slugify(stepTemplate.name)}_${shortId()}`;
    const nextStepRef: StepRef = {
      stepRefId,
      processStepTemplateId: stepTemplate.id,
      processStepTemplateVersion: stepTemplate.version,
      enabled: true
    };

    setStepRefs((current) => [...current, nextStepRef]);
    setStepValueSets((current) => [...current, createStepValueSet(stepRefId, stepTemplate)]);
    setSelectedStepRefId(stepRefId);
    setStepPickerOpen(false);
  };

  const removeStep = (stepRefId: string) => {
    const nextStepRefs = stepRefs.filter((stepRef) => stepRef.stepRefId !== stepRefId);

    setStepRefs(nextStepRefs);
    setStepValueSets((current) => current.filter((valueSet) => valueSet.stepRefId !== stepRefId));
    setSelectedStepRefId((current) =>
      current === stepRefId ? nextStepRefs[nextStepRefs.length - 1]?.stepRefId ?? null : current
    );
  };

  const updateValueSet = (stepRefId: string, nextValueSet: StepValueSet) => {
    setStepValueSets((current) =>
      current.map((valueSet) => (valueSet.stepRefId === stepRefId ? nextValueSet : valueSet))
    );
  };

  const validateDraft = () => {
    const nextErrors: string[] = [];

    if (!technologyName.trim()) {
      nextErrors.push("Technology name is required.");
    }

    if (stepRefs.length === 0) {
      nextErrors.push("Add at least one process step.");
    }

    const instanceErrors = validateInstance(instance, draftFlowTemplate, catalog.processStepTemplates);
    return [...nextErrors, ...instanceErrors];
  };

  const selectedStepRef =
    stepRefs.find((stepRef) => stepRef.stepRefId === selectedStepRefId) ?? stepRefs[0] ?? null;
  const selectedStepTemplate = selectedStepRef
    ? findStepTemplate(
        catalog.processStepTemplates,
        selectedStepRef.processStepTemplateId,
        selectedStepRef.processStepTemplateVersion
      )
    : null;
  const selectedValueSet = selectedStepRef
    ? stepValueSets.find((item) => item.stepRefId === selectedStepRef.stepRefId) ?? null
    : null;
  const flowBlocks = stepRefs.map((stepRef, index) => {
    const stepTemplate = findStepTemplate(
      catalog.processStepTemplates,
      stepRef.processStepTemplateId,
      stepRef.processStepTemplateVersion
    );

    return {
      stepRefId: stepRef.stepRefId,
      index: index + 1,
      name: stepTemplate?.name ?? stepRef.processStepTemplateId,
      detail: stepRef.stepRefId,
      fieldCount: stepTemplate?.fieldDefinitions.length,
      missing: !stepTemplate
    };
  });

  const handleExportOnly = () => {
    const nextErrors = validateDraft();
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      return;
    }

    const savedStore = addInstanceToStorage({
      ...instance,
      updatedAt: new Date().toISOString()
    });
    const savedInstance = savedStore.processFlowInstances[savedStore.processFlowInstances.length - 1];

    exportInstance(savedInstance);
    onDone(savedInstance);
  };

  const handleSaveTemplateAndExport = () => {
    const nextErrors = validateDraft();
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      return;
    }

    const savedCatalog = addFlowTemplateToStorage(draftFlowTemplate);
    onCatalogChange(savedCatalog);

    const savedStore = addInstanceToStorage({
      ...instance,
      updatedAt: new Date().toISOString()
    });
    const savedInstance = savedStore.processFlowInstances[savedStore.processFlowInstances.length - 1];

    exportTemplateAndInstance({
      flowTemplate: draftFlowTemplate,
      instance: savedInstance,
      referencedStepTemplates: referencedStepTemplates(catalog, draftFlowTemplate)
    });
    onDone(savedInstance);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Create new technology
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Build a process flow</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add process steps and fill parameters immediately while the flow template is drafted.
          </p>
        </div>
        <button
          aria-label="Close builder"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          title="Close"
          type="button"
          onClick={onCancel}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="technology-name">
            Technology name
            <input
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal outline-none ring-teal-600/20 transition focus:border-teal-700 focus:ring-4"
              id="technology-name"
              placeholder="Example: Demo temporary stack"
              value={technologyName}
              onChange={(event) => setTechnologyName(event.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-800" htmlFor="new-product-name">
            Product / instance name
            <input
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal outline-none ring-teal-600/20 transition focus:border-teal-700 focus:ring-4"
              id="new-product-name"
              placeholder="Example: MI450 experiment"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            type="button"
            onClick={() => setStepPickerOpen(true)}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add step
          </button>
        </div>

        {errors.length > 0 ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">Please fix these fields before export:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6">
          {stepRefs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">No process steps yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Add a process step to start building the flow.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              <StepFlowBlocks
                selectedStepRefId={selectedStepRef?.stepRefId}
                steps={flowBlocks}
                onRemove={removeStep}
                onSelect={setSelectedStepRefId}
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Step settings
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-950">
                    {selectedStepTemplate?.name ?? selectedStepRef?.processStepTemplateId}
                  </h3>
                  {selectedStepRef ? (
                    <p className="mt-1 text-xs text-slate-500">{selectedStepRef.stepRefId}</p>
                  ) : null}
                </div>

                <div className="grid gap-3 p-4">
                  {!selectedStepTemplate || !selectedValueSet ? (
                    <p className="text-sm text-rose-700">Missing template definition.</p>
                  ) : selectedStepTemplate.fieldDefinitions.length === 0 ? (
                    <p className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                      No parameters for this step.
                    </p>
                  ) : (
                    selectedStepTemplate.fieldDefinitions.map((field) => {
                      const fieldValue = selectedValueSet.fieldValues.find((item) => item.fieldId === field.id);

                      if (!fieldValue) {
                        return null;
                      }

                      return (
                        <ParameterField
                          field={field}
                          key={field.id}
                          value={fieldValue}
                          onChange={(nextFieldValue) =>
                            updateValueSet(
                              selectedValueSet.stepRefId,
                              updateFieldValue(selectedValueSet, field.id, nextFieldValue)
                            )
                          }
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={handleExportOnly}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Export only
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
          type="button"
          onClick={handleSaveTemplateAndExport}
        >
          <Database aria-hidden="true" className="h-4 w-4" />
          Save template & export
        </button>
      </div>

      {stepPickerOpen ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/35 px-4 py-16">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Choose process step</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Pick one reusable step template to append to this flow.
                </p>
              </div>
              <button
                aria-label="Close step picker"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                title="Close"
                type="button"
                onClick={() => setStepPickerOpen(false)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.processStepTemplates.map((template) => {
                  const hasRepeater = template.fieldDefinitions.some(
                    (field) => field.controlType === "repeater"
                  );

                  return (
                    <button
                      className="rounded-md border border-slate-200 bg-white p-4 text-left transition hover:border-teal-500 hover:bg-teal-50"
                      key={`${template.id}@${template.version}`}
                      type="button"
                      onClick={() => addStep(template)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-slate-950">
                            {template.name}
                          </h4>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {template.id} / v{template.version}
                          </p>
                        </div>
                        {hasRepeater ? (
                          <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                            repeater
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">
                        {template.purpose}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
