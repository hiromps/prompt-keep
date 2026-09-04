import { requirePageUser } from "@/auth/guards";
import { listNotesByOwner } from "@/features/notes/queries";
import { NoteForm } from "@/features/notes/components/note-form";
import { NoteItem } from "@/features/notes/components/note-item";

export const metadata = { title: "ダッシュボード" };

/**
 * 保護されたダッシュボード（サンプルB）。
 * 自分のノートのみ表示・操作できる（所有権はサーバー側で検証）。
 */
export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");
  const notes = await listNotesByOwner(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {user.name ?? user.email ?? "ユーザー"} さんのノート（{notes.length}件）
      </p>
      <div className="mt-6">
        <NoteForm />
      </div>
      <ul className="mt-6 space-y-3">
        {notes.map((note) => (
          <NoteItem key={note.id} note={note} />
        ))}
        {notes.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            まだノートがありません。上のフォームから作成してください。
          </li>
        ) : null}
      </ul>
    </div>
  );
}
