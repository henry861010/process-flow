"use client";

import { useState } from "react";
import { Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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
    <Card className="gap-0 rounded-lg py-0 shadow-soft">
      <CardHeader className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Workflow aria-hidden="true" className="h-5 w-5 text-teal-700" />
          <CardTitle className="text-base font-semibold text-slate-950">
            Process flow templates
          </CardTitle>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Local process flow templates.
        </p>
      </CardHeader>

      <CardContent className="grid gap-3 p-4">
        {catalog.processFlowTemplates.map((template) => (
          <Button
            className={`h-auto min-h-16 justify-start rounded-md px-4 py-4 text-left ${
              selectedTemplateId === template.id
                ? "border-teal-600 bg-teal-50 text-slate-950 hover:bg-teal-50"
                : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
            }`}
            key={`${template.id}-${template.version}`}
            variant="outline"
            type="button"
            onClick={() => openDetail(template)}
          >
            <h3 className="text-base font-semibold text-slate-950">{template.name}</h3>
          </Button>
        ))}
      </CardContent>

      <Dialog
        open={Boolean(detailTemplate)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTemplate(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-6rem)] max-w-6xl gap-0 overflow-hidden rounded-lg p-0 sm:max-w-6xl">
          {detailTemplate ? (
            <>
              <DialogHeader className="border-b border-slate-200 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                  Process flow detail
                </p>
                <DialogTitle className="mt-1 text-xl font-semibold text-slate-950">
                  {detailTemplate.name}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {detailTemplate.description ?? "No description provided."}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[calc(100vh-14rem)] overflow-y-auto overflow-x-hidden px-5 py-5">
                  <dl className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Owner
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        {detailTemplate.owner}
                      </dd>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Version
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        v{detailTemplate.version}
                      </dd>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </dt>
                      <dd className="mt-1">
                        <Badge variant="outline" className="text-slate-700">
                          {detailTemplate.status}
                        </Badge>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
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
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
