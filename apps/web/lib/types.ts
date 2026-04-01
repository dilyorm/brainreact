export type AnalysisStatus = "queued" | "processing" | "completed" | "error";

export type InterpreterModelOption = {
  id: string;
  provider: string;
  label: string;
  description: string;
};

export type TimelinePoint = {
  time: number;
  activation: number;
  normalized: number;
};

export type PeakMoment = {
  time: number;
  score: number;
  label: string;
  context: string;
};

export type RegionalActivation = {
  roi: string;
  value: number;
};

export type BrainVisual = {
  kind: "overall" | "peak";
  label: string;
  time: number | null;
  image_path: string;
  regions: RegionalActivation[];
};

export type RegionalSummaryWindow = {
  window: string;
  time: number | null;
  regions: RegionalActivation[];
};

export type TranscriptMoment = {
  type: string;
  start: number;
  duration: number;
  text: string;
};

export type TribeResult = {
  mode: "real" | "mock";
  model: string;
  license: string;
  duration_seconds: number;
  time_step_seconds: number;
  hemodynamic_lag_seconds: number;
  timeline: TimelinePoint[];
  heatmap: number[][];
  transcript: TranscriptMoment[];
  peaks: PeakMoment[];
  brain_visuals: BrainVisual[];
  regional_summary: RegionalSummaryWindow[];
  stats: Record<string, number>;
  notes: string[];
};

export type InterpretationResult = {
  provider: string;
  model?: string;
  summary: string;
  possible_meanings: string[];
  moment_annotations: Array<{ time: number; headline: string; explanation: string }>;
  caveats: string[];
};

export type AnalysisResult = {
  tribe: TribeResult;
  interpretation: InterpretationResult;
  method: {
    source: string;
    hemodynamic_lag_seconds: number;
    interpreter_model: string;
  };
};

export type AnalysisRecord = {
  id: string;
  original_filename: string;
  stored_filename: string;
  video_path: string;
  public_video_path: string;
  public_video_url?: string | null;
  status: AnalysisStatus;
  interpreter_model: string;
  error_message: string | null;
  result: AnalysisResult | null;
  created_at: string;
  updated_at: string;
};
