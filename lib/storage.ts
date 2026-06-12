import type { Block, NoteState } from "./types";
import { createBlock, genId } from "./types";

const STORAGE_KEY = "conference-logger:note:v1";

/** 保存データの 1 ブロックを安全な Block へ正規化する（壊れた・古いデータ対策） */
function sanitizeBlock(raw: unknown, seenIds: Set<string>): Block {
  const obj = (raw ?? {}) as Partial<Block>;
  let id = typeof obj.id === "string" && obj.id ? obj.id : genId();
  if (seenIds.has(id)) id = genId(); // id 重複を解消
  seenIds.add(id);
  return {
    id,
    text: typeof obj.text === "string" ? obj.text : "",
  };
}

/** 保存（ブラウザのみ・SSR では何もしない） */
export function saveNote(
  title: string,
  blocks: Block[],
  hashtags: string[]
): void {
  if (typeof window === "undefined") return;
  const state: NoteState = { title, blocks, hashtags, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 容量超過などは無視
  }
}

/** 読み込み。保存が無い／壊れている場合は null を返す */
export function loadNote(): NoteState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NoteState>;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    const seenIds = new Set<string>();
    const blocks = parsed.blocks.map((b) => sanitizeBlock(b, seenIds));
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      blocks: blocks.length > 0 ? blocks : [createBlock()],
      hashtags: Array.isArray(parsed.hashtags)
        ? (parsed.hashtags.filter((t) => typeof t === "string") as string[])
        : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

/** 全消去 */
export function clearNote(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}
