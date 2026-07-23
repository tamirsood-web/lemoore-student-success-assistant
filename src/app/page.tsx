// Public student home page — enhanced demo layout for live presentation.
// Server component; ChatInterface is "use client".

import { ChatInterface } from "@/features/chat";
import { Sparkles, Clock, Shield, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      {/* Enhanced Header for Demo */}
      <header className="shrink-0 border-b border-border/50 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Lemoore College Student Success Assistant
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered support • Instant answers • Official sources
              </p>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-900 dark:bg-blue-900/30 dark:text-blue-300">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Available 24/7
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Verified Information
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-900 dark:bg-purple-900/30 dark:text-purple-300">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Official College Sources
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface with Demo Styling */}
      <div className="min-h-0 flex-1 p-4">
        <div className="mx-auto h-full max-w-7xl">
          <div className="h-full rounded-2xl border border-border/50 bg-white shadow-2xl dark:bg-gray-900">
            <ChatInterface />
          </div>
        </div>
      </div>

      {/* Demo Footer */}
      <footer className="shrink-0 border-t border-border/50 bg-white/80 backdrop-blur-sm px-6 py-4 dark:bg-gray-900/80">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">🚀 Live Demo</span>
            {" • "}
            Powered by AWS Bedrock Knowledge Bases + Claude Haiku
            {" • "}
            Optimized RAG with cited sources
          </p>
        </div>
      </footer>
    </main>
  );
}
