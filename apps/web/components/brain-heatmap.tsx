import { TribeResult } from "@/lib/types";


function colorForValue(value: number) {
  const intensity = Math.max(0.12, Math.min(1, value));
  const alpha = 0.18 + intensity * 0.72;
  return `rgba(34, 211, 238, ${alpha})`;
}


export function BrainHeatmap({ tribe }: { tribe: TribeResult }) {
  const rows = tribe.heatmap.slice(0, 90);
  const columns = rows[0]?.length ?? 0;

  return (
    <div className="glass rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="soft-label">Brain Map</div>
          <h3 className="mt-2 text-xl font-semibold">Downsampled cortical response matrix</h3>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>{tribe.mode === "real" ? "TRIBE v2 output" : "Mock development output"}</div>
          <div>{rows.length} time slices</div>
        </div>
      </div>
      <div className="mb-4 text-sm leading-6 text-slate-300">
        Each row represents a second of predicted response. Each column is a downsampled vertex bucket over the cortical mesh for compact inspection in the browser.
      </div>
      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/40 p-3">
        <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {rows.flatMap((row, rowIndex) =>
            row.map((value, columnIndex) => (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className="heatmap-cell"
                style={{ background: colorForValue(value) }}
                title={`t=${rowIndex}s, bucket=${columnIndex}, value=${value}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
