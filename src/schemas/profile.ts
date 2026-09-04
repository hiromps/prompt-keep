import { z } from "zod";

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "表示名を入力してください")
    .max(50, "表示名は50文字以内で入力してください"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
