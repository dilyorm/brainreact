"use client";

import Link from "next/link";
import { useEffect, useState, startTransition } from "react";

import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { StatusPill } from "@/components/status-pill";
import { fetchAnalysis } from "@/lib/api";
import { AnalysisRecord } from "@/lib/types";


export function AnalysisPageClient({ initialAnalysis }: { initialAnalysis: AnalysisRecord }) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (analysis.status === "completed" || analysis.status === "error") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const nextAnalysis = await fetchAnalysis(analysis.id);
        startTransition(() => {
          setAnalysis(nextAnalysis);
        });
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh analysis.");
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [analysis.id, analysis.status]);

  return (
    <main className="pb-16 pt-8 sm:pt-10">
      <div className="shell flex flex-col gap-6">
        <header className="glass rounded-[32px] px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link className="text-sm text-slate-400 transition hover:text-white" href="/">
                Back to upload
              </Link>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">BrainReact analysis workspace</h1>
            </div>
            <StatusPill status={analysis.status} />
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        {analysis.status !== "completed" && analysis.status !== "error" ? (
          <section className="glass rounded-[32px] p-8 text-center">
            <div className="soft-label">Processing</div>
            <h2 className="mt-2 text-2xl font-semibold">Running TRIBE v2 and cloud interpretation</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              The backend is extracting multimodal events, generating predicted cortical responses, and asking {analysis.interpreter_model} to explain what the peaks may indicate.
            </p>
            <div className="mx-auto mt-8 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/8">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
            </div>
          </section>
        ) : null}

        {analysis.status === "error" ? (
          <section className="glass rounded-[32px] p-8">
            <div className="soft-label">Failed</div>
            <h2 className="mt-2 text-2xl font-semibold">Analysis could not complete</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">{analysis.error_message ?? "Unknown backend error."}</p>
          </section>
        ) : null}

        {analysis.status === "completed" ? <AnalysisDashboard analysis={analysis} /> : null}
      </div>
    </main>
  );
}
