"use client";

import { useActionState } from "react";
import { updateProfile } from "@/features/profile/actions";
import { FieldError, FormStatus } from "@/components/form-feedback";

export function ProfileForm({ initialDisplayName }: { initialDisplayName: string }) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium">
          表示名
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={initialDisplayName}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          maxLength={50}
          required
        />
        <FieldError errors={state?.ok === false ? state.error.fieldErrors?.display_name : undefined} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "保存中…" : "保存する"}
      </button>
      <FormStatus state={state} successMessage="プロフィールを保存しました" />
    </form>
  );
}
