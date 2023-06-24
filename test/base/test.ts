/*eslint-env node*/
import {
	Garden
} from '../../src/garden.js';
import { makeAbsolute } from '../../src/reference.js';

import {
	AbsoluteSeedReference,
	EnvironmentData,
	RelativeSeedReference,
	localSeedID,
	seedPacket,
	seedPacketAbsoluteLocation,
	seedPacketRelativeLocation
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
		const seed = garden.seed({location: 'test/base/b_test.json', id: ''});
		const result = await seed.grow();
		const golden = 'test-other hello world';
		assert.deepStrictEqual(result, golden);
	});

	it('seed.location returns the right thing', async() => {
		const garden = loadTestGarden();
		const seed = garden.seed('');
		const result = seed.location;
		const golden = 'test/base/a_test.json';
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
			seedPacketAbsoluteLocation.parse('');
		});
	});

	it('basic seed location naked dot', async() => {
		assert.throws(() => {
			seedPacketRelativeLocation.parse('.');
		});
	});

	it('basic seed location dot', async() => {
		assert.doesNotThrow(() => {
			seedPacketRelativeLocation.parse('./a');
		});
	});

	it('basic seed location double-dot', async() => {
		assert.doesNotThrow(() => {
			seedPacketRelativeLocation.parse('../a');
		});
	});

	it('basic seed location dot with filename', async() => {
		assert.doesNotThrow(() => {
			seedPacketRelativeLocation.parse('./a.json');
		});
	});

});

describe('makeAbsolute', () => {
	it('absolute is no op', async() => {
		const base = 'd/e.json';
		const input : AbsoluteSeedReference = {
			location: 'a/b/c.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = input;
		assert.deepStrictEqual(result, golden);
	});

	it('relative works', async() => {
		const base = 'a/b/c.json';
		const input : RelativeSeedReference = {
			rel: '../c/e.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			location: 'a/c/e.json',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it('relative with dot works', async() => {
		const base = 'a/b/c.json';
		const input : RelativeSeedReference = {
			rel: './f/e.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			location: 'a/b/f/e.json',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});
});