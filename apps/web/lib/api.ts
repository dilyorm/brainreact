import { AnalysisRecord, InterpreterModelOption } from "@/lib/types";

const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const SERVER_API_BASE_URL = process.env.API_INTERNAL_BASE_URL ?? "http://127.0.0.1:8000";

function getFetchBaseUrl() {
  return typeof window === "undefined" ? SERVER_API_BASE_URL : PUBLIC_API_BASE_URL;
}

export function getApiBaseUrl() {
  return PUBLIC_API_BASE_URL;
}

export function resolveApiAssetUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${PUBLIC_API_BASE_URL}${path}`;
  }
  return `${PUBLIC_API_BASE_URL}/${path}`;
}

export async function fetchInterpreterModels(): Promise<InterpreterModelOption[]> {
  const response = await fetch(`${getFetchBaseUrl()}/interpreter-models`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load interpreter models.");
  }
  return response.json();
}

export async function createAnalysis(video: File, interpreterModel: string): Promise<{ id: string; status: string }> {
  const formData = new FormData();
  formData.append("video", video);
  formData.append("interpreter_model", interpreterModel);

  const response = await fetch(`${getFetchBaseUrl()}/analyses`, {
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
  const response = await fetch(`${getFetchBaseUrl()}/analyses/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Analysis not found.");
  }
  return response.json();
}
