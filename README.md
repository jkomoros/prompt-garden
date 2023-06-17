# prompt-garden
A framework for gardening LLM prompts

### Using

Copy `environment.SAMPLE.json` to `environment.SECRET.json` and update the `openai_api_key` to be your key.

Run the command with `npm run main`. This loads up the seeds in seeds/, then selects the one with the given ID, and then grow() s it.

### Developing

Run `npm run serve`