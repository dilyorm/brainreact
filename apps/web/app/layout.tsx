import type { Metadata } from "next";

import "./globals.css";


export const metadata: Metadata = {
  title: "BrainReact",
  description: "Upload a video, run TRIBE v2, and inspect Gemini or NVIDIA-backed interpretations of predicted brain response.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
