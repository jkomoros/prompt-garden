#!/usr/bin/env node

import {
	loadLocalGarden
} from '../util.js';

import {
	EnvironmentData,
	SeedID,
	seedID
} from '../../src/types.js';

import {
	packSeedReference
} from '../../src/reference.js';

import {
	z
} from  'zod';

import {
	parse
} from 'ts-command-line-args';

import {
	exit
} from 'process';

import fs from 'fs';

import inquirer from 'inquirer';
import { Garden } from '../../src/garden.js';

const cliOptions = z.object({
	all: z.optional(z.boolean()),
	seed: z.optional(seedID),
	help: z.optional(z.boolean()),
	mock: z.optional(z.boolean()),
	diagram: z.optional(z.boolean()),
	packet: z.optional(z.array(z.string())),
	output: z.optional(z.string()),
	warn: z.optional(z.boolean()),
	verbose: z.optional(z.boolean()),
	profile: z.optional(z.string())
});

type CLIOptions = z.infer<typeof cliOptions>;

const growSeed = async (garden : Garden, seedID : SeedID) : Promise<void> => {
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
		throw new Error(`Unknown seed "${seedID}"`);
	}
	const result = await seed.grow();
	console.log(result);
};

const main = async (opts : CLIOptions) => {
	const overrides : EnvironmentData = {
		verbose: Boolean(opts.verbose),
		mock: Boolean(opts.mock)
	};
	if (opts.profile) {
		overrides['profile'] = opts.profile;
	}
	const [garden, warnings] = await loadLocalGarden(overrides, opts.packet);
	if (warnings && opts.warn) {
		for (const warning of warnings){
			console.log('Warning:' + warning);
		}
	}
	if (opts.diagram) {
		//We don't filter down to specific packets because we already did at loading time.
		const diagram =garden.diagram(opts.all);
		if (opts.output) {
			const output = `\`\`\`mermaid
${diagram}
\`\`\``;
			fs.writeFileSync(opts.output, output);
			console.log(`Wrote diagram markdown to ${opts.output}`);
		} else {
			console.log(diagram);
		}
		exit(0);
	}
	const seedID = opts.seed;
	if (!seedID) {
		//We don't have a seed ID, print results instead.
		const packets = garden.seedsByPacket(opts.all);
		for (const [packet, seeds] of Object.entries(packets)) {
			console.log(`Packet: ${packet}`);
			for (const seed of seeds) {
				console.log(`\t${seed.private ? '  ' : '* '}${seed.id || '\'\''}${seed.description ? ' - ' + seed.description : ''}`);
			}
		}
		exit(0);
	}
	await growSeed(garden, seedID || '');
};

(async () => {

	const opts = parse<CLIOptions>({
		seed: {type: String, optional: true, description: 'The ID of the seed to grow. You may also a location: `relative/path.json#seed-id` or `https://path.com/location#seed-id`'},
		verbose: {type: Boolean, optional: true, alias: 'v', description: 'Turn on verbose logging of seed calculation'},
		mock: {type: Boolean, optional: true, alias: 'm', description: 'Whether to mock results, e.g. by not calling production LLM APIs'},
		warn: {type: Boolean, optional: true, alias: 'w', description: 'Prints warnings about seed packets'},
		packet: {type: String, multiple: true, optional: true, alias: 'p', description: 'If provided, will operate only over the given packet(s). If none a provided, will load all packets in seeds/'},
		all: {type: Boolean, optional: true, alias: 'a', description: 'Include even private seeds'},
		diagram: {type: Boolean, optional: true, description: 'Print out a mermaid diagram for garden and quit'},
		output: {type: String, optional: true, description: 'Which file to put output in, for example for diagram. If not provided, commands that have output will print to console and exit'},
		help: {type: Boolean, optional: true, alias: 'h', description: 'Print this usage guide'},
		profile: {type: String, optional: true, description: 'The profile to use if not default'}
	}, {
		headerContentSections: [{
			header: 'prompt-garden',
			content: 'Grows prompt seeds in a garden'
		}],
		helpArg: 'help'
	});

	await main(opts);
})();
