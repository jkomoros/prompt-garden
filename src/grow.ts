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

import {
    Configuration,
    OpenAIApi
} from 'openai';

const growPrompt = async (data : SeedDataPrompt, env : Environment) : Promise<Value> => {

    //Throw if the completion model is not a valid value
    const model = completionModelID.parse(env.getKnownKey('completion_model'));

    //TODO: have machinery to extract out the model name for the provider.
    //The modelName as far as openai is concerned is the second part of the identifier.
    const modelName = model.split(':')[1];

    const apiKey = env.getKnownStringKey('openai_api_key');
    if (!apiKey) throw new Error ('Unset openai_api_key');

    const mock = env.getKnownBooleanKey('mock');
    if (mock) {
        console.log('Mocking ' + data.prompt);
        return data.prompt;
    }

    const configuration = new Configuration({
        apiKey
    })

    const openai = new OpenAIApi(configuration);

    const result = await openai.createChatCompletion({
        model: modelName,
        messages: [
            {
                role: 'user',
                content: data.prompt
            }
        ]
        //TODO: allow passing other parameters
    })

    return result.data.choices[0].message?.content || '';
}

export const grow = async (data : SeedData, env : Environment) : Promise<Value> => {
    switch (data.type) {
        case 'prompt':
            return growPrompt(data, env);
        default:
            return assertUnreachable(data.type);
    }
}