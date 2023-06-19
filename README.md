# prompt-garden
A framework for gardening LLM prompts

There isn't much here right now. For more on what this might become, see DESIGN.md.

### Using

Copy `environment.SAMPLE.json` to `environment.SECRET.json` and update the `openai_api_key` to be your key.

Run the command `npm run serve` in a separate terminal to build.

Install the package `npm install -g .`

Run `garden`. You can pick a non-default seed to grow by running `garden --seed SEED_ID`

### Seed Types

All parameters can accept a literal value or a reference to another seed's
result (`{ref: 'REFERENCE_ID'}`), unless otherwise noted.

Environment:
- `verbose` if true, then commands print information.

#### prompt

Generates an LLM completion based on a prompt

Required parameters:
- `prompt` - The full text to be passed directly to the prompt

Environment:
- `completion_model` - May only currently be `openai.com:gpt-3.5-turbo`
- `openai_api_key` - The key to pass to the openai endpoint if completion_model is an openai endpoint.
- `mock` - If truthy, then instead of hitting the production endpoint, will echo back the prompt with a mock prefix.

#### log

Logs the given message to console and returns it. This 'noop' seed is useful for testing the machinery that calcualtes sub-seeds.

Required parameters:
- `message` - The message to echo back.

Environment:
- `mock` - If true, then skips logging to console and just returns it.

### Known Environment Values

The environment can contain any number of values, but some are used for specific uses by the framework.

#### openai_api_key

The key to use to hit Openai's backends.

#### completion_model

Which type of completion_model to use for prompt. Currently the only legal value is `openai.com:gpt-3.5-turbo`.

#### mock

If true, then calls that would otherwise hit a remote LLM will instead return a local result.

### Developing

Run `npm run serve`

Every time the schema of any seeds or SeedPackets has been changed, re-run `npm run generate:schema` and check in the updated `seed-schema.json`.