"use client";

import { Download, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportInstance } from "@/domain/export";
import { addInstanceToStorage } from "@/domain/storage";
import type {
  ProcessCatalog,
  ProcessFlowInstance,
  ProcessFlowTemplate,
  StepValueSet
} from "@/domain/types";
import {
  createInstanceFromTemplate,
  findStepTemplate,
  updateFieldValue,
  validateInstance
} from "@/domain/utils";
import { ParameterField } from "./ParameterField";
import { StepFlowBlocks } from "./StepFlowBlocks";

type InstanceEditorProps = {
  catalog: ProcessCatalog;
  template: ProcessFlowTemplate;
  onDone: (instance: ProcessFlowInstance) => void;
  onCancel: () => void;
};

export function InstanceEditor({ catalog, template, onDone, onCancel }: InstanceEditorProps) {
  const [productName, setProductName] = useState("");
  const enabledStepRefs = useMemo(
    () => template.stepRefs.filter((stepRef) => stepRef.enabled),
    [template.stepRefs]
  );
  const draftInstance = useMemo(
    () => createInstanceFromTemplate(template, catalog.processStepTemplates, productName || "Draft"),
    [catalog.processStepTemplates, productName, template]
  );
  const [stepValueSets, setStepValueSets] = useState<StepValueSet[]>(draftInstance.stepValueSets);
  const [selectedStepRefId, setSelectedStepRefId] = useState<string | null>(
    enabledStepRefs[0]?.stepRefId ?? null
  );
  const [errors, setErrors] = useState<string[]>([]);

  const instance: ProcessFlowInstance = {
    ...draftInstance,
    productName,
    stepValueSets
  };

  const updateValueSet = (stepRefId: string, nextValueSet: StepValueSet) => {
    setStepValueSets((current) =>
      current.map((valueSet) => (valueSet.stepRefId === stepRefId ? nextValueSet : valueSet))
    );
  };

  useEffect(() => {
    setSelectedStepRefId((current) =>
      current && enabledStepRefs.some((stepRef) => stepRef.stepRefId === current)
        ? current
        : enabledStepRefs[0]?.stepRefId ?? null
    );
  }, [enabledStepRefs]);

  const selectedStepRef =
    enabledStepRefs.find((stepRef) => stepRef.stepRefId === selectedStepRefId) ??
    enabledStepRefs[0] ??
    null;
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
  const flowBlocks = enabledStepRefs.map((stepRef, index) => {
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

  const handleExport = () => {
    const nextErrors = validateInstance(instance, template, catalog.processStepTemplates);
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

  return (
    <Card className="gap-0 rounded-lg py-0 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Create existing technology
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{template.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fill parameters to create a process flow instance from template v{template.version}.
          </p>
        </div>
        <Button
          aria-label="Close editor"
          className="border-slate-200 text-slate-600 hover:bg-slate-50"
          size="icon-lg"
          title="Close"
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-5 py-5">
        <Label className="block text-sm font-semibold text-slate-800" htmlFor="product-name">
          Product / instance name
        </Label>
        <Input
          className="mt-2 h-10"
          id="product-name"
          placeholder="Example: MI450"
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
        />

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

        <div className="mt-6 grid gap-4">
          <StepFlowBlocks
            selectedStepRefId={selectedStepRef?.stepRefId}
            steps={flowBlocks}
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
      </div>

      <div className="flex justify-end border-t border-slate-200 px-5 py-4">
        <Button
          className="h-10 px-4 font-semibold"
          type="button"
          onClick={handleExport}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Export instance
        </Button>
      </div>
    </Card>
  );
}
