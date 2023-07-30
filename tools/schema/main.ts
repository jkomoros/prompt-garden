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