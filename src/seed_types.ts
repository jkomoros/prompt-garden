import {
    z
} from "zod";

export const seedDataPrompt = z.object({
    type: z.literal('prompt'),
    prompt: z.string().describe('The full prompt to be passed to the configured commpletion_model')
});

export type SeedDataPrompt = z.infer<typeof seedDataPrompt>;

export const seedDataEcho = z.object({
    type: z.literal('echo'),
    message: z.string().describe('The message to echo back')
});

export type SeedDataEcho = z.infer<typeof seedDataEcho>;
