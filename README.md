# prompt-garden
A framework for gardening LLM prompts

There isn't much here right now. For more on what this might become, see DESIGN.md.

### Using

Copy `environment.SAMPLE.json` to `environment.SECRET.json` and update the `openai_api_key` to be your key.

Run the command `npm run serve` in a separate terminal to build.

Install the package `npm install -g .`

Run `prompt-garden`. You can pick a non-default seed to grow by running `prompt-garden --seed SEED_ID`

### Developing

Run `npm run serve`

### Known Environment Values

The environment can contain any number of values, but some are used for specific uses by the framework.

#### openai_api_key

The key to use to hit Openai's backends.

#### completion_model

Which type of completion_model to use for prompt. Currently the only legal value is `openai.com:gpt-3.5-turbo`.

#### mock

If true, then calls that would otherwise hit a remote LLM will instead return a local result.