import {
    Environment,
    SeedData,
    Value
} from './types.js';

import {
    assertUnreachable
} from './util.js';

export const grow = (data : SeedData, env : Environment) : Value => {
    switch (data.type) {
        case 'prompt':
            //TODO: actually run through the prompt
            return 'prompt';
        default:
            return assertUnreachable(data.type);
    }
}