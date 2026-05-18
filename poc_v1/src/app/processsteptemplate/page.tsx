"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AddProcessStepDialog } from "@/components/AddProcessStepDialog";
import { StepTemplateLibrary } from "@/components/StepTemplateLibrary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addStepTemplateToStorage, loadCatalog } from "@/domain/storage";
import type { ProcessCatalog } from "@/domain/types";

export default function ProcessStepTemplatePage() {
  const [catalog, setCatalog] = useState<ProcessCatalog>({
    processStepTemplates: [],
    processFlowTemplates: []
  });
  const [addStepOpen, setAddStepOpen] = useState(false);

  useEffect(() => {
    setCatalog(loadCatalog());
  }, []);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <Card className="rounded-lg px-4 py-4 shadow-soft sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                href="/"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Workspace
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-700">
                Framework developer
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
                Process step templates
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Maintain reusable station definitions and their field definitions for the local
                catalog.
              </p>
            </div>

            <Button
              className="h-10 px-4 font-semibold"
              type="button"
              onClick={() => setAddStepOpen(true)}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add process step
            </Button>
          </div>
        </Card>

        <StepTemplateLibrary templates={catalog.processStepTemplates} />
      </div>

      <AddProcessStepDialog
        onClose={() => setAddStepOpen(false)}
        onSave={(template) => {
          const nextCatalog = addStepTemplateToStorage(template);
          setCatalog(nextCatalog);
        }}
        open={addStepOpen}
      />
    </main>
  );
}
