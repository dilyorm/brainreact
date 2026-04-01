import { UploadForm } from "@/components/upload-form";
import { fetchInterpreterModels, getApiBaseUrl } from "@/lib/api";


export default async function HomePage() {
  const models = await fetchInterpreterModels().catch(() => [
    {
      id: "gemini-3-flash-preview",
      provider: "gemini",
      label: "Gemini 3 Flash Preview",
      description: "Faster interpretation for interactive iteration.",
    },
    {
      id: "gemini-3.1-pro-preview",
      provider: "gemini",
      label: "Gemini 3.1 Pro Preview",
      description: "Stronger reasoning for denser interpretation.",
    },
    {
      id: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      provider: "nvidia",
      label: "NVIDIA Nemotron Ultra 253B",
      description: "Highest-end NVIDIA-hosted reasoning option for careful explanation.",
    },
  ]);

  return (
    <main className="pb-16 pt-8 sm:pt-10">
      <div className="shell flex flex-col gap-8">
        <header className="glass rounded-[32px] px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="soft-label">BrainReact</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Video-to-brain-response analysis with TRIBE v2 and selectable interpreters
              </h1>
            </div>
            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100">
              Research demo only
            </div>
          </div>
        </header>

        <section className="hero-grid">
          <div className="glass rounded-[32px] p-6 sm:p-8">
            <div className="soft-label">What it does</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">A minimal interface around a heavy multimodal pipeline</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Upload a video and the backend will run TRIBE v2 to predict average-subject cortical activity over time. A selectable Gemini or NVIDIA-hosted model then summarizes what the strongest predicted response windows may mean, while the dashboard keeps the raw timing structure visible.
            </p>

            <div className="metric-grid mt-8">
              <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                <div className="soft-label">Model path</div>
                <div className="mt-3 text-lg font-semibold text-white">TRIBE v2</div>
                <div className="mt-2 text-sm text-slate-300">Video, audio, and transcript-aware fMRI-like response prediction</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                <div className="soft-label">Interpretation</div>
                <div className="mt-3 text-lg font-semibold text-white">Gemini or NVIDIA selectable</div>
                <div className="mt-2 text-sm text-slate-300">Choose Gemini preview models or curated top-tier NVIDIA-hosted reasoning models</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                <div className="soft-label">UX</div>
                <div className="mt-3 text-lg font-semibold text-white">Async and visual</div>
                <div className="mt-2 text-sm text-slate-300">Live status, activation chart, heatmap, transcript, and caveats</div>
              </div>
            </div>

            <div className="divider my-8" />

            <div className="grid gap-3 text-sm leading-6 text-slate-300">
              <div>1. Upload a short clip locally.</div>
              <div>2. The backend stores the file and creates an async analysis job.</div>
              <div>3. TRIBE v2 predicts brain-response dynamics and the selected interpreter explains the most salient windows.</div>
            </div>
          </div>

          <UploadForm models={models} />
        </section>

        <section className="panel-grid">
          <div className="glass rounded-[28px] p-5 sm:p-6">
            <div className="soft-label">Method</div>
            <h3 className="mt-2 text-2xl font-semibold">Prediction, not measurement</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              TRIBE v2 predicts average-subject fMRI-like activity for a stimulus. It does not decode a real viewer&apos;s private mental state. BrainReact keeps the raw timing structure visible so the interpretation never appears detached from the underlying model output.
            </p>
          </div>

          <div className="glass rounded-[28px] p-5 sm:p-6">
            <div className="soft-label">API</div>
            <h3 className="mt-2 text-2xl font-semibold">Local first</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Frontend expects the API at <code className="rounded bg-white/10 px-1.5 py-0.5">{getApiBaseUrl()}</code>. Real TRIBE v2 inference requires a Python 3.11 environment and model access setup in the backend.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
