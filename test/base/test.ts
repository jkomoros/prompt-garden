/*eslint-env node*/
import {
	Garden
} from '../../src/garden.js';

import {
	EnvironmentData,
	localSeedID,
	seedPacket,
	seedPacketLocation,
	seedReferenceID
} from '../../src/types.js';

import {
	mockedResult
} from '../../src/util.js';

import assert from 'assert';

import {
	readFileSync,
	readdirSync
} from 'fs';

import * as path from 'path';

const TEST_PACKETS_LOCATION = 'test/base/';

const loadTestGarden = () : Garden => {
	const env : Required<EnvironmentData> = {
		completion_model: 'openai.com:gpt-3.5-turbo',
		openai_api_key: 'mock_key',
		mock: true,
		verbose: false
	};
	const garden = new Garden(env);
	for (const file of readdirSync(TEST_PACKETS_LOCATION)) {
		if (path.extname(file) != '.json') continue;
		const filename = path.join(TEST_PACKETS_LOCATION, file);
		const data = readFileSync(filename).toString();
		const json = JSON.parse(data);
		const packet = seedPacket.parse(json);
		garden.plantSeedPacket(filename, packet);
	}
	return garden;
};

describe('Garden smoke test', () => {
	it('basic running', async () => {
		const garden = new Garden({});
		assert.notEqual(garden, undefined);
	});

	it('handles loading default garden', async () => {
		const garden = loadTestGarden();
		assert.notEqual(garden, undefined);
	});

	it('prompt respects mock parameter', async () => {
		const garden = loadTestGarden();
		const seed = garden.seed();
		//Checking type and throwing narrows type
		if (seed.data.type != 'prompt') throw new Error('Unexpected type');
		const result = await seed.grow();
		if (typeof seed.data.prompt != 'string') throw new Error('Expected a direct string');
		const golden = mockedResult(seed.data.prompt);
		assert.deepEqual(result, golden);
	});

	it('handles echo', async () => {
		const garden = loadTestGarden();
		const seed = garden.seed('hello-world');
		//Checking type and throwing narrows type
		if (seed.data.type != 'log') throw new Error('Unexpected type');
		const result = await seed.grow();
		const golden = 'Hello, world!';
		assert.deepEqual(result, golden);
	});

	it('throws for unknown seed', async () => {
		const garden = loadTestGarden();
		assert.throws(() => {
			garden.seed('unknown-123');
		});
	});

	it('handles a nested seed', async () => {
		const garden = loadTestGarden();
		const seed = garden.seed('composed-prompt');
		const hellowWorldSeed = garden.seed('hello-world');
		if (hellowWorldSeed.data.type != 'log') throw new Error('Unexpected type');
		if (typeof hellowWorldSeed.data.value != 'string') throw new Error('Expected a non-computed message');
		const result = await seed.grow();
		const golden = mockedResult(hellowWorldSeed.data.value);
		assert.deepEqual(result, golden);
	});

	it('handles an if that is true', async () => {
		const garden = loadTestGarden();
		const seed = garden.seed('if-true');
		const result = await seed.grow();
		const golden = true;
		assert.deepEqual(result, golden);
	});

	it('handles an if that is false', async () => {
		const garden = loadTestGarden();
		const seed = garden.seed('if-false');
		const result = await seed.grow();
		const golden = false;
		assert.deepEqual(result, golden);
	});

	it('handles a seed from another file', async() => {
		const garden = loadTestGarden();
		const seed = garden.seed('test/base/b_test.json#');
		const result = await seed.grow();
		const golden = 'test-other hello world';
		assert.deepStrictEqual(result, golden);
	});

});


describe('reference regexp tests', () => {
	it('basic local seed reference empty', async() => {
		assert.doesNotThrow(() => {
			localSeedID.parse('');
		});
	});

	it('basic local seed reference', async() => {
		assert.doesNotThrow(() => {
			localSeedID.parse('abc-123');
		});
	});

	it('basic local seed illegal reference', async() => {
		assert.throws(() => {
			localSeedID.parse('abc.123');
		});
	});

	it('basic local seed illegal reference with #', async() => {
		assert.throws(() => {
			//a # is allowed in a seedReferenceID but not a localSeedID
			localSeedID.parse('#abc');
		});
	});

	it('basic seed location reference empty', async() => {
		assert.throws(() => {
			seedPacketLocation.parse('');
		});
	});

	it('basic seed location naked dot', async() => {
		assert.throws(() => {
			seedPacketLocation.parse('.');
		});
	});

	it('basic seed location dot', async() => {
		assert.doesNotThrow(() => {
			seedPacketLocation.parse('./a');
		});
	});

	it('basic seed location double-dot', async() => {
		assert.doesNotThrow(() => {
			seedPacketLocation.parse('../a');
		});
	});

	it('basic seed location dot with filename', async() => {
		assert.doesNotThrow(() => {
			seedPacketLocation.parse('./a.json');
		});
	});

	it('basic seed refereence empty', async() => {
		assert.doesNotThrow(() => {
			seedReferenceID.parse('');
		});
	});

	it('basic seed refereence hash id', async() => {
		assert.doesNotThrow(() => {
			seedReferenceID.parse('#a');
		});
	});

	it('basic seed refereence hash id naked dot path', async() => {
		assert.throws(() => {
			seedReferenceID.parse('.#a');
		});
	});

	it('basic seed refereence hash id', async() => {
		assert.doesNotThrow(() => {
			seedReferenceID.parse('./a.json#a');
		});
	});

	it('basic seed refereence just path', async() => {
		assert.throws(() => {
			seedReferenceID.parse('./a.json');
		});
	});

});