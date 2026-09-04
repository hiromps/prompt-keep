import { z } from "zod";

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  content: z.string().max(2000, "本文は2000文字以内で入力してください").default(""),
});

export const updateNoteSchema = createNoteSchema.extend({
  id: z.uuid("ノートIDが不正です"),
});

export const deleteNoteSchema = z.object({
  id: z.uuid("ノートIDが不正です"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
