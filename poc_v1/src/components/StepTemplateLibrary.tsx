"use client";

import { Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProcessStepTemplate } from "@/domain/types";

type StepTemplateLibraryProps = {
  templates: ProcessStepTemplate[];
};

export function StepTemplateLibrary({ templates }: StepTemplateLibraryProps) {
  return (
    <Card className="gap-0 rounded-lg py-0 shadow-soft">
      <CardHeader className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Layers3 aria-hidden="true" className="h-5 w-5 text-cyan-700" />
          <CardTitle className="text-base font-semibold text-slate-950">
            Process step library
          </CardTitle>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Server-maintained templates plus locally added process steps.
        </p>
      </CardHeader>

      <CardContent className="divide-y divide-slate-100 p-0">
        {templates.map((template) => (
          <div className="px-5 py-4" key={`${template.id}-${template.version}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">{template.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {template.id} / v{template.version}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {template.categoryId}
                </p>
              </div>
              <Badge variant="secondary">
                {template.fieldDefinitions.length} fields
              </Badge>
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
                      <Badge variant="outline" className="h-5 bg-white text-[11px] text-slate-500">
                        {field.controlType}
                      </Badge>
                      <Badge variant="outline" className="h-5 bg-white text-[11px] text-slate-500">
                        {field.valueType}
                      </Badge>
                      {field.selectionMode ? (
                        <Badge variant="outline" className="h-5 bg-white text-[11px] text-slate-500">
                          {field.selectionMode}
                        </Badge>
                      ) : null}
                      {field.unit ? (
                        <Badge variant="outline" className="h-5 bg-white text-[11px] text-slate-500">
                          {field.unit}
                        </Badge>
                      ) : null}
                      {field.required ? (
                        <Badge variant="destructive" className="h-5 text-[11px]">
                          required
                        </Badge>
                      ) : null}
                    </div>

                    {field.controlType === "repeater" && field.repeatDefinition ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {field.repeatDefinition.itemFieldDefinitions.map((childField) => (
                          <Badge
                            className="min-h-6 bg-white text-[11px] text-slate-600"
                            variant="outline"
                            key={childField.id}
                          >
                            {childField.label} / {childField.controlType}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
