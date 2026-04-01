import { AnalysisRecord, InterpreterModelOption } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function resolveApiAssetUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/${path}`;
}

export async function fetchInterpreterModels(): Promise<InterpreterModelOption[]> {
  const response = await fetch(`${API_BASE_URL}/interpreter-models`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load interpreter models.");
  }
  return response.json();
}

export async function createAnalysis(video: File, interpreterModel: string): Promise<{ id: string; status: string }> {
  const formData = new FormData();
  formData.append("video", video);
  formData.append("interpreter_model", interpreterModel);

  const response = await fetch(`${API_BASE_URL}/analyses`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Failed to create analysis.");
  }

  return response.json();
}

export async function fetchAnalysis(id: string): Promise<AnalysisRecord> {
  const response = await fetch(`${API_BASE_URL}/analyses/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Analysis not found.");
  }
  return response.json();
}
