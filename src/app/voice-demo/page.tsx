import type { Metadata } from "next";
import { VoiceDemo } from "@/features/voice/VoiceDemo";

export const metadata: Metadata = {
  title: "Voice Assistant Demo — Lemoore College (Simulation)",
  description:
    "A browser simulation of an unanswered Lemoore College support call redirected to the AI " +
    "student assistant. Simulation only — no real phone call is placed.",
};

// Standalone route (outside the public marketing shell) so the call simulation renders
// full-screen. Reuses the shared /api/search pipeline for grounded answers + citations.
export default function VoiceDemoPage() {
  return <VoiceDemo />;
}
