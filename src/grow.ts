import {
    SeedDataPrompt
} from './seed_types.js';

import {
    SeedData,
    Value,
    completionModelID
} from './types.js';

import {
    Environment
} from './environment.js';

import {
    assertUnreachable
} from './util.js';

const growPrompt = async (data : SeedDataPrompt, env : Environment) : Promise<Value> => {
    //TODO: actually run through the prompt

    //Throw if the completion model is not a valid value
    completionModelID.parse(env.getKnownKey('completion_model'));

    const api_key = env.getKnownKey('openai_api_key');
    if (!api_key) throw new Error ('Unset openai_api_key');

    return data.prompt;
}

export const grow = async (data : SeedData, env : Environment) : Promise<Value> => {
    switch (data.type) {
        case 'prompt':
            return growPrompt(data, env);
        default:
            return assertUnreachable(data.type);
    }
}