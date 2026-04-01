import { BrainHeatmap } from "@/components/brain-heatmap";
import { StatusPill } from "@/components/status-pill";
import { TimelineChart } from "@/components/timeline-chart";
import { resolveApiAssetUrl } from "@/lib/api";
import { AnalysisRecord } from "@/lib/types";


function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
      <div className="soft-label">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}


function RegionChips({ regions }: { regions: Array<{ roi: string; value: number }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((region) => (
        <div key={`${region.roi}-${region.value}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-200">
          {region.roi} <span className="text-slate-400">{region.value}</span>
        </div>
      ))}
    </div>
  );
}


export function AnalysisDashboard({ analysis }: { analysis: AnalysisRecord }) {
  const result = analysis.result;
  if (!result) {
    return null;
  }

  const tribe = result.tribe;
  const interpretation = result.interpretation;
  const videoSource = resolveApiAssetUrl(analysis.public_video_url ?? analysis.public_video_path);
  const primaryBrainVisual = tribe.brain_visuals[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="panel-grid">
        <div className="glass rounded-[32px] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="soft-label">Analysis</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">{analysis.original_filename}</h2>
            </div>
            <StatusPill status={analysis.status} />
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60">
            <video className="aspect-video w-full bg-black" controls src={videoSource ?? undefined} preload="metadata" />
          </div>

          <div className="metric-grid mt-6">
            <MetricCard label="TRIBE mode" value={tribe.mode === "real" ? "Live inference" : "Mock fallback"} />
            <MetricCard label="Duration" value={`${tribe.duration_seconds.toFixed(1)}s`} />
            <MetricCard label="Peak activation" value={String(tribe.stats.peak_activation ?? "-")} />
            <MetricCard label="Interpreter model" value={analysis.interpreter_model} />
          </div>
        </div>

        <div className="glass rounded-[32px] p-6 sm:p-7">
          <div className="soft-label">Interpretation</div>
          <h3 className="mt-2 text-2xl font-semibold">Possible meaning of the predicted response</h3>
          <p className="mt-4 text-sm leading-7 text-slate-300">{interpretation.summary}</p>

          <div className="divider my-6" />

          <div className="space-y-3">
            {interpretation.possible_meanings.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm leading-6 text-slate-200">
                {item}
              </div>
            ))}
          </div>

          <div className="divider my-6" />

          <div>
            <div className="soft-label">Caveats</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
              {interpretation.caveats.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TimelineChart data={tribe.timeline} />

      <section className="panel-grid">
        <div className="glass rounded-[28px] p-5 sm:p-6">
          <div className="soft-label">Brain Snapshot</div>
          <h3 className="mt-2 text-xl font-semibold">Cortical surface summary</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            These renders come from the fsaverage5 cortical mesh output of TRIBE v2. The first image shows the overall mean predicted response, followed by top peak windows.
          </p>

          {primaryBrainVisual ? (
            <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-white p-3">
              <img
                alt={primaryBrainVisual.label}
                className="w-full rounded-[20px] object-contain"
                src={resolveApiAssetUrl(primaryBrainVisual.image_path) ?? undefined}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/4 p-5 text-sm text-slate-300">
              Brain snapshot assets were not generated for this analysis run.
            </div>
          )}

          {primaryBrainVisual ? (
            <div className="mt-4">
              <div className="mb-3 text-sm font-medium text-white">Dominant regions in the mean response</div>
              <RegionChips regions={primaryBrainVisual.regions} />
            </div>
          ) : null}
        </div>

        <div className="glass rounded-[28px] p-5 sm:p-6">
          <div className="soft-label">Agent Summary</div>
          <h3 className="mt-2 text-xl font-semibold">Most likely cognitive drivers</h3>
          <div className="mt-5 space-y-3">
            {interpretation.moment_annotations.map((item) => (
              <div key={`${item.time}-${item.headline}`} className="rounded-3xl border border-white/10 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">{item.headline}</div>
                  <div className="rounded-full bg-violet-400/10 px-3 py-1 text-xs tracking-[0.16em] text-violet-200">t={item.time}s</div>
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{item.explanation}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {tribe.brain_visuals.length > 1 ? (
        <section className="glass rounded-[28px] p-5 sm:p-6">
          <div className="soft-label">Peak Brain Views</div>
          <h3 className="mt-2 text-xl font-semibold">Top response windows on the cortical surface</h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {tribe.brain_visuals.slice(1).map((visual) => (
              <div key={`${visual.label}-${visual.time}`} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">{visual.label}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{visual.time !== null ? `t=${visual.time}s` : "overall"}</div>
                </div>
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white p-2">
                  <img alt={visual.label} className="w-full rounded-[14px] object-contain" src={resolveApiAssetUrl(visual.image_path) ?? undefined} />
                </div>
                <div className="mt-4">
                  <RegionChips regions={visual.regions} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <BrainHeatmap tribe={tribe} />

      <section className="panel-grid">
        <div className="glass rounded-[28px] p-5 sm:p-6">
          <div className="soft-label">Peak Moments</div>
          <h3 className="mt-2 text-xl font-semibold">Highest predicted response windows</h3>
          <div className="mt-5 space-y-3">
            {tribe.peaks.map((peak) => (
              <div key={`${peak.time}-${peak.score}`} className="rounded-3xl border border-white/10 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">{peak.label}</div>
                  <div className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs tracking-[0.16em] text-cyan-200">t={peak.time}s</div>
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{peak.context}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[28px] p-5 sm:p-6">
          <div className="soft-label">Transcript And Method</div>
          <h3 className="mt-2 text-xl font-semibold">What the backend aligned to the predictions</h3>

          <div className="mt-5 space-y-3">
            {tribe.transcript.slice(0, 10).map((item) => (
              <div key={`${item.type}-${item.start}-${item.text}`} className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {item.type} at {item.start}s
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">{item.text}</div>
              </div>
            ))}
          </div>

          <div className="divider my-6" />

          <div className="space-y-4">
            {tribe.regional_summary.map((window) => (
              <div key={`${window.window}-${window.time}`} className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">{window.window}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{window.time !== null ? `t=${window.time}s` : "overall"}</div>
                </div>
                <div className="mt-3">
                  <RegionChips regions={window.regions} />
                </div>
              </div>
            ))}
          </div>

          <div className="divider my-6" />

          <div className="space-y-3 text-sm leading-6 text-slate-300">
            <div>
              <span className="text-slate-100">Source:</span> {result.method.source}
            </div>
            <div>
              <span className="text-slate-100">Hemodynamic lag compensation:</span> {result.method.hemodynamic_lag_seconds}s
            </div>
            <div>
              <span className="text-slate-100">TRIBE license:</span> {tribe.license}
            </div>
            {tribe.notes.map((note) => (
              <div key={note} className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                {note}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
