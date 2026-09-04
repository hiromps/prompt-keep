"use client";

import { useState, useTransition } from "react";
import { updateNote, deleteNote } from "@/features/notes/actions";
import { FieldError } from "@/components/form-feedback";
import type { Note } from "@/features/notes/queries";
import type { ActionError } from "@/lib/errors";

/**
 * ノート1件の表示・編集・削除。
 * Server Action をクライアント側から直接 await し、結果をローカル状態で管理する。
 * （成功時に閉じる・エラー表示・再オープン時のリセットを1箇所で制御するため）
 */
export function NoteItem({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false);
  const [updateError, setUpdateError] = useState<ActionError | null>(null);
  const [deleteError, setDeleteError] = useState<ActionError | null>(null);
  const [isUpdating, startUpdate] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const openEdit = () => {
    setUpdateError(null); // 前回のエラーを持ち越さない
    setEditing(true);
  };

  const handleUpdate = (formData: FormData) => {
    startUpdate(async () => {
      const result = await updateNote(null, formData);
      if (result.ok) {
        setEditing(false);
        setUpdateError(null);
      } else {
        setUpdateError(result.error);
      }
    });
  };

  const handleDelete = (formData: FormData) => {
    startDelete(async () => {
      const result = await deleteNote(null, formData);
      if (!result.ok) setDeleteError(result.error);
    });
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-zinc-200 p-4">
        <form action={handleUpdate} className="space-y-3">
          <input type="hidden" name="id" value={note.id} />
          <div>
            <input
              name="title"
              type="text"
              defaultValue={note.title}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              maxLength={100}
              required
            />
            <FieldError errors={updateError?.fieldErrors?.title} />
          </div>
          <div>
            <textarea
              name="content"
              defaultValue={note.content}
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              maxLength={2000}
            />
            <FieldError errors={updateError?.fieldErrors?.content} />
          </div>
          {updateError && updateError.code !== "VALIDATION" ? (
            <p role="alert" className="text-sm text-red-600">
              {updateError.message}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isUpdating ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isUpdating}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{note.title}</h3>
          {note.content ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{note.content}</p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-400">
            更新: {new Date(note.updated_at).toLocaleString("ja-JP")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={openEdit}
            disabled={isDeleting}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            編集
          </button>
          <form action={handleDelete}>
            <input type="hidden" name="id" value={note.id} />
            <button
              type="submit"
              disabled={isDeleting}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
            >
              {isDeleting ? "削除中…" : "削除"}
            </button>
          </form>
        </div>
      </div>
      {deleteError ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {deleteError.message}
        </p>
      ) : null}
    </li>
  );
}
