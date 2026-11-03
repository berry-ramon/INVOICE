import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/data";

type Tag = "span" | "strong" | "div" | "small" | "p";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
  editable?: boolean;
  multiline?: boolean;
  as?: Tag;
}

export function EditableText({
  value,
  onChange,
  placeholder = "—",
  className = "",
  style,
  onPointerDown,
  editable = true,
  multiline = false,
  as: Tag = "span",
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = multiline ? textareaRef.current : inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, [editing, multiline]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className={`editable-input ${className}`}
          style={style}
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={`editable-input ${className}`}
        style={style}
      />
    );
  }

  /* ─── KEY FIX ─────────────────────────────────────────
     Placeholders are editing hints. They must NEVER appear
     in preview or in the PDF. Treat whitespace-only values
     as empty so a stray " " doesn't leak a label either.  */
  const isEmpty = !value || !value.trim();
  const content = isEmpty ? (editable ? placeholder : "") : value;

  return (
    <Tag
      className={`editable-text ${className}`}
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={(e: React.MouseEvent) => {
        if (!editable) return;
        e.stopPropagation();
        setEditing(true);
      }}
      title={editable ? "Double-click to edit" : undefined}
    >
      {content}
    </Tag>
  );
}

/* ─── Date variant ──────────────────────────────────────── */
interface EditableDateProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
  editable?: boolean;
}

export function EditableDate({
  value,
  onChange,
  className = "",
  style,
  onPointerDown,
  editable = true,
}: EditableDateProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="date"
        value={value}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            setEditing(false);
          }
        }}
        className={`editable-input ${className}`}
        style={style}
      />
    );
  }

  /* Same rule: no "—" placeholder in preview/PDF. */
  const formatted = formatDate(value);
  const content = formatted || (editable ? "—" : "");

  return (
    <span
      className={`editable-text ${className}`}
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={(e: React.MouseEvent) => {
        if (!editable) return;
        e.stopPropagation();
        setEditing(true);
      }}
      title={editable ? "Double-click to change date" : undefined}
    >
      {content}
    </span>
  );
}
