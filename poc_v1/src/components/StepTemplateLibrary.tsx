"use client";

import { Layers3 } from "lucide-react";
import type { ProcessStepTemplate } from "@/domain/types";

type StepTemplateLibraryProps = {
  templates: ProcessStepTemplate[];
};

export function StepTemplateLibrary({ templates }: StepTemplateLibraryProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Layers3 aria-hidden="true" className="h-5 w-5 text-cyan-700" />
          <h2 className="text-base font-semibold text-slate-950">Process step library</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Server-maintained templates plus locally added process steps.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {templates.map((template) => (
          <div className="px-5 py-4" key={`${template.id}-${template.version}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">{template.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {template.id} / v{template.version}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {template.fieldDefinitions.length} fields
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {template.fieldDefinitions.length === 0 ? (
                <span className="text-xs font-medium text-slate-500">No parameters</span>
              ) : (
                template.fieldDefinitions.map((field) => (
                  <div
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                    key={field.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{field.label}</span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        {field.controlType}
                      </span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        {field.valueType}
                      </span>
                      {field.unit ? (
                        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                          {field.unit}
                        </span>
                      ) : null}
                      {field.required ? (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                          required
                        </span>
                      ) : null}
                    </div>

                    {field.controlType === "repeater" && field.repeatDefinition ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {field.repeatDefinition.itemFieldDefinitions.map((childField) => (
                          <span
                            className="inline-flex min-h-6 items-center rounded border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600"
                            key={childField.id}
                          >
                            {childField.label} / {childField.controlType}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
