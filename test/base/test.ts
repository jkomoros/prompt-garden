/*eslint-env node*/
import {
	Garden
} from '../../src/garden.js';

import {
	makeAbsolute, unpackSeedReference
} from '../../src/reference.js';
import { expandSeedPacket } from '../../src/seed.js';

import {
	AbsoluteSeedReference,
	EnvironmentData,
	ExpandedSeedPacket,
	SeedReference,
	seedID,
	seedPacket,
	seedPacketAbsoluteLocation,
	seedPacketRelativeLocation
} from '../../src/types.js';

import {
	mockedResult
} from '../../src/util.js';

import {
	localFetcher
} from '../../tools/util.js';

import assert from 'assert';

import {
	readFileSync,
	readdirSync
} from 'fs';

import * as path from 'path';

const TEST_PACKETS_LOCATION = 'test/base/';

const loadTestGarden = (files?: string[], skipFetcher = false) : Garden => {
	const env : Required<EnvironmentData> = {
		completion_model: 'openai.com:gpt-3.5-turbo',
		openai_api_key: 'mock_key',
		mock: true,
		verbose: false
	};
	const fetcher = skipFetcher ? undefined : localFetcher;
	const garden = new Garden(env, fetcher);
	if (!files) {
		files = [];
		for (const file of readdirSync(TEST_PACKETS_LOCATION)) {
			if (path.extname(file) != '.json') continue;
			const filename = path.join(TEST_PACKETS_LOCATION, file);
			files.push(filename);
		}
	}
	for (const filename of files) {
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
		const seed = await garden.seed();
		//Checking type and throwing narrows type
		if (seed.data.type != 'prompt') throw new Error('Unexpected type');
		const result = await seed.grow();
		if (typeof seed.data.prompt != 'string') throw new Error('Expected a direct string');
		const golden = mockedResult(seed.data.prompt);
		assert.deepEqual(result, golden);
	});

	it('handles echo', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('hello-world');
		//Checking type and throwing narrows type
		if (seed.data.type != 'log') throw new Error('Unexpected type');
		const result = await seed.grow();
		const golden = 'Hello, world!';
		assert.deepEqual(result, golden);
	});

	it('throws for unknown seed', async () => {
		const garden = loadTestGarden();
		try {
			await garden.seed('unknown-123');
		} catch (err) {
			//Expected
			return;
		}
		assert.fail('Did not get an exception as exected');
	});

	it('handles a nested seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('composed-prompt');
		const hellowWorldSeed = await garden.seed('hello-world');
		if (hellowWorldSeed.data.type != 'log') throw new Error('Unexpected type');
		if (typeof hellowWorldSeed.data.value != 'string') throw new Error('Expected a non-computed message');
		const result = await seed.grow();
		const golden = mockedResult(hellowWorldSeed.data.value);
		assert.deepEqual(result, golden);
	});

	it('handles an if that is true', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('if-true');
		const result = await seed.grow();
		const golden = true;
		assert.deepEqual(result, golden);
	});

	it('handles an if that is false', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('if-false');
		const result = await seed.grow();
		const golden = false;
		assert.deepEqual(result, golden);
	});

	it('handles a seed from another file', async() => {
		const garden = loadTestGarden();
		const seed = await garden.seed({packet: 'test/base/b_test.json', id: ''});
		const result = await seed.grow();
		const golden = 'test-other hello world';
		assert.deepStrictEqual(result, golden);
	});

	it('seed.location returns the right thing', async() => {
		const garden = loadTestGarden();
		const seed = await garden.seed('');
		const result = seed.location;
		const golden = 'test/base/a_test.json';
		assert.deepStrictEqual(result, golden);
	});

	it('handles growing a seed that references a seed in another file', async () => {
		//Garden will have both files loaded up, so it won't need to be fetched.
		const garden = loadTestGarden();
		const seed = await garden.seed({packet: 'test/base/b_test.json', id: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('handles growing a seed that references a seed in another file', async () => {
		//Garden will have both files loaded up, so it won't need to be fetched.
		const garden = loadTestGarden();
		const seed = await garden.seed({packet: 'test/base/b_test.json', id: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('handles growing a seed that references a seed in another file that isn\'t loaded yet', async () => {
		//Force garden to have only the first file loaded.
		const garden = loadTestGarden(['test/base/b_test.json']);
		const seed = await garden.seed({packet: 'test/base/b_test.json', id: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('handles growing a seed that references a seed in another file that isn\'t loaded yet with no files loaded yet', async () => {
		//Force garden to have no files loaded to start
		const garden = loadTestGarden([]);
		const seed = await garden.seed({packet: 'test/base/b_test.json', id: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('fails growing a seed that references a seed in an unloaded file with no fetcher', async () => {
		//Create an empty garden with no fetch
		const garden = loadTestGarden([], true);
		try {
			await garden.seed({packet: 'test/base/b_test.json', id: 'remote-ref'});
		} catch(err) {
			//Err expected
			return;
		}
		assert.fail('Did not fail as expected');
	});

	it ('a seed with an explict id that matches is legal', async () => {
		const garden = loadTestGarden();
		assert.doesNotThrow(() => {
			garden.plantSeed({packet: '', id: 'blammo'}, {
				'type': 'log',
				'value': true,
				'id': 'blammo'
			});
		});
	});

	it ('a seed with an explicit id that doesnt match is illegal', async () => {
		const garden = loadTestGarden();
		assert.throws(() => {
			garden.plantSeed({packet: '', id: 'slammo'}, {
				'type': 'log',
				'value': true,
				'id': 'blammo'
			});
		});
	});

	it('a nested seed is legal', async() => {
		const garden = loadTestGarden([]);
		//We can't just do a manually typed SeedPacket because its type doesn't
		//explicitly allow nesting due to the error descrbied in
		//makeNestedSeedData, issue #16.
		const packet = seedPacket.parse({
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'type': 'log',
						'value': true
					}
				}
			}
		});
		garden.plantSeedPacket('test/base/foo.json', packet);
		const seed = await garden.seed('');
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('a nested seed can define its own id', async() => {
		const garden = loadTestGarden([]);
		//We can't just do a manually typed SeedPacket because its type doesn't
		//explicitly allow nesting due to the error descrbied in
		//makeNestedSeedData, issue #16.
		const packet = seedPacket.parse({
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'id': 'foo',
						'type': 'log',
						'value': true
					}
				}
			}
		});
		garden.plantSeedPacket('test/base/foo.json', packet);
		const seed = await garden.seed('foo');
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it ('a seed can be fetched based on just its id', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('remote-ref');
		const location = seed.location;
		const golden = 'test/base/b_test.json';
		assert.deepStrictEqual(location, golden);
	});

	it ('a seed can be fetched from a file with a packed reference', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('test/base/b_test.json#');
		const location = seed.location;
		const golden = 'test/base/b_test.json';
		assert.deepStrictEqual(location, golden);
	});


});

describe('expandSeedPacket tests', () => {
	it('no op', async () => {
		const packet = seedPacket.parse({
			version: 0,
			seeds: {}
		});
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			seeds: {}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('basic non-nested', async () => {
		const packet = seedPacket.parse({
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'id': 'other'
					}
				},
				'other': {
					'type': 'log',
					'value': true
				}
			}
		});
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'id': 'other'
					}
				},
				'other': {
					'type': 'log',
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('basic nested', async () => {
		const packet = seedPacket.parse({
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'type': 'log',
						'value': true
					}
				}
			}
		});
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'id': '-value'
					}
				},
				'-value': {
					'type': 'log',
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('basic named nested', async () => {
		const packet = seedPacket.parse({
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'id': 'foo',
						'type': 'log',
						'value': true
					}
				}
			}
		});
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'id': 'foo'
					}
				},
				'foo': {
					'id': 'foo',
					'type': 'log',
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});
});


describe('reference regexp tests', () => {
	it('basic local seed reference empty', async() => {
		assert.doesNotThrow(() => {
			seedID.parse('');
		});
	});

	it('basic local seed reference', async() => {
		assert.doesNotThrow(() => {
			seedID.parse('abc-123');
		});
	});

	it('basic local seed illegal reference', async() => {
		assert.throws(() => {
			seedID.parse('abc.123');
		});
	});

	it('basic local seed illegal reference with #', async() => {
		assert.throws(() => {
			//a # is allowed in a seedReferenceID but not a localSeedID
			seedID.parse('#abc');
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

	it ('basic unpack', async() => {
		const input = 'https://foo.com/blammo#foo';
		const result = unpackSeedReference(input);
		const golden : AbsoluteSeedReference = {
			packet: 'https://foo.com/blammo',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it ('basic unpack no packet', async() => {
		const input = 'foo';
		const result = unpackSeedReference(input);
		const golden : AbsoluteSeedReference = {
			packet: '',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it ('basic unpack empty id', async() => {
		const input = 'https://foo.com/blammo#';
		const result = unpackSeedReference(input);
		const golden : AbsoluteSeedReference = {
			packet: 'https://foo.com/blammo',
			id: ''
		};
		assert.deepStrictEqual(result, golden);
	});

});

describe('makeAbsolute', () => {
	it('absolute is no op', async() => {
		const base = 'd/e.json';
		const input : AbsoluteSeedReference = {
			packet: 'a/b/c.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = input;
		assert.deepStrictEqual(result, golden);
	});

	it('relative works for local', async() => {
		const base = 'a/b/c.json';
		const input : SeedReference = {
			packet: '../c/e.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'a/c/e.json',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it('relative works for https', async() => {
		const base = 'https://localhost/a/b/c.json';
		const input : SeedReference = {
			packet: '../c/e.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'https://localhost/a/c/e.json',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it('relative with dot works for local', async() => {
		const base = 'a/b/c.json';
		const input : SeedReference = {
			packet: './f/e.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'a/b/f/e.json',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it('relative with dot works for https', async() => {
		const base = 'https://localhost/a/b/c.json';
		const input : SeedReference = {
			packet: './f/e.json',
			id: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'https://localhost/a/b/f/e.json',
			id: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});
});