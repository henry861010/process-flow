"use client";

import { useState } from "react";
import { Workflow, X } from "lucide-react";
import type { ProcessCatalog, ProcessFlowTemplate } from "@/domain/types";
import { findStepTemplate } from "@/domain/utils";
import { StepFlowBlocks } from "./StepFlowBlocks";

type FlowTemplateListProps = {
  catalog: ProcessCatalog;
  selectedTemplateId?: string;
  onSelectTemplate: (template: ProcessFlowTemplate) => void;
};

export function FlowTemplateList({
  catalog,
  selectedTemplateId,
  onSelectTemplate
}: FlowTemplateListProps) {
  const [detailTemplate, setDetailTemplate] = useState<ProcessFlowTemplate | null>(null);

  const detailFlowBlocks =
    detailTemplate?.stepRefs
      .filter((stepRef) => stepRef.enabled)
      .map((stepRef, index) => {
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
      }) ?? [];

  const openDetail = (template: ProcessFlowTemplate) => {
    onSelectTemplate(template);
    setDetailTemplate(template);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Workflow aria-hidden="true" className="h-5 w-5 text-teal-700" />
          <h2 className="text-base font-semibold text-slate-950">Process flow templates</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Local process flow templates.
        </p>
      </div>

      <div className="grid gap-3 p-4">
        {catalog.processFlowTemplates.map((template) => (
          <button
            className={`min-h-16 rounded-md border px-4 py-4 text-left transition ${
              selectedTemplateId === template.id
                ? "border-teal-600 bg-teal-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            key={`${template.id}-${template.version}`}
            type="button"
            onClick={() => openDetail(template)}
          >
            <h3 className="text-base font-semibold text-slate-950">{template.name}</h3>
          </button>
        ))}
      </div>

      {detailTemplate ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/35 px-4 py-12">
          <div className="max-h-[calc(100vh-6rem)] w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                  Process flow detail
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{detailTemplate.name}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {detailTemplate.description ?? "No description provided."}
                </p>
              </div>
              <button
                aria-label="Close flow detail"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                title="Close"
                type="button"
                onClick={() => setDetailTemplate(null)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto px-5 py-5">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Owner
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{detailTemplate.owner}</dd>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Version
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">v{detailTemplate.version}</dd>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{detailTemplate.status}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Flow steps
                  </p>
                </div>

                {detailFlowBlocks.length > 0 ? (
                  <StepFlowBlocks
                    selectedStepRefId={detailFlowBlocks[0]?.stepRefId}
                    steps={detailFlowBlocks}
                    onSelect={() => undefined}
                  />
                ) : (
                  <p className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                    No steps in this flow.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
