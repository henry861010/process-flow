"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CATALOG_STORAGE_KEY, INSTANCE_STORAGE_KEY } from "@/domain/storage";

export function DemoResetButton() {
  const resetDemoData = () => {
    window.localStorage.removeItem(CATALOG_STORAGE_KEY);
    window.localStorage.removeItem(INSTANCE_STORAGE_KEY);
    window.location.reload();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            className="fixed bottom-4 left-4 z-50 h-12 gap-2 rounded-full border-2 border-amber-300 bg-slate-950 px-4 text-sm font-bold text-amber-100 shadow-[0_18px_50px_-18px_rgba(244,63,94,0.85)] ring-4 ring-rose-500/15 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-950 focus-visible:ring-rose-500/30"
            title="Clear V1 demo localStorage data"
          />
        }
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-slate-950">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">Reset demo</span>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-100 text-amber-700">
            <AlertTriangle aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Reset V1 demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears locally created process flow templates, process step templates, and
            instances from this browser. Seed catalog data will remain available after reload.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-700 text-white hover:bg-rose-800"
            onClick={resetDemoData}
          >
            Reset demo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
