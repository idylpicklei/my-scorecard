"use client";

import { useEffect, useRef, useState } from "react";
import type { ScorecardEntryPlayer } from "@/app/scorecard-entry";
import type { ParsedScorecardPlayer } from "@/lib/scorecard-scan";

type ScorecardScanUploadProps = {
  knownPlayers: string[];
  onApply: (players: ScorecardEntryPlayer[]) => void;
  disabled?: boolean;
};

export function ScorecardScanUpload({
  knownPlayers,
  onApply,
  disabled = false,
}: ScorecardScanUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ParsedScorecardPlayer[] | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearSelection() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setLastResult(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    clearSelection();

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose a photo (JPEG, PNG, or WebP).");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleScan() {
    if (!selectedFile) {
      setError("Take or choose a scorecard photo first.");
      return;
    }

    setIsScanning(true);
    setError(null);
    setLastResult(null);

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("knownPlayers", JSON.stringify(knownPlayers));

    try {
      const response = await fetch("/api/scorecards/scan", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        players?: ParsedScorecardPlayer[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Scan failed. Try again with a clearer photo.");
        return;
      }

      const players = payload.players ?? [];
      if (players.length === 0) {
        setError("No scores were detected. Try a clearer, well-lit photo.");
        return;
      }

      setLastResult(players);
      onApply(
        players.map((player) => ({
          playerName: player.playerName,
          holes: [...player.holes],
        })),
      );
    } catch {
      setError("Network error while scanning. Check your connection and try again.");
    } finally {
      setIsScanning(false);
    }
  }

  const filledSummary = lastResult?.map((player) => {
    const filled = player.holes.filter((score) => score > 0).length;
    return `${player.playerName}: ${filled}/18 holes`;
  });

  return (
    <section className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-stone-900">Scan scorecard photo</h3>
          <p className="mt-1 text-xs text-stone-600">
            Photograph the completed card — Gemini reads names and hole scores into the form
            below. Review before saving.
          </p>
        </div>
        {selectedFile ? (
          <button
            type="button"
            onClick={clearSelection}
            disabled={isScanning || disabled}
            className="text-xs font-semibold text-stone-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Clear photo
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || isScanning}
        onChange={handleFileChange}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled || isScanning}
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selectedFile ? "Change photo" : "Take or choose photo"}
        </button>
        <button
          type="button"
          disabled={disabled || isScanning || !selectedFile}
          onClick={() => void handleScan()}
          className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isScanning ? "Reading scorecard…" : "Fill scores from photo"}
        </button>
      </div>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Scorecard preview"
          className="mt-3 max-h-48 w-full rounded-lg border border-stone-200 object-contain bg-white"
        />
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {filledSummary && filledSummary.length > 0 ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900">
          Applied: {filledSummary.join(" · ")}. Fix any missing holes in the pad below, then save.
        </p>
      ) : null}
    </section>
  );
}
