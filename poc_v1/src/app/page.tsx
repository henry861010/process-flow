"use client";

import { Database, FileJson } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateMenu } from "@/components/CreateMenu";
import { FlowBuilder } from "@/components/FlowBuilder";
import { FlowTemplateList } from "@/components/FlowTemplateList";
import { InstanceEditor } from "@/components/InstanceEditor";
import { exportCatalog } from "@/domain/export";
import { loadCatalog } from "@/domain/storage";
import type { ProcessCatalog, ProcessFlowInstance, ProcessFlowTemplate } from "@/domain/types";

type WorkspaceMode =
  | { kind: "dashboard" }
  | { kind: "newTechnology" }
  | { kind: "existingTechnology"; template: ProcessFlowTemplate };

export default function Home() {
  const [catalog, setCatalog] = useState<ProcessCatalog>({
    processStepTemplates: [],
    processFlowTemplates: []
  });
  const [mode, setMode] = useState<WorkspaceMode>({ kind: "dashboard" });
  const [selectedTemplate, setSelectedTemplate] = useState<ProcessFlowTemplate | null>(null);
  const [lastExportedInstance, setLastExportedInstance] = useState<ProcessFlowInstance | null>(null);

  useEffect(() => {
    const loadedCatalog = loadCatalog();
    setCatalog(loadedCatalog);
    setSelectedTemplate(loadedCatalog.processFlowTemplates[0] ?? null);
  }, []);

  const handleInstanceDone = (instance: ProcessFlowInstance) => {
    setLastExportedInstance(instance);
    setMode({ kind: "dashboard" });
  };

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-soft sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Process Flow PoC V1
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                Template and instance workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Use reusable process step templates to create technology flow templates and export
                product-level process flow instances.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <CreateMenu
                templates={catalog.processFlowTemplates}
                onCreateFromTemplate={(template) => setMode({ kind: "existingTechnology", template })}
                onCreateNewTechnology={() => setMode({ kind: "newTechnology" })}
              />
            </div>
          </div>
        </header>

        {lastExportedInstance ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
            <div className="flex items-center gap-2">
              <FileJson aria-hidden="true" className="h-4 w-4 text-teal-700" />
              <span>
                Exported <span className="font-semibold">{lastExportedInstance.productName}</span> as{" "}
                <span className="font-mono text-xs">{lastExportedInstance.id}.json</span>
              </span>
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-teal-300 bg-white px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
              type="button"
              onClick={() => exportCatalog(catalog)}
            >
              <Database aria-hidden="true" className="h-4 w-4" />
              Export catalog
            </button>
          </div>
        ) : null}

        {mode.kind === "newTechnology" ? (
          <FlowBuilder
            catalog={catalog}
            onCancel={() => setMode({ kind: "dashboard" })}
            onCatalogChange={setCatalog}
            onDone={handleInstanceDone}
          />
        ) : mode.kind === "existingTechnology" ? (
          <InstanceEditor
            catalog={catalog}
            template={mode.template}
            onCancel={() => setMode({ kind: "dashboard" })}
            onDone={handleInstanceDone}
          />
        ) : (
          <FlowTemplateList
            catalog={catalog}
            selectedTemplateId={selectedTemplate?.id}
            onSelectTemplate={setSelectedTemplate}
          />
        )}
      </div>
    </main>
  );
}
