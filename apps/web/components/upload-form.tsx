"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { createAnalysis } from "@/lib/api";
import { InterpreterModelOption } from "@/lib/types";


export function UploadForm({ models }: { models: InterpreterModelOption[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [interpreterModel, setInterpreterModel] = useState(models[0]?.id ?? "gemini-3-flash-preview");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Select a video to analyze.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await createAnalysis(file, interpreterModel);
        router.push(`/analyses/${result.id}`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Upload failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-[28px] p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        <div>
          <div className="soft-label">Input</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Upload a clip for TRIBE v2 analysis</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            The backend stores the video, runs TRIBE v2 if the environment is ready, and asks the selected cloud model to explain what the predicted cortical response may indicate.
          </p>
        </div>

        <label className="rounded-3xl border border-dashed border-white/15 bg-white/4 p-5 transition hover:border-cyan-300/40 hover:bg-white/6">
          <div className="text-sm font-medium text-white">Video upload</div>
          <div className="mt-2 text-sm text-slate-300">Accepted: MP4, MOV, MKV, WEBM, AVI</div>
          <input
            className="mt-4 block w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white"
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-msvideo"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file ? <div className="mt-3 text-xs text-cyan-200">Selected: {file.name}</div> : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
          <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
            <div className="soft-label">Interpreter</div>
            <select
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
              value={interpreterModel}
              onChange={(event) => setInterpreterModel(event.target.value)}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  [{model.provider}] {model.label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm text-slate-300">
              {models.find((model) => model.id === interpreterModel)?.description}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
            <div className="soft-label">Caveat</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This system predicts average-subject brain responses to the media. It does not identify an individual viewer&apos;s real mental state.
            </p>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-slate-300"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Starting analysis..." : "Analyze video"}
          </button>
          <div className="text-sm text-slate-400">Jobs run asynchronously so the UI stays responsive during inference.</div>
        </div>
      </div>
    </form>
  );
}
