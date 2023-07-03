# prompt-garden
A framework for gardening LLM prompts

There isn't much here right now. For more on what this might become, see DESIGN.md.

### Using

Copy `environment.SAMPLE.json` to `environment.SECRET.json` and update the `openai_api_key` to be your key.

Run the command `npm run build`.

Install the package `npm install -g .` . This makes it available as `garden` instead of `node tools/garden/main.js`.

Run `garden`. You can pick a non-default seed to grow by running `garden --seed SEED_ID`

### Making your own seed packet

You can make your own seeds to execute by making a new seed packet.

Create a new file in `seeds/file.json` (you can name it whatever you want as long as it ends in `.json`). Start the file with the following contents:

You can also execute remote seeds from the command line: `garden --seed https://raw.githubusercontent.com/jkomoros/prompt-garden/main/seeds/example.json#hello-world`

```
{
    "version": 0,
    "seeds": {
        "foo": {
            "type": "log",
            "value": "Hello, world"
        }
    }
}
```

Now you can execute this seed with `garden --seed foo`.

From here you can add more seeds to your packet. If you use VSCode it will alert you to illegal structure in your file and help with autocompletion.

### Seed Types

All parameters can accept a literal value or a reference to another seed's
result (`{packet: 'seed_packet_file.json', id: 'REFERENCE_ID'}`), unless otherwise noted.

The packet can be any of:
- An absolute https:// or http:// file
- A filepath relative to where the command is run from (in non-browser mode)
- A relative path to the original (e.g. '../b/file.json')

Each value can also be an inline, nested seed definition for convenience. When
the SeedPacket is parsed, the nested seeds will be 'unrolled'. For example, given this:

```
{
    version: 0,
    seeds: {
        'foo' : {
            type: 'log',
            value: {
                type: 'log',
                value: true
            }
        }
    }
}
```

It will unroll to this:

```
{
    version: 0,
    seeds: {
        'foo' : {
            type: 'log',
            value: {
                id: 'foo-value'
            }
        },
        'foo-value': {
            type: 'log',
            value: true
        }
    }
}
```

If you want control over the un-rolled ID, you can provide an explicit id on the
nested seedData:

```
{
    version: 0,
    seeds: {
        'foo' : {
            type: 'log',
            value: {
                id: 'bar'
                type: 'log',
                value: true
            }
        }
    }
}
```

Yields

```
{
    version: 0,
    seeds: {
        'foo' : {
            type: 'log',
            value: {
                id: 'bar'
            }
        },
        'bar': {
            id: 'bar'
            type: 'log',
            value: true
        }
    }
}
```


Environment:
- `verbose` if true, then commands print information.

You can use an Embedding any place a string is expected and it will use embedding.text automatically.

#### prompt

Generates an LLM completion based on a prompt

Required parameters:
- `prompt` - The full text to be passed directly to the prompt

Environment:
- `completion_model` - May only currently be `openai.com:gpt-3.5-turbo`
- `openai_api_key` - The key to pass to the openai endpoint if completion_model is an openai endpoint.
- `mock` - If truthy, then instead of hitting the production endpoint, will echo back the prompt with a mock prefix.

#### embed

Generates an `Embedding` for a given bit of text

Required parameters:
- `embed` - The full text to be passed directly to be embedded

Environment:
- `embedding_model` - May only currently be `openai.com:text-embedding-ada-002`
- `openai_api_key` - The key to pass to the openai endpoint if embedding_model is an openai endpoint.
- `mock` - If truthy, then instead of hitting the production endpoint, will pass back a random embedding vector.

#### memorize

Stores `value` in the memory, so it can in the future be recalled by `recall`.

Required parameters:
- `value` - The value to store. It may be a pre-computed embedding or a string, in which case it will be first converted to an embedding, operating the same as how the `embedding` seed does. If value is an array of text or embeddings, it will add each to the memory.
- `memory` - (optional) The name of the memory storage to use. If not provided, deafults to `environment.memory`

Environment:
- `memory` - The name of the memory to use when retrieving, unless `memory` is set on the seed.
- *See also environment variables for `embedding`, which are used if value is text not yet an embedding*

#### recall

Retrieves `k` memories from memory (which were put there previously by `memorize`) that are most similar to `query`. 

Required parameters:
- `query` - The value to use as the query point. It may be a pre-computed embedding or a string, in which case it will be first converted to an embedding, operating the same as how the `embedding` seed does.
- `k` - (optional) The number of similar items to retrieve. The result will have a lenght of up to k. If not provided, defaults to 1.
- `memory` - (optional) The name of the memory storage to use. If not provided, deafults to `environment.memory`

Environment:
- `memory` - The name of the memory to use when retrieving, unless `memory` is set on the seed.
- *See also environment variables for `embedding`, which are used if value is text not yet an embedding*

#### token_count

Returns the integer count of tokens in `text`.

Required parameters:
- `text` - The text to count the tokens in. May be a string or an embedding, or an array of strings or embeddings.

Environment:
- `embedding_model` - May only currently be `openai.com:text-embedding-ada-002`

#### log

Logs the given message to console and returns it. This 'noop' seed is useful for testing the machinery that calcualtes sub-seeds.

Required parameters:
- `value` - The value to echo back.

Environment:
- `mock` - If true, then skips logging to console and just returns it.

#### if

Checks the test condition and if truthy, returns the sub-seed's value of then, otherwise else.

Required parameters:
- `test` - The condition to test
- `then` - The value to return if test is truthy
- `else` - The value to return if test is falsy

#### render

Returns a new string like template, but with any instance of `{{var}}` replaced by the named variable. See the `Templates` section below for more on the format of templates.

Required parameters:
- `template` - The template string
- `vars` - The map of name -> value to use in the template. If any vars that are used in the template are missing there will be an error. If some sub-seeds need to be computed, nest a sub-seed of type `object`.

#### extract

Given an input string, extract a map of values based on a template. See the `Templates` section below for more on the format of templates.

Required parameters:
- `template` - The template string
- `input` - The string to match against the template.

#### input

Asks for input from the user.

Parameters:
- `question` - the question to ask the user
- `default` - (optional) The value to provide by default (defaults to '')

#### property

Selects a named property from an object

Required parameters:
- `object` - The object to select a property from. If some of the sub-keys need to be computed, nest a sub-seed of type `object`.
- `property` - The property to select from the object.

#### object

Returns an object where some values may be sub-seeds that need to be computed.

Required parameters:
- `properties` - An object with keys for each key to return. The values may be LeafValue or a SeedReference / SubSeed.

#### array

Returns an array where some values may be sub-seeds that need to be computed.

Required parameters:
- `array` - An array of values. The values may be LeafValue or a SeedReference / SubSeed.

#### var

Returns a variable from environment. See also `let`.

Required parameters:
- `name` - A named variable in environment to get.

#### let

Sets a named variable in environment to value for sub-expressions in block. It returns the return value of block. See also `var`.

Note that this doesn't change the environment globally, but only for the context of calculating the seeds nested beneath `block`.

Required parameters:
- `name` - A named variable in environment to set.
- `value` - The value to set the variable to.
- `block` - The sub-seed that will be evaluated where the environment will have `name=value`.

#### ==

Returns true if a and b are `==`, false otherwise.

Required parameters:
- `a` - The left hand side to compare
- `b` - The right hand side to compare

#### !=

Returns true if a and b are `!=`, false otherwise.

Required parameters:
- `a` - The left hand side to compare
- `b` - The right hand side to compare

#### <

Returns true if a and b are `<`, false otherwise.

Required parameters:
- `a` - The left hand side to compare
- `b` - The right hand side to compare

#### >

Returns true if a and b are `>`, false otherwise.

Required parameters:
- `a` - The left hand side to compare
- `b` - The right hand side to compare

#### <=

Returns true if a and b are `<=`, false otherwise.

Required parameters:
- `a` - The left hand side to compare
- `b` - The right hand side to compare

#### >

Returns true if a and b are `>=`, false otherwise.

Required parameters:
- `a` - The left hand side to compare
- `b` - The right hand side to compare

#### !

Returns the negation of a

Required parameters:
- `a` - The value to negate

### Templates

The `render` seed_type takes a template string and some variables and renders a new string.

A simple template looks like this: `{{ name }} is {{age}}`, when rendered with
the variables `{name: "Alex", age: 25}` will give `Alex is 25`.

When you render a template, extra variables provided will be ignored. If the
template string references a variable that isn't provided then an error will be
thrown.

Template names can also have modifiers: `My name is {{name|default:'Alex'}}` would mean that if the var `name` is not provided, it will return `Alex`. Some modifiers expect arguments and some don't. If it expects a string argument, it should be wrapped in either `'` or `"`. You can chain multiple, e.g. `{{name|default:'Alex'|optional}}`.

Modifiers:
- `default:'value'` - if the var isn't provided, it will use the provided value. Must always be provided as a string value. It will be coerced into a different type if one of the type modifiers is used.
- `optional` (expects no arguments) - for template.extract, the pattern doesn't need to exist. If it doesn't, it will return the default value or skip the key if no default has been configured. Ignored for template.render().
- `int` (expects no arguments) - template.extract() and template.defaults() will convert the value into an int before returning. No other type converters should be specified.
- `float` (expects no arguments) - template.extract() and template.defaults() will convert the value into a float before returning. No other type converters should be specified.
- `boolean` (expects no arguments) - template.extract() and template.defaults() will convert the value into a boolean before returning. It will also match fuzzy strings like 'true' or 'yes' or 'y'. No other type converters should be specified.

### Known Environment Values

The environment can contain any number of values, but some are used for specific uses by the framework.

#### openai_api_key

The key to use to hit Openai's backends.

#### completion_model

Which type of completion_model to use for prompt. Currently the only legal value is `openai.com:gpt-3.5-turbo`.

#### embedding_model

Which type of embedding_model to use for embed. Currently the only legal value is `openai.com:text-embedding-ada-002`.

#### memory

The ID of the memory to use for `recall` and `memorize` seeds. A different memory is like a new slate.

#### profile

Which named profile to use. Profiles will be stored in `.profiles/${NAME}`.

#### mock

If true, then calls that would otherwise hit a remote LLM will instead return a local result.

### Developing

Run `npm run serve`

Every time the schema of any seeds or SeedPackets has been changed, re-run `npm run generate:schema` and check in the updated `seed-schema.json`.