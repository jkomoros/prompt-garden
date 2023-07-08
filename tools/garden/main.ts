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

import inquirer from 'inquirer';
import { packSeedReference } from '../../src/reference.js';

const cliOptions = z.object({
	seed: z.optional(seedID),
	help: z.optional(z.boolean()),
	mock: z.optional(z.boolean()),
	verbose: z.optional(z.boolean()),
	profile: z.optional(z.string())
});

type CLIOptions = z.infer<typeof cliOptions>;

const main = async (opts : CLIOptions) => {
	const overrides : EnvironmentData = {
		verbose: Boolean(opts.verbose),
		mock: Boolean(opts.mock)
	};
	if (opts.profile) {
		overrides['profile'] = opts.profile;
	}
	const garden = await loadLocalGarden(overrides);
	const seedID = opts.seed || '';
	const options = garden.optionsForID(seedID);
	if (options.length == 0) {
		throw new Error(`Unknown seed: ${seedID}`);
	}
	let seedRef = options[0];
	if (options.length > 1) {
		const answers = await inquirer.prompt([{
			name: 'question',
			type: 'list',
			choices: options.map(option => ({
				name: packSeedReference(option),
				value: option
			})),
			message: `There are multiple seeds with ID ${seedID}. Which one do you want to use?`,
			default: options[0]
		}]);
		seedRef = answers.question;
	}
	//Select default seed
	const seed = await garden.seed(seedRef);
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
		mock: {type: Boolean, optional: true, alias: 'm', description: 'Whether to mock results, e.g. by not calling production LLM APIs'},
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
