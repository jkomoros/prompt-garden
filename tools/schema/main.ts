import { zodToJsonSchema } from 'zod-to-json-schema';

import {
	seedPacket,
	seedData,
	seedReference,
	knownEnvironmentData
} from '../../src/types.js';

import {
	writeFileSync
} from 'fs';

const SEED_SCHEMA_FILE = 'seed-schema.json';
const CONFIG_SCHEMA_FILE = 'config-schema.json';

const writeSeed = () => {
	const schema = zodToJsonSchema(seedPacket, {
		definitions: {
			seedData,
			seedReference
		}
	});

	//Inject a default snippet so that when you start doing a seedData and hit tab it will fill in a default one.
	//This is a VSCode-specific extension of JSON Schema: https://code.visualstudio.com/docs/languages/json#_file-match-syntax

	if (!schema.definitions || !schema.definitions.seedData) throw new Error('Unexpected schema shape');

	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	const s = (schema.definitions.seedData as any);

	s.defaultSnippets = [
		{
			body: {
				t: '${1:noop}'
			}
		}
	];

	writeFileSync(SEED_SCHEMA_FILE, JSON.stringify(schema, null, '\t'));
};

const writeConfig = () => {
	const schema = zodToJsonSchema(knownEnvironmentData);
	writeFileSync(CONFIG_SCHEMA_FILE, JSON.stringify(schema, null, '\t'));
};

const main = () => {
	writeSeed();
	writeConfig();
};

(() => {
	main();
})();