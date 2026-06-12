"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { normalizeHashtags } from "@/lib/markdown";
import styles from "./Toolbar.module.css";

interface Props {
  hashtags: string[];
  onChangeHashtags: (tags: string[]) => void;
  onCopyAll: () => void;
  onClearAll: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Toolbar({
  hashtags,
  onChangeHashtags,
  onCopyAll,
  onClearAll,
  theme,
  onToggleTheme,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        commitDraft();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft, hashtags]);

  const commitDraft = () => {
    const tags = normalizeHashtags(draft);
    if (tags.length === 0) return;
    const merged = Array.from(new Set([...hashtags, ...tags]));
    onChangeHashtags(merged);
    setDraft("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // IME 変換確定の Enter ではコミットしない
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && hashtags.length > 0) {
      onChangeHashtags(hashtags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChangeHashtags(hashtags.filter((t) => t !== tag));
  };

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.dot} />
          Conference Logger
        </div>

        <div className={styles.spacer} />

        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleTheme}
          title={theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"}
          aria-label="テーマを切り替え"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className={styles.hashtagWrap}>
          <button
            type="button"
            className={styles.tagButton}
            data-active={hashtags.length > 0}
            onClick={() => setOpen((v) => !v)}
            title="コピー時に付与するハッシュタグを登録"
          >
            # ハッシュタグ
            {hashtags.length > 0 && (
              <span className={styles.count}>{hashtags.length}</span>
            )}
          </button>

          {open && (
            <div className={styles.panel} ref={panelRef}>
              <p className={styles.panelTitle}>
                ブロックをコピーすると末尾に付与されます
              </p>
              <div className={styles.chips}>
                {hashtags.map((tag) => (
                  <span key={tag} className={styles.chip}>
                    {tag}
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => removeTag(tag)}
                      aria-label={`${tag} を削除`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  className={styles.tagInput}
                  value={draft}
                  placeholder={
                    hashtags.length === 0 ? "#カンファレンス名 など" : "追加…"
                  }
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                  onBlur={commitDraft}
                  autoFocus
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onCopyAll}>
            全体をコピー
          </button>
          <button type="button" className={styles.danger} onClick={onClearAll}>
            All clear
          </button>
        </div>
      </div>
    </header>
  );
}
