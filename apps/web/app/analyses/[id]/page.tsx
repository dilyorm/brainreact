import { notFound } from "next/navigation";

import { AnalysisPageClient } from "@/components/analysis-page-client";
import { fetchAnalysis } from "@/lib/api";


export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await fetchAnalysis(id).catch(() => null);

  if (!analysis) {
    notFound();
  }

  return <AnalysisPageClient initialAnalysis={analysis} />;
}
