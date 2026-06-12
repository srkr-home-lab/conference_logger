export interface Block {
  id: string;
  /** ブロックの本文。Markdown を自由に書ける */
  text: string;
}

export interface NoteState {
  /** セッションのタイトル */
  title: string;
  blocks: Block[];
  /** 全ブロック共通で末尾付与するハッシュタグ（# 付きで保持） */
  hashtags: string[];
  /** 最終更新時刻（ミリ秒） */
  updatedAt: number;
}

export function createBlock(text = ""): Block {
  return { id: genId(), text };
}

export function genId(): string {
  // crypto.randomUUID はブラウザ・Node 双方で利用可能
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `b_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
