"use client";

import { ChevronRight, Trash2 } from "lucide-react";

export type StepFlowBlock = {
  stepRefId: string;
  index: number;
  name: string;
  detail: string;
  fieldCount?: number;
  missing?: boolean;
};

type StepFlowBlocksProps = {
  steps: StepFlowBlock[];
  selectedStepRefId?: string | null;
  onSelect: (stepRefId: string) => void;
  onRemove?: (stepRefId: string) => void;
};

export function StepFlowBlocks({
  steps,
  selectedStepRefId,
  onSelect,
  onRemove
}: StepFlowBlocksProps) {
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-max items-center gap-4">
        {steps.map((step, index) => {
          const selected = selectedStepRefId === step.stepRefId;

          return (
            <div className="flex items-center gap-4" key={step.stepRefId}>
              <div
                className={`relative min-h-36 w-72 rounded-md border bg-white transition ${
                  selected
                    ? "border-teal-600 shadow-[0_0_0_3px_rgba(13,148,136,0.14)]"
                    : step.missing
                      ? "border-rose-200"
                      : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <button
                  aria-pressed={selected}
                  className="block min-h-36 w-full px-4 py-4 text-left"
                  type="button"
                  onClick={() => onSelect(step.stepRefId)}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-base font-semibold ${
                        selected ? "bg-teal-700 text-white" : "bg-slate-900 text-white"
                      }`}
                    >
                      {step.index}
                    </span>
                    <div className="min-w-0 pr-7">
                      <h3 className="line-clamp-2 text-base font-semibold leading-5 text-slate-950">
                        {step.name}
                      </h3>
                      <p className="mt-2 truncate text-xs text-slate-500">{step.detail}</p>
                      {step.fieldCount !== undefined ? (
                        <p className="mt-4 text-xs font-semibold text-slate-600">
                          {step.fieldCount} fields
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>

                {onRemove ? (
                  <button
                    aria-label={`Remove step ${step.index}`}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                    title="Remove step"
                    type="button"
                    onClick={() => onRemove(step.stepRefId)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {index < steps.length - 1 ? (
                <ChevronRight aria-hidden="true" className="h-7 w-7 shrink-0 text-slate-400" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
