#!/usr/bin/env node

import {
    loadLocalGarden
} from './util.js';

import {
    localSeedID
} from '../src/types.js';

import {
    z
} from  'zod';

import {
    parse
} from 'ts-command-line-args';

const cliOptions = z.object({
    seed: z.optional(localSeedID),
    help: z.optional(z.boolean())
});

type CLIOptions = z.infer<typeof cliOptions>;

const main = async (opts : CLIOptions) => {
    const garden = await loadLocalGarden();
    //Select default seed
    const seed = garden.seed(opts.seed || '');
    const result = await seed.grow();
    console.log(result);
};

(async () => {

    const opts = parse<CLIOptions>({
        seed: {type: String, optional: true, description: 'The ID of the seed to grow'},
        help: {type: Boolean, optional: true, alias: 'h', description: 'Print this usage guide'}
    }, {
        headerContentSections: [{
            header: 'prompt-garden',
            content: 'Grows prompt seeds in a garden'
        }],
        helpArg: 'help'
    });

    await main(opts)
})();
