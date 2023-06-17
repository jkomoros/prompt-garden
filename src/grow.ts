import {
    SeedDataPrompt
} from './seed_types.js';

import {
    SeedData,
    Value
} from './types.js';

import {
    Environment
} from './environment.js';

import {
    assertUnreachable
} from './util.js';

const growPrompt = (data : SeedDataPrompt, env : Environment) : Value => {
    //TODO: actually run through the prompt
    //TODO: check that env.completion_model and api_key are set
    return data.prompt;
}

export const grow = (data : SeedData, env : Environment) : Value => {
    switch (data.type) {
        case 'prompt':
            return growPrompt(data, env);
        default:
            return assertUnreachable(data.type);
    }
}