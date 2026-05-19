import { GoogleGenerativeAI } from "@google/generative-ai";

export type ParsedScorecardPlayer = {
  playerName: string;
  holes: number[];
};

const MIN_SCORE = 1;
const MAX_SCORE = 15;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function isAllowedScorecardImageType(mimeType: string) {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function assertScorecardImageSize(byteLength: number) {
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10 MB or smaller.");
  }
  if (byteLength === 0) {
    throw new Error("Image file is empty.");
  }
}

export function matchPlayerToRoster(rawName: string, knownPlayers: string[]): string {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const exact = knownPlayers.find((name) => name.toLowerCase() === lower);
  if (exact) {
    return exact;
  }

  const partial = knownPlayers.find(
    (name) =>
      lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower),
  );
  return partial ?? trimmed;
}

function normalizeHoleScore(value: unknown): number {
  const score = Math.round(Number(value));
  if (!Number.isFinite(score)) {
    return 0;
  }
  if (score < MIN_SCORE || score > MAX_SCORE) {
    return 0;
  }
  return score;
}

function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

export function normalizeGeminiScorecardResponse(
  raw: unknown,
  knownPlayers: string[],
): ParsedScorecardPlayer[] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Could not read scores from the image.");
  }

  const playersRaw = (raw as { players?: unknown }).players;
  if (!Array.isArray(playersRaw) || playersRaw.length === 0) {
    throw new Error("No players were detected on the scorecard.");
  }

  const parsed: ParsedScorecardPlayer[] = [];

  for (const entry of playersRaw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as { playerName?: unknown; holes?: unknown };
    const playerName = matchPlayerToRoster(String(record.playerName ?? ""), knownPlayers);
    if (!playerName) {
      continue;
    }

    const holesSource = Array.isArray(record.holes) ? record.holes : [];
    const holes = Array.from({ length: 18 }, (_, index) =>
      normalizeHoleScore(holesSource[index]),
    );

    if (holes.every((score) => score <= 0)) {
      continue;
    }

    parsed.push({ playerName, holes });
  }

  if (parsed.length === 0) {
    throw new Error("No valid hole scores were found. Try a clearer photo.");
  }

  return parsed;
}

function buildScanPrompt(knownPlayers: string[]) {
  const roster =
    knownPlayers.length > 0
      ? knownPlayers.join(", ")
      : "any visible player names";

  return `You are reading a golf scorecard photo for a weekend trip app.

Extract every player row visible on the scorecard with exactly 18 hole scores (holes 1 through 18).
Use these trip player names when they match (spelling may differ on the card): ${roster}.

Return ONLY valid JSON in this shape (no markdown):
{
  "players": [
    { "playerName": "ExactOrBestName", "holes": [4,5,4,3,5,4,4,3,5,4,4,5,4,3,5,4,4,5] }
  ]
}

Rules:
- "holes" must be an array of exactly 18 integers (gross strokes per hole).
- Use 0 for a hole you cannot read; still return 18 entries.
- Ignore par/handicap rows; only stroke counts per player.
- If multiple players are on the card, include each in "players".
- Do not invent players that are not on the card.`;
}

export async function parseScorecardImageWithGemini(
  imageBytes: Buffer,
  mimeType: string,
  knownPlayers: string[],
): Promise<ParsedScorecardPlayer[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  assertScorecardImageSize(imageBytes.length);

  if (!isAllowedScorecardImageType(mimeType)) {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const result = await model.generateContent([
    { text: buildScanPrompt(knownPlayers) },
    {
      inlineData: {
        mimeType,
        data: imageBytes.toString("base64"),
      },
    },
  ]);

  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini did not return any data.");
  }

  let payload: unknown;
  try {
    payload = extractJsonPayload(text);
  } catch {
    throw new Error("Could not parse scores from the image. Try another photo.");
  }

  return normalizeGeminiScorecardResponse(payload, knownPlayers);
}

export function mergeScannedIntoEntryPlayers(
  current: Array<{ playerName: string; holes: number[] }>,
  scanned: ParsedScorecardPlayer[],
): Array<{ playerName: string; holes: number[] }> {
  const next = current.map((player) => ({
    playerName: player.playerName,
    holes: [...player.holes],
  }));

  for (const row of scanned) {
    const index = next.findIndex(
      (player) => player.playerName.toLowerCase() === row.playerName.toLowerCase(),
    );

    if (index >= 0) {
      next[index] = {
        playerName: row.playerName,
        holes: row.holes.map((score, holeIndex) =>
          score > 0 ? score : next[index].holes[holeIndex] ?? 0,
        ),
      };
      continue;
    }

    const emptyIndex = next.findIndex((player) => !player.playerName.trim());
    if (emptyIndex >= 0) {
      next[emptyIndex] = { playerName: row.playerName, holes: [...row.holes] };
    } else {
      next.push({ playerName: row.playerName, holes: [...row.holes] });
    }
  }

  return next;
}
