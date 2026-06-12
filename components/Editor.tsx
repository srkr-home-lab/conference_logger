"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Block } from "@/lib/types";
import { createBlock } from "@/lib/types";
import { noteToMarkdown, blockToClipboard } from "@/lib/markdown";
import { loadNote, saveNote, clearNote } from "@/lib/storage";
import { BlockRow, type FocusPos } from "./BlockRow";
import { Toolbar } from "./Toolbar";
import styles from "./Editor.module.css";

interface FocusReq {
  id: string;
  pos: FocusPos;
}

export function Editor() {
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([createBlock()]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // フォーカスを当てたいブロックの要求（state でブロックに渡す）
  const [focusReq, setFocusReq] = useState<FocusReq | null>(null);

  // 最新の blocks をイベントハンドラから参照するための ref
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  // タイトルの高さを内容に合わせて自動調整（折り返し表示）
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  // 初回マウント時にローカルストレージから復元
  useEffect(() => {
    const saved = loadNote();
    if (saved) {
      setTitle(saved.title);
      setBlocks(saved.blocks.length > 0 ? saved.blocks : [createBlock()]);
      setHashtags(saved.hashtags);
    }
    setHydrated(true);
  }, []);

  // 変更を自動保存（復元完了後のみ）
  useEffect(() => {
    if (!hydrated) return;
    saveNote(title, blocks, hashtags);
  }, [title, blocks, hashtags, hydrated]);

  // 現在のテーマを反映（保存済み or OS 設定）
  useEffect(() => {
    const attr = document.documentElement.dataset.theme;
    if (attr === "light" || attr === "dark") {
      setTheme(attr);
    } else {
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
      );
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem("conference-logger:theme", next);
      } catch {
        // 無視
      }
      return next;
    });
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  }, []);

  // Shift+Enter：キャレット位置でブロックを分割し、後半を新規ブロックにする
  const splitBlock = useCallback(
    (id: string, before: string, after: string) => {
      const newBlock = createBlock(after);
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...prev[idx], text: before };
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
      setFocusReq({ id: newBlock.id, pos: "start" });
    },
    []
  );

  // 末尾に新規ブロックを追加（「＋」ボタンから）
  const addBlockAtEnd = useCallback(() => {
    const block = createBlock();
    setBlocks((prev) => [...prev, block]);
    setFocusReq({ id: block.id, pos: "end" });
  }, []);

  const deleteBlock = useCallback((id: string) => {
    const prev = blocksRef.current;
    if (prev.length <= 1) {
      setBlocks([{ ...prev[0], text: "" }]);
      setFocusReq({ id: prev[0].id, pos: "start" });
      return;
    }
    const idx = prev.findIndex((b) => b.id === id);
    const focusTarget = prev[Math.max(0, idx - 1)];
    setBlocks(prev.filter((b) => b.id !== id));
    if (focusTarget) setFocusReq({ id: focusTarget.id, pos: "end" });
  }, []);

  // 先頭で Backspace → 前のブロックへマージ
  const mergeWithPrevious = useCallback((id: string) => {
    const prev = blocksRef.current;
    const idx = prev.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const current = prev[idx];
    const previous = prev[idx - 1];
    const next = [...prev];
    next[idx - 1] = { ...previous, text: previous.text + current.text };
    next.splice(idx, 1);
    setBlocks(next);
    // マージ前の境目（previous の末尾）にカーソルを置く
    setFocusReq({ id: previous.id, pos: previous.text.length });
  }, []);

  const moveFocus = useCallback((id: string, direction: "up" | "down") => {
    const prev = blocksRef.current;
    const idx = prev.findIndex((b) => b.id === id);
    const target = prev[direction === "up" ? idx - 1 : idx + 1];
    if (target) {
      setFocusReq({ id: target.id, pos: direction === "up" ? "end" : "start" });
    }
  }, []);

  // ブロックの本文＋ハッシュタグで X の投稿画面を開く
  const tweetBlock = useCallback(
    (block: Block) => {
      const text = blockToClipboard(block, hashtags);
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [hashtags]
  );

  const copyAll = useCallback(async () => {
    const heading = title.trim() ? `# ${title.trim()}\n\n` : "";
    const md = heading + noteToMarkdown(blocks);
    try {
      await navigator.clipboard.writeText(md);
      showToast("Markdown をコピーしました");
    } catch {
      showToast("コピーに失敗しました");
    }
  }, [title, blocks, showToast]);

  const handleClearAll = useCallback(() => {
    const ok = window.confirm(
      "すべてのメモとハッシュタグを削除します。よろしいですか？"
    );
    if (!ok) return;
    clearNote();
    const fresh = createBlock();
    setTitle("");
    setBlocks([fresh]);
    setHashtags([]);
    setFocusReq(null);
    showToast("すべて削除しました");
  }, [showToast]);

  return (
    <div className={styles.page}>
      <Toolbar
        hashtags={hashtags}
        onChangeHashtags={setHashtags}
        onCopyAll={copyAll}
        onClearAll={handleClearAll}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className={styles.sheet}>
        <textarea
          ref={titleRef}
          className={styles.title}
          value={title}
          rows={1}
          placeholder="セッション名を入力"
          aria-label="セッションのタイトル"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            // Enter で本文先頭ブロックへ（改行は入れない）
            if (e.key === "Enter") {
              e.preventDefault();
              const first = blocks[0];
              if (first) setFocusReq({ id: first.id, pos: "end" });
            }
          }}
          spellCheck={false}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />

        <div className={styles.blocks}>
          {blocks.map((block) => (
            <BlockRow
              key={block.id}
              block={block}
              hashtags={hashtags}
              autoFocus={focusReq?.id === block.id ? focusReq.pos : null}
              onAutoFocused={() => setFocusReq(null)}
              onChangeText={(text) => updateBlock(block.id, { text })}
              onTweet={() => tweetBlock(block)}
              onSplit={(before, after) => splitBlock(block.id, before, after)}
              onDelete={() => deleteBlock(block.id)}
              onMergePrevious={() => mergeWithPrevious(block.id)}
              onMoveFocus={(dir) => moveFocus(block.id, dir)}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.addBlock}
          onClick={addBlockAtEnd}
        >
          ＋ ブロックを追加
        </button>

        {/* スマホ用：ヘッダーに入りきらないアクションを下部に */}
        <div className={styles.bottomActions}>
          <button type="button" className={styles.copyAllBtn} onClick={copyAll}>
            全体をコピー
          </button>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClearAll}
          >
            All clear
          </button>
        </div>

        <p className={styles.hint}>
          各ブロックには Markdown を自由に記入できます（<code>#</code>{" "}
          <code>-</code> <code>**太字**</code> など）。<kbd>Enter</kbd>
          でブロック内改行 ・ 新しいブロックは上の「＋」または{" "}
          <kbd>Shift</kbd> + <kbd>Enter</kbd>（PC）・ 全体をコピーすると
          Markdown として連結されます
        </p>

      </main>

      <a
        className={styles.coffee}
        href="https://buymeacoffee.com/okura"
        target="_blank"
        rel="noreferrer noopener"
        title="Buy me a coffee"
      >
        <span className={styles.coffeeIcon}>☕</span>
        <span className={styles.coffeeText}>Buy me a coffee</span>
      </a>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
