import { useEffect, useRef, useState } from "react";
import type { CellValue } from "@/lib/tables";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Input } from "@/ui/components/ui/input";

type EditableTextCellProps = {
  value: CellValue;
  disabled?: boolean;
  onSave: (value: string | null) => void;
};

export function EditableTextCell({ value, disabled = false, onSave }: EditableTextCellProps) {
  const display = typeof value === "string" ? value : "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(display);
    }
  }, [display, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    const normalized = next.length > 0 ? next : null;
    const current = typeof value === "string" && value.length > 0 ? value : null;
    setEditing(false);
    if (normalized !== current) {
      onSave(normalized);
    }
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        disabled={disabled}
        className="h-7 min-w-40 rounded-md px-2 text-sm"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            setDraft(display);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className="flex h-7 min-w-40 max-w-80 items-center rounded-md px-2 text-left text-sm hover:bg-muted/70 disabled:opacity-50"
      onClick={(event) => {
        if (event.detail === 0) {
          setEditing(true);
        }
      }}
      onDoubleClick={() => setEditing(true)}
    >
      <span className={display ? "truncate text-foreground" : "truncate text-muted-foreground"}>
        {display || "Empty"}
      </span>
    </button>
  );
}

type BooleanCellProps = {
  value: CellValue;
  disabled?: boolean;
  onSave: (value: boolean) => void;
};

export function BooleanCell({ value, disabled = false, onSave }: BooleanCellProps) {
  const checked = value === true;

  return (
    <Checkbox
      checked={checked}
      disabled={disabled}
      aria-label={checked ? "True" : "False"}
      onCheckedChange={(next) => {
        if (typeof next === "boolean") {
          onSave(next);
        }
      }}
    />
  );
}
