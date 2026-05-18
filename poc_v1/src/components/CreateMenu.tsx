"use client";

import { ChevronDown, FlaskConical, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { ProcessFlowTemplate } from "@/domain/types";

type CreateMenuProps = {
  templates: ProcessFlowTemplate[];
  onCreateNewTechnology: () => void;
  onCreateFromTemplate: (template: ProcessFlowTemplate) => void;
};

export function CreateMenu({
  templates,
  onCreateNewTechnology,
  onCreateFromTemplate
}: CreateMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="h-10 px-4 font-semibold shadow-soft" />}
      >
        Create
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(360px,calc(100vw-2rem))] p-1 shadow-soft"
      >
        <DropdownMenuItem
          className="items-start gap-3 px-3 py-3"
          onClick={onCreateNewTechnology}
        >
          <FlaskConical aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Create new technology
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Compose steps, fill parameters, and optionally save the new template.
            </span>
          </span>
        </DropdownMenuItem>

        {templates.length > 0 ? (
          <DropdownMenuSeparator />
        ) : null}

        {templates.map((template) => (
          <DropdownMenuItem
            className="items-start gap-3 px-3 py-3"
            key={`${template.id}-${template.version}`}
            onClick={() => onCreateFromTemplate(template)}
          >
            <Workflow aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Create {template.name}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {template.stepRefs.filter((stepRef) => stepRef.enabled).length} process steps
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
