#!/usr/bin/env node

import {
	loadLocalGarden
} from '../util.js';

import {
	EnvironmentData,
	seedID
} from '../../src/types.js';

import {
	z
} from  'zod';

import {
	parse
} from 'ts-command-line-args';

import {
	exit
} from 'process';

const cliOptions = z.object({
	seed: z.optional(seedID),
	help: z.optional(z.boolean()),
	verbose: z.optional(z.boolean()),
	profile: z.optional(z.string())
});

type CLIOptions = z.infer<typeof cliOptions>;

const main = async (opts : CLIOptions) => {
	const overrides : EnvironmentData = {
		verbose: Boolean(opts.verbose)
	};
	if (opts.profile) {
		overrides['profile'] = opts.profile;
	}
	const garden = await loadLocalGarden(overrides);
	const seedID = opts.seed || '';
	//Select default seed
	const seed = await garden.seed(seedID);
	if (!seed) {
		console.error('Unknown seed "' + seedID + '"');
		exit(1);
	}
	const result = await seed.grow();
	console.log(result);
};

(async () => {

	const opts = parse<CLIOptions>({
		seed: {type: String, optional: true, description: 'The ID of the seed to grow. You may also a location: `relative/path.json#seed-id` or `https://path.com/location#seed-id`'},
		verbose: {type: Boolean, optional: true, alias: 'v', description: 'Turn on verbose logging of seed calculation'},
		help: {type: Boolean, optional: true, alias: 'h', description: 'Print this usage guide'},
		profile: {type: String, optional: true, alias: 'p', description: 'The profile to use if not default'}
	}, {
		headerContentSections: [{
			header: 'prompt-garden',
			content: 'Grows prompt seeds in a garden'
		}],
		helpArg: 'help'
	});

	await main(opts);
})();
