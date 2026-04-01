import clsx from "clsx";

import { AnalysisStatus } from "@/lib/types";


const LABELS: Record<AnalysisStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  error: "Error",
};


export function StatusPill({ status }: { status: AnalysisStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
        status === "completed" && "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
        status === "processing" && "border-violet-400/30 bg-violet-400/10 text-violet-200",
        status === "queued" && "border-slate-400/30 bg-slate-400/10 text-slate-200",
        status === "error" && "border-rose-400/30 bg-rose-400/10 text-rose-200",
      )}
    >
      {LABELS[status]}
    </span>
  );
}
