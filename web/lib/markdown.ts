import type { Block } from "./types";

/**
 * ノート全体を Markdown 文字列に変換する（本文のみ・ハッシュタグなし）。
 * 各ブロックの本文をそのまま改行で連結する。
 */
export function noteToMarkdown(blocks: Block[]): string {
  return blocks.map((b) => b.text ?? "").join("\n");
}

/**
 * 個別ブロックのコピー用テキスト。
 * 本文の末尾に登録済みハッシュタグを付与する（X などへの貼り付け用）。
 */
export function blockToClipboard(block: Block, hashtags: string[]): string {
  const body = (block.text ?? "").trim();
  const tags = hashtags.filter(Boolean).join(" ");
  if (!tags) return body;
  if (!body) return tags;
  return `${body}\n\n${tags}`;
}

/**
 * 個別ブロックをコピーしたときの文字数（本文＋ハッシュタグ込み）。
 * 絵文字・サロゲートペアを 1 文字として数えるためコードポイント単位で計測する。
 */
export function clipboardLength(block: Block, hashtags: string[]): number {
  return Array.from(blockToClipboard(block, hashtags)).length;
}

/** "#foo, bar #baz" のような入力を ["#foo", "#bar", "#baz"] へ正規化する */
export function normalizeHashtags(input: string): string[] {
  return input
    .split(/[\s,、]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}
