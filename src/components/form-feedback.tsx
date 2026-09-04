"use client";

import type { ActionResult } from "@/lib/errors";

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

export function FormStatus<T>({
  state,
  successMessage,
}: {
  state: ActionResult<T> | null;
  successMessage: string;
}) {
  if (!state) return null;
  if (state.ok) {
    return <p className="text-sm text-green-700">{successMessage}</p>;
  }
  if (state.error.code === "VALIDATION") return null;
  return <p className="text-sm text-red-600">{state.error.message}</p>;
}
