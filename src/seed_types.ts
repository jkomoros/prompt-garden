import {
    z
} from "zod";

export const seedDataPrompt = z.object({
    type: z.literal('prompt'),
    prompt: z.string()
});

export type SeedDataPrompt = z.infer<typeof seedDataPrompt>;
