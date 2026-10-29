import { ExternalLink } from "lucide-react";
import { createRoot } from "react-dom/client";
import { AlphabeteerApp, meta } from "../src";
import "./demo.css";

// Standalone GitHub Pages shell: app title and a way back to the rest of the free tools
createRoot(document.getElementById("root") as HTMLElement).render(
  <div className="flex h-full flex-col bg-white">
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
      <h1 className="truncate text-base font-extrabold text-slate-900">{meta.title}</h1>
      <a
        href={`https://get-out-there.app/packages/${meta.id}`}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-700"
      >
        More free tools
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </header>
    <main className="min-h-0 flex-1">
      <AlphabeteerApp />
    </main>
  </div>
);
