import { Download, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { type BeforeExport, downloadJson } from "../lib/storage";

interface Props<T> {
  filename: string;
  data: T;
  /** Returns the parsed data, or null when the file is not a valid backup */
  parse: (raw: unknown) => T | null;
  onRestore: (data: T) => void;
  beforeExport?: BeforeExport;
}

/** Download and restore all app data as a JSON file. Data otherwise lives only in this browser. */
export function DataBackup<T>({ filename, data, parse, onRestore, beforeExport }: Props<T>) {
  const input = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const [status, setStatus] = useState("");

  async function download() {
    try {
      await beforeExport?.("Download your data");
    } catch {
      return;
    }
    downloadJson(filename, data);
    setStatus("Backup downloaded.");
  }

  async function pick() {
    try {
      await beforeExport?.("Restore your data");
    } catch {
      return;
    }
    input.current?.click();
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parse(JSON.parse(await file.text()));
      if (!parsed) throw new Error("invalid");
      onRestore(parsed);
      setStatus("Backup restored.");
    } catch {
      setStatus("That file is not a backup from this app.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const button =
    "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";
  return (
    <section
      aria-labelledby={`${statusId}-h`}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <h2 id={`${statusId}-h`} className="font-semibold text-slate-900">
        Your data
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Saved in this browser only. Download a backup to keep it safe or move it to another device.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={download} className={button}>
          <Download size={16} aria-hidden="true" />
          Download backup
        </button>
        <button type="button" onClick={pick} className={button}>
          <Upload size={16} aria-hidden="true" />
          Restore backup
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => restore(e.target.files?.[0])}
        />
      </div>
      <p id={statusId} role="status" className="mt-2 text-sm text-slate-700">
        {status}
      </p>
    </section>
  );
}
