import { useRef, useState, type KeyboardEvent } from "react";
import { FileText, Loader2, Paperclip, PencilLine, SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPT } from "@/services/documents";
import type { DocumentRow } from "@/types";
import { useT } from "@/i18n/strings";

export const MAX_INPUT_CHARS = 4000;

export function Composer({
  disabled,
  document,
  documentBusy,
  onSend,
  onExercise,
  onAttach,
  onClearDocument,
}: {
  disabled: boolean;
  document: DocumentRow | null;
  documentBusy: boolean;
  onSend: (text: string) => Promise<boolean>;
  onExercise: () => void;
  onAttach: (file: File) => void;
  onClearDocument: () => void;
}) {
  const t = useT();
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = !disabled && text.trim().length > 0;

  async function submit() {
    if (!canSend) return;
    const value = text.trim();
    setText("");
    // keep the text if sending failed, so the student can retry without retyping
    if (!(await onSend(value))) setText(value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="rounded-2xl border border-ink/15 bg-paper p-2 shadow-[var(--shadow-card)] focus-within:border-[var(--mentor)]">
      {(document || documentBusy) && (
        <div
          className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--mentor-soft)] px-3 py-2 text-xs"
          data-testid="document-chip"
        >
          {documentBusy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Uploading and reading
              your document…
            </>
          ) : (
            document && (
              <>
                <FileText className="size-3.5 text-[var(--mentor-deep)]" aria-hidden="true" />
                <span className="font-medium">{document.file_name}</span>
                <span className="text-slate-deep">
                  {(document.char_count ?? 0).toLocaleString()} characters ·{" "}
                  {document.extraction_method?.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={onClearDocument}
                  className="ms-auto cursor-pointer rounded-full p-0.5 hover:bg-ink/10"
                  aria-label="Stop using this document"
                >
                  <X className="size-3.5" />
                </button>
              </>
            )
          )}
        </div>
      )}
      <label htmlFor="composer" className="sr-only">
        {t("chat.placeholder")}
      </label>
      <textarea
        id="composer"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_INPUT_CHARS))}
        onKeyDown={onKeyDown}
        rows={2}
        dir="auto"
        placeholder={t("chat.placeholder")}
        className="block max-h-48 min-h-[3rem] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink placeholder:text-slate-deep/70 focus:outline-none"
        data-testid="composer-input"
      />
      <div className="flex items-center gap-1.5 pt-1">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAttach(f);
            e.target.value = "";
          }}
          data-testid="file-input"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || documentBusy}
          title="Attach a PDF, text file or photo of your notes (max 10 MB)"
        >
          <Paperclip /> <span className="hidden sm:inline">{t("chat.attach")}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onExercise}
          disabled={disabled}
          data-testid="exercise-btn"
        >
          <PencilLine /> <span className="hidden sm:inline">{t("chat.exercise")}</span>
        </Button>
        <span className="ms-auto hidden text-[11px] text-slate-deep sm:inline">
          {text.length > MAX_INPUT_CHARS * 0.8
            ? `${text.length}/${MAX_INPUT_CHARS}`
            : "Enter to send · Shift+Enter for a new line"}
        </span>
        <Button
          type="button"
          variant="mentor"
          size="sm"
          onClick={() => void submit()}
          disabled={!canSend}
          data-testid="send-btn"
        >
          <SendHorizonal className="rtl:-scale-x-100" /> {t("chat.send")}
        </Button>
      </div>
    </div>
  );
}
