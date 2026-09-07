import type { GameState } from "../types.js";

const AUTOSAVE_KEY = "tsg_corp_autosave_v1";
const SAVE_VERSION = 1;

export function serializeState(state: GameState): string {
  return JSON.stringify({ ...state, version: SAVE_VERSION }, null, 2);
}

export function deserializeState(text: string): GameState | null {
  try {
    const obj = JSON.parse(text) as GameState;
    if (typeof obj.day !== "number" || !Array.isArray(obj.staff)) return null;
    return obj;
  } catch {
    return null;
  }
}

export function downloadSave(state: GameState, filename = `tsg_corp_save_day${state.day}.json`) {
  const blob = new Blob([serializeState(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function loadSaveFromFile(file: File): Promise<GameState | null> {
  return file.text().then((text) => deserializeState(text));
}

export function autoSave(state: GameState) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeState(state));
  } catch {
    // 容量超過等は無視(手動セーブを促す)
  }
}

export function loadAutoSave(): GameState | null {
  const text = localStorage.getItem(AUTOSAVE_KEY);
  if (!text) return null;
  return deserializeState(text);
}

export function hasAutoSave(): boolean {
  return localStorage.getItem(AUTOSAVE_KEY) !== null;
}
