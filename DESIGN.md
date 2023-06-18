## The Need

Prompts are kind of like programming, but more like tinkering. Figuring out how to make resilient prompts that do what you want requires a lot of trial and error.

LLMs do better with "small" prompts that break up the task into smaller, more straightforward tasks. That's the intuition behind the "chain of thought" techniques and "tree of thought".

What this means is that coming up with a resilient approach to a problem will be more like growing a garden of inter-related prompts, working together--putting resources into plants that are the most promising.

We need something like a git for prompts. But we also want something that allows people to mix and match and mashup the best ideas from others. You can think of this as gardening prompts.

Another design goal is a system that can be described fully declaratively, so that (modulo privacy / data-leakage concerns) they can be run speculatively and in novel, auto-assembling combinations. For example, you can imagine a set of prompts that can be run alongside other prompts to automatically figure out how to make the more resilient, or make them work for other LLMs, etc.

## The Design

The fundamental design is a framework that knows how to take declaratively-defined seeds, which might be a handful of pre-defined types, and execute them to produce a result.

The framework is implemented in Typescript and can be run in a browser or in other contexts, like a CLI.

There are a couple dozen `Seed Types`. These are the base building blocks that everything else is built out of. For example, one type is `prompt`, which takes a prompt string and then gets a completion result from an LLM. Another one is `extract`, which takes a string in a certain pattern and extracts out information. Another type is a simple `if` branch. You can see a list below under "Seed Types"'. All computations in the graph must be using these seed types; they are the fundamental language everything else is expressed in. The engine primarily knows how to take a graph of seeds and execute them based on their seed type.

The core configuration is a `Seed`. The seed is a declarative configuration of a specific seed type, providing the parameters and configuration to be executed. When a seed is executed by the engine, it is "grown" into a `Plant`, which is an instantiated version of a Seed, and includes things like who grew it, when, what the result was, etc.

Seeds will typically reference other seeds as sub-seeds; when a top-level seed is grown(), it will lazily fetch and execute the sub-seeds, using the results of them to pass in as input to their own parameters.

Seeds are stored and transmitted in `Seed Packets`. These are a simple JSON blob containing a number of defined Seeds. They might live on your local filesystem or at an HTTP endpoint. Seeds within a packet can reference other seeds just by their local name in that seed packet. In the future seed packets will have little bits of sugar to allow not a flat map of seed ID to seed definition but allow nesting.

When a seed needs to reference another seed, it uses a `Seed Reference`. This is a way to unambiguously specify another Seed, possibly in another packet. A seed reference looks like this: `${packetLocation}#${seedID}@${version}`. For example, a seed reference might look like `https://komoroske.com/seeds/komoroske#cards-summary@2`. The packetLocation can be either an absolute HTTPS endpoint, or a relative endpoint to the location of seed packet it is being referenced within. For example `../glazkov#clever-title@latest` might effectively resolve to `https://komoroske.com/seeds/glazkov#clever-title@latest` if referenced within a seed packet above. The root seed packet is often a URL, but can also be a local file path if running in CLI mode. If the packetLocation is omitted in a seed reference, it means "within the seed packet I am in". The seedID is an ID that is unique within the seedPacket selected, and must always exist in any seed refernce. The version number allows selecting a specific pinned older version of the seed. It may be a version number or `latest`, which means "the most recent version of the seed with this ID". If the `@version` is omitted, it defaults to `@latest`. In practice most seed references will just look like `#clever-title`. The default seed in a packet--the main entrypoint if one isn't defined, is by convention the empty-named seed: "".

A `Garden` is the live instantiation of your plants. You create a garden, pass in environment configuration, plant seeds into the garden, then select a seed to grow. Each time the seed you're growing comes across a Seed Reference, it checks to the garden to see if it a matching seed is already planted; if so it uses that. If not, it attempts to fetch and plant the seed packet at its location.

A garden has an `environment`, which consists of configuration parameters, like which completion model to use by default, and API keys for the various LLM providers. It is also possible for seeds to store more values in the configuration, whicih will then be passed into sub-seeds in the calculation, as a way to pass additional freeform state and change the behavior of sub-components.

A Sequence is an iterator that yields items. It's the return value for things like `remember`, which needs to fetch memories from a possibly large set that is remote, and might need to fetch items in batches.

An embedding is an object that includes the fingerprint (the list of floats in the given embedding space), an embedding_model ID, and sometimes the original embedded text.

Seeds are somewaht fixed, and can be grown by different users in their own gardens. A garden keeps track of the runs of different seeds, their results, etc.

Memory is handled using two types of systems: associative and direct. Associative is content-addressed and indexed based on an embedding of the content. direct is a simple key-value store, and is typically implemented in something like localStorage.

There are many types of backends that you might plug in for associative memory; the library helps present a unified interface to a number of real-world backends. Configuring where your memory store is is done in your paramters; the same user with a different memory story growing the same seed would likely have very different results, based on what was in their memory store.

Some associative memory stores are read-only, and some are read-write. It's possible to spin up a new memory store. Typically users will have a read-only utterances, representing thoughts of theirs they have written somewhere, e.g. their blog. Another typically type is the read-write scratchpad memory, where intermediate computations and ideas might be stored, with a new one spun up every so often for diffeerent tasks.

## Manifestations of the library

The main way to use the framework to start will be in local, CLI mode. However in the future we'll add a web app version that provides state management and storage. You can also imagine a multi-user web app version to make it easy for gardeners to get going quickly and have a natural place to convene, possibly proprietary.

## Seed Types

The pre-defined seed types are the actual building blocks of all interesting plants. They consist of a number of seed-types that do small bits of tasks in generic, low-level ways.

### prompt

Takes a fully-specified prompt text and passes to a LLM to get a completion.

- `prompt` - (required) the fully-rendered text of the prompt

Environment:
- `completion_model` to specify the LLM to use, defaulting to `openai.com:gpt-3.5-turbo` if none is specified.
- `openai_api_key` is used if an openai.com completion_model is selected.

### input

Asks a user for free-form input via a UI prompt.

`TODO: document parameters`
`TODO: allow multiple-choice options`

### count

Given a string of text, counts how many tokens would be consumed, for the given `completion_model`.

`TODO: document parameters`

### extract

Extracts from a blob of text information according to a structure.

`TODO: document parameters`

### if

Checks the test condition, and if it's truth-y, executes and returns then `then` sub-seed, otherwise the `else` sub-seed.

`TODO: document parameters`

### expand

Given a pattern string and named variables, expands the text into a fully-rendered string

`TODO: document parameters`

### compose

Takes a prefix, a sequence of items, a suffix, and a max token length, and returns a string that includes the prefix, as many items as fit without exceeding the max-token-length, and the suffix.

`TODO: document parameters`

### associate

Takes an embedding and optionally a specific associate memory endpoint and fetches a Sequence of the most-semantically related items. You can give a hint of how many to fetch at once.

`TODO: document parameters`

### remember

Given a string, calculates the embedding and stores it in the given associative store, to be retrieved later by associate.

`TODO: document parameters`

### embed

Given a string of text, returns an embedding of it.

`TODO: document parameters`

### persist

Given a fact and an explicit name, remember this. Like associative memory, but instead of being fetched based on content, it's fetched based on a specific name, e.g. a localStorage.

`TODO: document parameters`
`TODO: should this just use environment?`

### fetch

Fetches a named variable previously stored with persist.

`TODO: document parameters`

### random

Returns a random number between some range, based on some seed.

`TODO: document parameters`

### choice

Returns the item of a given index out of a sequence.

`TODO: document parameters`


## Themes / ideas to work in
- [ ] Upgrading seed packets in an old format (necessary for federation)
- [ ] A way to do access control
- [ ] Parameterized meta seeds