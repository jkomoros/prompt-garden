import {
    SeedData,
    SeedDataEcho,
    SeedDataPrompt,
    SeedReference,
    Value,
    completionModelID
} from './types.js';

import {
    assertUnreachable,
    mockedResult
} from './util.js';

import {
    Configuration,
    OpenAIApi
} from 'openai';

import {
    Garden
} from './garden.js';

const growSubSeed = async (ref : SeedReference, garden : Garden) : Promise<Value> => {
    const seed = garden.seed(ref.ref);
    return seed.grow();
};

const growPrompt = async (data : SeedDataPrompt, garden : Garden) : Promise<Value> => {

    const env = garden.environment;

    //Throw if the completion model is not a valid value
    const model = completionModelID.parse(env.getKnownKey('completion_model'));

    //TODO: have machinery to extract out the model name for the provider.
    //The modelName as far as openai is concerned is the second part of the identifier.
    const modelName = model.split(':')[1];

    const apiKey = env.getKnownStringKey('openai_api_key');
    if (!apiKey) throw new Error ('Unset openai_api_key');

    const prompt = typeof data.prompt == 'string' ? data.prompt : String(await growSubSeed(data.prompt, garden));

    const mock = env.getKnownBooleanKey('mock');
    if (mock) {
        return mockedResult(prompt);
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
                content: prompt
            }
        ]
        //TODO: allow passing other parameters
    })

    return result.data.choices[0].message?.content || '';
}

const growLog = async (data : SeedDataEcho, garden : Garden) : Promise<string> => {
    const message = typeof data.message == 'string' ? data.message : String(await growSubSeed(data.message, garden));
    const env = garden.environment;
    const mock = env.getKnownBooleanKey('mock');
    if (!mock) {
        console.log(message);
    }
    return message;
}

export const grow = async (data : SeedData, garden : Garden) : Promise<Value> => {
    const typ = data.type;
    switch (typ) {
        case 'prompt':
            return growPrompt(data, garden);
        case 'log':
            return growLog(data, garden);
        default:
            return assertUnreachable(typ);
    }
}