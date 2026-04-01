"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { TimelinePoint } from "@/lib/types";


export function TimelineChart({ data }: { data: TimelinePoint[] }) {
  return (
    <div className="glass rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="soft-label">Timeline</div>
          <h3 className="mt-2 text-xl font-semibold">Predicted activation intensity</h3>
        </div>
        <div className="text-sm text-slate-400">1 point per second</div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="activationFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.65} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis tick={{ fill: "#94a3b8", fontSize: 12 }} dataKey="time" tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ stroke: "rgba(34,211,238,0.3)" }}
              contentStyle={{
                background: "rgba(2,6,23,0.92)",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 16,
                color: "#e2e8f0",
              }}
            />
            <Area type="monotone" dataKey="activation" stroke="#67e8f9" strokeWidth={2} fill="url(#activationFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
