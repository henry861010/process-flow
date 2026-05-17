"use client";

import { ChevronDown, FlaskConical, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-700/20"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        Create
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
          <button
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-teal-50"
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateNewTechnology();
            }}
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
          </button>

          <div className="border-t border-slate-100 py-1">
            {templates.map((template) => (
              <button
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                key={`${template.id}-${template.version}`}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreateFromTemplate(template);
                }}
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
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
