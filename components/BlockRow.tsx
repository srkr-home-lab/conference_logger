"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Block } from "@/lib/types";
import { clipboardLength } from "@/lib/markdown";
import { renderMarkdown } from "@/lib/render";
import styles from "./BlockRow.module.css";

/** フォーカス位置。数値はキャレットのオフセット */
export type FocusPos = "start" | "end" | number;

/**
 * リスト行の途中で Enter したときの継続処理。
 * - 内容のある項目 → 次行に同じマーカーを付ける
 * - 空の項目 → マーカーを消してリストを抜ける
 * リスト行でなければ null（通常の改行にまかせる）。
 */
function continueList(
  value: string,
  caret: number
): { value: string; caret: number } | null {
  const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  const nl = value.indexOf("\n", caret);
  const lineEnd = nl === -1 ? value.length : nl;
  const line = value.slice(lineStart, lineEnd);

  const task = line.match(/^(\s*)([-*+])\s\[([ xX])\]\s(.*)$/);
  const ul = line.match(/^(\s*)([-*+])\s(.*)$/);
  const ol = line.match(/^(\s*)(\d+)\.\s(.*)$/);

  let marker: string | null = null;
  let content: string | null = null;

  if (task) {
    marker = `${task[1]}${task[2]} [ ] `;
    content = task[4];
  } else if (ul) {
    marker = `${ul[1]}${ul[2]} `;
    content = ul[3];
  } else if (ol) {
    marker = `${ol[1]}${Number(ol[2]) + 1}. `;
    content = ol[3];
  }

  if (marker === null || content === null) return null;

  // 空の項目で Enter → マーカーを消してリストを抜ける
  if (content.trim() === "") {
    return {
      value: value.slice(0, lineStart) + value.slice(lineEnd),
      caret: lineStart,
    };
  }

  // 内容あり → キャレット位置で改行して次のマーカーを挿入
  const insert = `\n${marker}`;
  return {
    value: value.slice(0, caret) + insert + value.slice(caret),
    caret: caret + insert.length,
  };
}

interface Props {
  block: Block;
  hashtags: string[];
  /** このブロックにフォーカスを当てたいときの位置。不要なら null */
  autoFocus: FocusPos | null;
  /** フォーカスを反映し終えたら呼ぶ（親側の要求をクリア） */
  onAutoFocused: () => void;
  onChangeText: (text: string) => void;
  onSplit: (before: string, after: string) => void;
  onDelete: () => void;
  onMergePrevious: () => void;
  onMoveFocus: (dir: "up" | "down") => void;
  onTweet: () => void;
}

export function BlockRow({
  block,
  hashtags,
  autoFocus,
  onAutoFocused,
  onChangeText,
  onSplit,
  onDelete,
  onMergePrevious,
  onMoveFocus,
  onTweet,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // フォーカス要求があるブロックは最初から編集モードでマウントする
  const [editing, setEditing] = useState(autoFocus != null);
  const pendingPos = useRef<FocusPos | null>(autoFocus);

  const focusAt = (pos: FocusPos) => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    const p =
      pos === "start" ? 0 : pos === "end" ? len : Math.max(0, Math.min(pos, len));
    el.setSelectionRange(p, p);
  };

  const tryFocus = () => {
    if (pendingPos.current == null || !textareaRef.current) return;
    focusAt(pendingPos.current);
    pendingPos.current = null;
    onAutoFocused();
  };

  // 親からのフォーカス要求
  useEffect(() => {
    if (autoFocus == null) return;
    pendingPos.current = autoFocus;
    if (textareaRef.current) tryFocus();
    else setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // 編集モードに入ったらフォーカスを反映
  useEffect(() => {
    if (editing) tryFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // 編集中は高さを内容に合わせて自動調整
  useLayoutEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, block.text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;

    // Shift+Enter はキャレット位置で分割して新しいブロックへ
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      onSplit(
        el.value.slice(0, el.selectionStart),
        el.value.slice(el.selectionEnd)
      );
      return;
    }

    // 素の Enter：リスト行の途中なら次の項目を継続。それ以外は通常の改行
    if (e.key === "Enter" && !e.shiftKey && el.selectionStart === el.selectionEnd) {
      const result = continueList(el.value, el.selectionStart);
      if (result) {
        e.preventDefault();
        onChangeText(result.value);
        const caret = result.caret;
        requestAnimationFrame(() => {
          const ta = textareaRef.current;
          if (ta) ta.setSelectionRange(caret, caret);
        });
      }
      return;
    }

    if (e.key === "Backspace" && atStart) {
      e.preventDefault();
      onMergePrevious();
      return;
    }

    if (e.key === "ArrowUp" && atStart) {
      e.preventDefault();
      onMoveFocus("up");
      return;
    }
    if (e.key === "ArrowDown" && atEnd) {
      e.preventDefault();
      onMoveFocus("down");
      return;
    }
  };

  const startEditing = () => {
    pendingPos.current = "end";
    setEditing(true);
  };

  const hasHashtags = hashtags.length > 0;
  const charCount = clipboardLength(block, hashtags);
  const tweetTitle = hasHashtags
    ? "本文＋ハッシュタグをツイート"
    : "本文をツイート";
  const countTitle = hasHashtags ? "ハッシュタグ込みの文字数" : "文字数";
  const isEmpty = block.text.trim() === "";

  return (
    <div className={styles.row}>
      <div className={styles.content}>
        {editing ? (
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={block.text}
            rows={1}
            placeholder="Markdown でメモを入力…"
            aria-label="ブロック"
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setEditing(false)}
            spellCheck={false}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
          />
        ) : isEmpty ? (
          <div className={styles.placeholder} onClick={startEditing}>
            クリックして入力…
          </div>
        ) : (
          <div
            className={styles.preview}
            onClick={startEditing}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }}
          />
        )}
      </div>

      <div className={styles.actions}>
        <span
          className={styles.count}
          title={countTitle}
          data-warn={charCount > 280}
        >
          {charCount}
        </span>
        <button
          type="button"
          className={styles.tweetBtn}
          title={tweetTitle}
          onClick={onTweet}
        >
          𝕏 ツイート
        </button>
      </div>

      <button
        type="button"
        className={styles.deleteBtn}
        title="このブロックを削除"
        onClick={onDelete}
      >
        ✕
      </button>
    </div>
  );
}
