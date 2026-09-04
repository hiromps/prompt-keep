"use client";

import { useActionState, useEffect, useRef } from "react";
import { createNote } from "@/features/notes/actions";
import { FieldError, FormStatus } from "@/components/form-feedback";

export function NoteForm() {
  const [state, formAction, isPending] = useActionState(createNote, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-sm font-semibold">新しいノート</h2>
      <div>
        <input
          name="title"
          type="text"
          placeholder="タイトル"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          maxLength={100}
          required
        />
        <FieldError errors={state?.ok === false ? state.error.fieldErrors?.title : undefined} />
      </div>
      <div>
        <textarea
          name="content"
          placeholder="本文（任意）"
          rows={3}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          maxLength={2000}
        />
        <FieldError errors={state?.ok === false ? state.error.fieldErrors?.content : undefined} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "作成中…" : "作成する"}
      </button>
      <FormStatus state={state} successMessage="ノートを作成しました" />
    </form>
  );
}
