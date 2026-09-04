export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
        role="status"
        aria-label="読み込み中"
      />
    </div>
  );
}
