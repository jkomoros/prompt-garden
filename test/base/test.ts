/*eslint-env node*/
import {
	Garden
} from '../../src/garden.js';

import {
	makeAbsolute,
	unpackSeedReference
} from '../../src/reference.js';

import {
	expandSeedPacket
} from '../../src/seed.js';

import {
	ADA_2_EMBEDDING_LENGTH,
	AbsoluteSeedReference,
	DEFAULT_PROFILE,
	EnvironmentData,
	ExpandedSeedPacket,
	SeedReference,
	seedID,
	seedPacket,
	seedPacketAbsoluteLocation,
	seedPacketRelativeLocation
} from '../../src/types.js';

import {
	EmbeddingAda2
} from '../../src/embedding.js';

import {
	mockedResult
} from '../../src/util.js';

import assert from 'assert';

import {
	readFileSync,
	readdirSync
} from 'fs';

import {
	ProfileFilesystem
} from '../../tools/profile_filesystem.js';

import {
	DEFAULT_MEMORY_NAME
} from '../../src/profile.js';

import * as path from 'path';

const TEST_PACKETS_LOCATION = 'test/base/';

const loadTestGarden = (files?: string[], skipFetcher = false) : Garden => {
	const env : Required<EnvironmentData> = {
		completion_model: 'openai.com:gpt-3.5-turbo',
		embedding_model: 'openai.com:text-embedding-ada-002',
		openai_api_key: 'mock_key',
		profile: DEFAULT_PROFILE,
		memory: DEFAULT_MEMORY_NAME,
		mock: true,
		verbose: false
	};
	const profile = skipFetcher ? undefined : new ProfileFilesystem();
	const garden = new Garden(env, profile);
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

	it('a nested seed that implies a duplicate id is illegal', async() => {
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
						'id': '',
						'type': 'log',
						'value': true
					}
				}
			}
		});
		assert.throws(() => {
			garden.plantSeedPacket('test/base/foo.json', packet);
		});
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

	it ('testing template seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('render-test');
		const result = await seed.grow();
		const golden = 'Bob is 5';
		assert.deepStrictEqual(result, golden);
	});

	it ('testing extract seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('extract-test');
		const result = await seed.grow();
		const golden = {
			name: 'Alex',
			age: '5'
		};
		assert.deepStrictEqual(result, golden);
	});

	it ('testing non-computed object seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('non-computed-object');
		const result = await seed.grow();
		const golden = {
			a: 5,
			b: true
		};
		assert.deepStrictEqual(result, golden);
	});

	it ('testing computed object seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('computed-object');
		const result = await seed.grow();
		const golden = {
			a: 5,
			b: true
		};
		assert.deepStrictEqual(result, golden);
	});

	it ('testing secret key via secret works', async () => {
		const garden = loadTestGarden();
		assert.doesNotThrow(() => {
			garden.environment.getKnownSecretKey('openai_api_key');
		});
	});

	it ('testing let seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('let-test');
		const result = await seed.grow();
		const golden = '3 is great';
		assert.deepStrictEqual(result, golden);
	});

	it ('testing let seed with secret key fails', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('let-test-secret-key');
		assert.rejects(async () => {
			await seed.grow();
		});
	});

	it ('testing embed seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('embed-test');
		const result = await seed.grow();
		assert.ok(result instanceof EmbeddingAda2);
		assert.ok(result.vector.length == ADA_2_EMBEDDING_LENGTH);
	});

	it ('testing memorize seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('memorize-test');
		const result = await seed.grow();
		assert.ok(result instanceof EmbeddingAda2);
		assert.ok(result.vector.length == ADA_2_EMBEDDING_LENGTH);
		assert.deepStrictEqual(garden.profile._memories[DEFAULT_MEMORY_NAME].embeddings.length, 1);
	});

	it ('testing memorize-multiple seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('memorize-multiple-test');
		const result = await seed.grow();
		assert.ok(Array.isArray(result));
		assert.ok(result[0] instanceof EmbeddingAda2);
		assert.ok(result[0].vector.length == ADA_2_EMBEDDING_LENGTH);
		assert.deepStrictEqual(garden.profile._memories[DEFAULT_MEMORY_NAME].embeddings.length, 4);
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

	it('seed-type object nested', async () => {
		const packet = seedPacket.parse({
			version: 0,
			seeds: {
				'': {
					'type': 'object',
					'properties': {
						'a' : {
							'type': 'log',
							'value': true
						},
						'b': true
					}
				}
			}
		});
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			seeds: {
				'': {
					'type': 'object',
					'properties': {
						'a': {
							'id': '-a'
						},
						'b': true,
					}
				},
				'-a': {
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