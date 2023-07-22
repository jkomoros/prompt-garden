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
	AbsoluteSeedReference,
	DEFAULT_PROFILE,
	DEFAULT_STORE_ID,
	EnvironmentData,
	ExpandedSeedPacket,
	SeedDataCompose,
	SeedPacket,
	SeedReference,
	seedID,
	seedPacket,
	seedPacketAbsoluteLocation,
	seedPacketRelativeLocation,
	NAMESPACE_DELIMITER
} from '../../src/types.js';

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

import {
	Environment
} from '../../src/environment.js';

import {
	RANDOM_MOCK_VALUE
} from '../../src/grow.js';

import {
	ADA_2_EMBEDDING_LENGTH,
	EmbeddingAda2
} from '../../src/providers/openai.js';

import * as path from 'path';

const TEST_PACKETS_LOCATION = 'test/base/';

const loadTestGarden = (files?: string[], skipFetcher = false) : Garden => {
	const env : Required<EnvironmentData> = {
		completion_model: 'openai.com:gpt-3.5-turbo',
		embedding_model: 'openai.com:text-embedding-ada-002',
		default_model_provider: 'openai.com',
		openai_api_key: 'mock_key',
		google_api_key: 'mock_key',
		profile: DEFAULT_PROFILE,
		memory: DEFAULT_MEMORY_NAME,
		store: DEFAULT_STORE_ID,
		namespace: '',
		mock: true,
		verbose: false,
		disallow_remote: false,
		disallow_fetch: false,
		key: 0,
		value: ''
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
		const seed = await garden.seed({packet: 'test/base/b_test.json', seed: ''});
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
		const seed = await garden.seed({packet: 'test/base/b_test.json', seed: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('handles growing a seed that references a seed in another file', async () => {
		//Garden will have both files loaded up, so it won't need to be fetched.
		const garden = loadTestGarden();
		const seed = await garden.seed({packet: 'test/base/b_test.json', seed: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('handles growing a seed that references a seed in another file that isn\'t loaded yet', async () => {
		//Force garden to have only the first file loaded.
		const garden = loadTestGarden(['test/base/b_test.json']);
		const seed = await garden.seed({packet: 'test/base/b_test.json', seed: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('handles growing a seed that references a seed in another file that isn\'t loaded yet with no files loaded yet', async () => {
		//Force garden to have no files loaded to start
		const garden = loadTestGarden([]);
		const seed = await garden.seed({packet: 'test/base/b_test.json', seed: 'remote-ref'});
		const result = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(result, golden);
	});

	it('fails growing a seed that references a seed in an unloaded file with no fetcher', async () => {
		//Create an empty garden with no fetch
		const garden = loadTestGarden([], true);
		try {
			await garden.seed({packet: 'test/base/b_test.json', seed: 'remote-ref'});
		} catch(err) {
			//Err expected
			return;
		}
		assert.fail('Did not fail as expected');
	});

	it ('a seed with an explict id that matches is legal', async () => {
		const garden = loadTestGarden();
		assert.doesNotThrow(() => {
			garden.plantSeed({packet: '', seed: 'blammo'}, {
				'type': 'log',
				'value': true,
				'id': 'blammo'
			});
		});
	});

	it ('a seed with an explicit id that doesnt match is illegal', async () => {
		const garden = loadTestGarden();
		assert.throws(() => {
			garden.plantSeed({packet: '', seed: 'slammo'}, {
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

	it ('testing computed array seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('computed-array');
		const result = await seed.grow();
		const golden = [
			3,
			5
		];
		assert.deepStrictEqual(result, golden);
	});

	it ('testing secret key via non secret get returns secret value', async () => {
		const garden = loadTestGarden();
		const actual = garden.environment.get('openai_api_key');
		const golden = '~SECRET~';
		assert.deepStrictEqual(actual, golden);
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

	it ('testing let-multi seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('let-multi-test');
		const result = await seed.grow();
		const golden = '3 is Alex';
		assert.deepStrictEqual(result, golden);
	});

	it ('testing let seed with secret key fails', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('let-test-secret-key');
		assert.rejects(async () => {
			await seed.grow();
		});
	});

	it ('testing store seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('store-test');
		const result = await seed.grow();
		const golden = 3;
		assert.deepStrictEqual(result, golden);
		assert.deepStrictEqual(garden.profile._stores[NAMESPACE_DELIMITER + DEFAULT_STORE_ID]['foo'], 3);
	});

	it ('testing retrieve seed', async () => {
		const garden = loadTestGarden();
		const firstSeed = await garden.seed('store-test');
		await firstSeed.grow();
		const seed = await garden.seed('retrieve-test');
		const result = await seed.grow();
		const golden = 3;
		assert.deepStrictEqual(result, golden);
	});

	it ('testing delete seed', async () => {
		const garden = loadTestGarden();
		const firstSeed = await garden.seed('store-test');
		await firstSeed.grow();
		const secondSeed = await garden.seed('delete-test');
		await secondSeed.grow();
		const seed = await garden.seed('retrieve-test');
		const result = await seed.grow();
		//Check the key was not there
		const golden = null;
		assert.deepStrictEqual(result, golden);
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
		assert.deepStrictEqual(garden.profile._memories[NAMESPACE_DELIMITER + DEFAULT_MEMORY_NAME].embeddings.length, 1);
	});

	it ('testing memorize-multiple seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('memorize-multiple-test');
		const result = await seed.grow();
		assert.ok(Array.isArray(result));
		assert.ok(result[0] instanceof EmbeddingAda2);
		assert.ok(result[0].vector.length == ADA_2_EMBEDDING_LENGTH);
		assert.deepStrictEqual(garden.profile._memories[NAMESPACE_DELIMITER + DEFAULT_MEMORY_NAME].embeddings.length, 4);
	});

	it ('testing recall seed', async () => {
		const garden = loadTestGarden();
		//Store values in memory
		const firstSeed = await garden.seed('memorize-multiple-test');
		await firstSeed.grow();
		const seed = await garden.seed('recall-test');
		const result = await seed.grow();
		assert.ok(Array.isArray(result));
		assert.deepStrictEqual(result.length, 4);
		const firstResult = result[0];
		assert.ok(firstResult instanceof EmbeddingAda2);
		//TODO: this last test is not deterministic because we're creating mocked embeddings...
		//assert.deepStrictEqual(firstResult.text, 'Carrot');
	});

	it ('testing recall seed no k', async () => {
		const garden = loadTestGarden();
		//Store values in memory
		const firstSeed = await garden.seed('memorize-multiple-test');
		await firstSeed.grow();
		const seed = await garden.seed('recall-test-no-k');
		const result = await seed.grow();
		assert.ok(Array.isArray(result));
		assert.deepStrictEqual(result.length, 1);
		const firstResult = result[0];
		assert.ok(firstResult instanceof EmbeddingAda2);
		//TODO: this last test is not deterministic because we're creating mocked embeddings...
		//assert.deepStrictEqual(firstResult.text, 'Carrot');
	});

	it ('testing embed is used as a string', async () => {
		const garden = loadTestGarden();
		//The template sub-seed should coerce embedding to template.
		const seed = await garden.seed('embedding-as-string');
		const result = await seed.grow();
		const golden = 'This is an embedding';
		assert.deepStrictEqual(result, golden);
	});

	it ('testing token_count seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('token-count-test');
		const result = await seed.grow();
		const golden = 3;
		assert.deepStrictEqual(result, golden);
	});

	it ('testing token_count multiple seed', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('token-count-multiple-test');
		const result = await seed.grow();
		const golden = [2, 3];
		assert.deepStrictEqual(result, golden);
	});

	it ('testing compose seed basic', async () => {
		const garden = loadTestGarden();
		const seedData : SeedDataCompose = {
			type: 'compose',
			prefix: 'Prefix',
			suffix: 'Suffix',
			items: [
				'One',
				'Two',
				'Three'
			]
		};
		garden.plantSeed({seed: 'compose-seed', packet: garden.location || ''}, seedData);
		const seed = await garden.seed('compose-seed');
		const result = await seed.grow();
		const golden = `Prefix
One
Two
Three
Suffix`;
		assert.deepStrictEqual(result, golden);
	});

	it ('testing compose seed short max tokens', async () => {
		const garden = loadTestGarden();
		const seedData : SeedDataCompose = {
			type: 'compose',
			prefix: 'Prefix',
			suffix: 'Suffix',
			items: [
				'One',
				'Two',
				'Three'
			],
			max_tokens: 10
		};
		garden.plantSeed({seed: 'compose-seed', packet: garden.location || ''}, seedData);
		const seed = await garden.seed('compose-seed');
		const result = await seed.grow();
		const golden = `Prefix
One
Two
Suffix`;
		assert.deepStrictEqual(result, golden);
	});

	it ('testing compose seed negative max tokens', async () => {
		const garden = loadTestGarden();
		const seedData : SeedDataCompose = {
			type: 'compose',
			prefix: 'Prefix',
			suffix: 'Suffix',
			items: [
				'One',
				'Two',
				'Three'
			],
			//4096 is the maxTokens for default model, so this should be effecively same as test above
			max_tokens: 10 - 4096
		};
		garden.plantSeed({seed: 'compose-seed', packet: garden.location || ''}, seedData);
		const seed = await garden.seed('compose-seed');
		const result = await seed.grow();
		const golden = `Prefix
One
Two
Suffix`;
		assert.deepStrictEqual(result, golden);
	});

	it ('testing a packet with an invalid ref is caught', async () => {
		const garden = loadTestGarden();
		const packet : SeedPacket = {
			'version': 0,
			'seeds': {
				'foo': {
					'type': 'var',
					'name': {
						'seed': 'bar-typo'
					}
				},
				'bar': {
					'type': 'noop',
					'value': 'hello, world'
				}
			}
		};
		assert.throws(() => {
			garden.plantSeedPacket('test/base/c_test.json', packet);
		});
	});

	it ('environment overlay works', async () => {
		const garden = loadTestGarden();
		const packet : SeedPacket = {
			version: 0,
			environment: {
				'komoroske.com:test': 3
			},
			seeds: {
				'env-test': {
					type: 'var',
					name: 'komoroske.com:test'
				}
			}
		};
		garden.plantSeedPacket('test/base/c_test.json', packet);
		const seed = await garden.seed('env-test');
		const actual = await seed.grow();
		const golden = 3;
		assert.deepStrictEqual(actual, golden);
	});

	it ('environment overlay overrides parent seed let', async () => {
		const garden = loadTestGarden();
		const packet = seedPacket.parse({
			version: 0,
			environment: {
				'komoroske.com:test': 3
			},
			seeds: {
				'env-test': {
					type: 'var',
					name: 'komoroske.com:test'
				},
				'other-test': {
					type: 'let',
					name: 'komoroske.com:test',
					value: 5,
					block: {
						seed: 'env-test'
					}
				}
			}
		});
		garden.plantSeedPacket('test/base/c_test.json', packet);
		const seed = await garden.seed('other-test');
		const actual = await seed.grow();
		//The other-test value should be shadowed by the environment packet
		const golden = 3;
		assert.deepStrictEqual(actual, golden);
	});

	it ('environment overlay passed into sub-seed', async () => {
		const garden = loadTestGarden();
		const packet = seedPacket.parse({
			version: 0,
			environment: {
				'komoroske.com:test': 3
			},
			seeds: {
				'env-test': {
					type: 'array',
					items: [
						{
							type: 'var',
							name: 'komoroske.com:test'
						},
						{
							type: 'var',
							name: 'komoroske.com:other'
						}
					]
				},
				'other-test': {
					type: 'let',
					name: 'komoroske.com:other',
					value: 5,
					block: {
						seed: 'env-test'
					}
				}
			}
		});
		garden.plantSeedPacket('test/base/c_test.json', packet);
		const seed = await garden.seed('other-test');
		const actual = await seed.grow();
		//The other value should make it through from the parent seed, and main
		//value should not be affected.
		const golden = [3, 5];
		assert.deepStrictEqual(actual, golden);
	});

	it('namespace works for var', async () => {
		const garden = loadTestGarden();
		const packet : SeedPacket = {
			version: 0,
			environment: {
				namespace: 'komoroske.com',
				'komoroske.com:foo': 3
			},
			seeds: {
				'other-test': {
					type: 'var',
					name: 'foo'
				}
			}
		};
		garden.plantSeedPacket('test/base/c_test.json', packet);
		const seed = await garden.seed('other-test');
		const actual = await seed.grow();
		const golden = 3;
		assert.deepStrictEqual(actual, golden);
	});

	it('namespace works for store', async () => {
		const garden = loadTestGarden();
		const packet : SeedPacket = {
			version: 0,
			environment: {
				namespace: 'komoroske.com',
				store: 'bar'
			},
			seeds: {
				'other-test': {
					type: 'store',
					name: 'foo',
					value: 3
				}
			}
		};
		garden.plantSeedPacket('test/base/c_test.json', packet);
		const seed = await garden.seed('other-test');
		await seed.grow();
		assert.deepStrictEqual(garden.profile._stores['komoroske.com:bar']['foo'], 3);
	});

	it('namespace works for memory', async () => {
		const garden = loadTestGarden();
		const packet : SeedPacket = {
			version: 0,
			environment: {
				namespace: 'komoroske.com',
				memory: 'bar'
			},
			seeds: {
				'other-test': {
					type: 'memorize',
					value: 'text'
				}
			}
		};
		garden.plantSeedPacket('test/base/c_test.json', packet);
		const seed = await garden.seed('other-test');
		await seed.grow();
		assert.deepStrictEqual(garden.profile._memories['komoroske.com:bar'].embeddings[0].text, 'text');
	});

	it('private remote refs fail', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('private-remote-ref');
		assert.rejects(async () => {
			await seed.grow();
		});
	});

	it('reference seed test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('reference-test');
		const actual = await seed.grow();
		const golden = 'test/base/a_test.json#private';
		assert.deepStrictEqual(actual, golden);
	});

	it('dynamic seed test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('dynamic-test');
		const actual = await seed.grow();
		const golden = true;
		assert.deepStrictEqual(actual, golden);
	});

	it('dynamic remote seed fails', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('dynamic-remote-test');
		assert.rejects(async () => {
			await seed.grow();
		});
	});

	it('keys seed test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('keys-test');
		const actual = await seed.grow();
		const golden = ['0', '1'];
		assert.deepStrictEqual(actual, golden);
	});

	it('map object seed test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('map-object-test');
		const actual = await seed.grow();
		const golden = {
			a: 'a:3', 
			b: 'b:4'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('map array seed test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('map-array-test');
		const actual = await seed.grow();
		const golden = ['0:3', '1:4'];
		assert.deepStrictEqual(actual, golden);
	});

	it('throw seed test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('throw-test');
		assert.rejects(async () => {
			await seed.grow();
		});
	});

	it('var set else test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('var-with-value-set');
		const actual = await seed.grow();
		const golden = 3;
		assert.deepStrictEqual(actual, golden);
	});

	it('var unset else test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('var-without-value-set');
		const actual = await seed.grow();
		const golden = 5;
		assert.deepStrictEqual(actual, golden);
	});

	it('retrieve set else test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('retrieve-with-value-set');
		const actual = await seed.grow();
		const golden = 3;
		assert.deepStrictEqual(actual, golden);
	});

	it('retrieve unset else test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('retrieve-without-value-set');
		const actual = await seed.grow();
		const golden = 5;
		assert.deepStrictEqual(actual, golden);
	});

	it('random test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('random-test');
		const actual = await seed.grow();
		const golden = RANDOM_MOCK_VALUE;
		assert.deepStrictEqual(actual, golden);
	});

	it('split test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('split-test');
		const actual = await seed.grow();
		const golden = ['one', 'two'];
		assert.deepStrictEqual(actual, golden);
	});

	it('join test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('join-test');
		const actual = await seed.grow();
		const golden = 'one:two';
		assert.deepStrictEqual(actual, golden);
	});

	it('dotted property test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('dotted-property-test');
		const actual = await seed.grow();
		const golden = 1;
		assert.deepStrictEqual(actual, golden);
	});

	it('fetch test', async () => {
		const garden = loadTestGarden();
		const seed = await garden.seed('fetch-test');
		const actual = await seed.grow();
		const golden = {
			'mock': true,
			'format': 'json',
			'resource': 'https://raw.githubusercontent.com/jkomoros/prompt-garden/main/seeds/example-basic.json',
			'method': 'POST',
			'body': ''
		};
		assert.deepStrictEqual(actual,golden);
	});

});

describe('expandSeedPacket tests', () => {
	it('no op', async () => {
		const packet : SeedPacket = {
			version: 0,
			seeds: {}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('basic non-nested', async () => {
		const packet : SeedPacket = {
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'seed': 'other'
					}
				},
				'other': {
					'type': 'log',
					'value': true
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'seed': 'other'
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
		const packet : SeedPacket = {
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
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'seed': '-value'
					}
				},
				'-value': {
					'type': 'log',
					private: true,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('basic nested non-private', async () => {
		const packet : SeedPacket = {
			version: 0,
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'type': 'log',
						private: false,
						'value': true
					}
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'seed': '-value'
					}
				},
				'-value': {
					'type': 'log',
					private: false,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('basic named nested', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
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
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'log',
					'value': {
						'seed': 'foo'
					}
				},
				'foo': {
					'id': 'foo',
					private: true,
					'type': 'log',
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed-type object nested', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
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
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'object',
					'properties': {
						'a': {
							'seed': '-a'
						},
						'b': true,
					}
				},
				'-a': {
					'type': 'log',
					private: true,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed-type array nested', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'array',
					'items': [
						{
							'type': 'log',
							'value': true
						},
						true
					]
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'array',
					'items': [
						{
							'seed': '-0'
						},
						true,
					]
				},
				'-0': {
					'type': 'log',
					private: true,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed with existing array single layer doesn\'t unroll', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'type': 'array',
						'items': [
							{
								'type': 'noop',
								'value': 3
							},
							true
						]
					}
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'-value-0': {
					'type': 'noop',
					private: true,
					'value': 3
				},
				'-value': {
					'type': 'array',
					private: true,
					'items': [
						{
							'seed': '-value-0'
						},
						true
					]
				},
				'': {
					'type': 'noop',
					'value': {
						'seed': '-value'
					}
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed with auto-array single layer nested', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': [
						{
							'type': 'log',
							'value': true
						},
						true
					]
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'seed': '-value'
					}
				},
				'-value': {
					'type': 'array',
					private: true,
					'items': [
						{
							'seed': '-value-0'
						},
						true
					]
				},
				'-value-0': {
					'type': 'log',
					private: true,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed with existing object single layer doesn\'t unroll', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'type': 'object',
						'properties': {
							'a': {
								'type': 'noop',
								'value': 3
							},
							'b': true
						}
					}
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'-value-a': {
					'type': 'noop',
					private: true,
					'value': 3
				},
				'-value': {
					'type': 'object',
					private: true,
					'properties': {
						'a': {
							'seed': '-value-a'
						},
						'b': true
					}
				},
				'': {
					'type': 'noop',
					'value': {
						'seed': '-value'
					}
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed with auto-object single layer nested', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'a': {
							'type': 'log',
							'value': true
						},
						'b': true
					}
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'seed': '-value'
					}
				},
				'-value': {
					'type': 'object',
					private: true,
					'properties': {
						'a': {
							'seed': '-value-a'
						},
						'b': true
					}
				},
				'-value-a': {
					'type': 'log',
					private: true,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed with auto-object single layer nested with seed ref', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					type: 'render',
					template: '{{name}} is {{age}}',
					vars: {
						name: {
							seed: 'other'
						},
						age: 3
					}
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					type: 'render',
					template: '{{name}} is {{age}}',
					vars: {
						seed: '-vars',
					}
				},
				'-vars': {
					type: 'object',
					private: true,
					properties: {
						name: {
							seed: 'other'
						},
						age: 3
					}
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed with auto-object with auto-array inside layer nested', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'a': [
							{
								'type': 'log',
								'value': true
							},
							3
						],
						'b': true
					}
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'seed': '-value'
					}
				},
				'-value': {
					'type': 'object',
					private: true,
					'properties': {
						'a': {
							'seed': '-value-a'
						},
						'b': true
					}
				},
				'-value-a': {
					'type': 'array',
					private: true,
					'items': [
						{
							'seed': '-value-a-0'
						},
						3
					]
				},
				'-value-a-0': {
					'type': 'log',
					private: true,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});

	it('seed with auto-object with manual array unrolls properly', async () => {
		const packet : SeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'a': {
							'type': 'array',
							'items': [
								{
									'type': 'log',
									'value': true
								},
								3
							],
						},
						'b': true
					}
				}
			}
		};
		const result = expandSeedPacket(packet);
		const golden : ExpandedSeedPacket = {
			version: 0,
			environment: {},
			seeds: {
				'': {
					'type': 'noop',
					'value': {
						'seed': '-value'
					}
				},
				'-value': {
					'type': 'object',
					private: true,
					'properties': {
						'a': {
							'seed': '-value-a'
						},
						'b': true
					}
				},
				'-value-a': {
					'type': 'array',
					private: true,
					'items': [
						{
							'seed': '-value-a-0'
						},
						3
					]
				},
				'-value-a-0': {
					'type': 'log',
					private: true,
					'value': true
				}
			}
		};
		assert.deepStrictEqual(result, golden);
	});
});

describe('protected environment', () => {

	it('protected get fails without proetect', async() => {
		const environment = new Environment({
			'mock': true
		});
		assert.throws(() => {
			environment.get('mock');
		});
	});

	it('protected get succeeds with proetect', async() => {
		const environment = new Environment({
			'mock': true
		});
		const actual = environment.getKnownProtectedKey('mock');
		const golden = true;
		assert.deepStrictEqual(actual, golden);

	});

	it('protected clone succeeds with false', async() => {
		const environment = new Environment({
			'mock': false
		});
		const newEnvironment = environment.clone({
			'mock': true,
			'other': true
		});
		const actual = newEnvironment.getKnownProtectedKey('mock');
		const golden = true;
		assert.deepStrictEqual(actual, golden);

	});

	it('protected clone fails with un-setting false', async() => {
		const environment = new Environment({
			'mock': true
		});
		assert.throws(() => {
			environment.clone({
				'mock': false,
				'other': true
			});
		});
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
			seed: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it ('basic unpack no packet', async() => {
		const input = 'foo';
		const result = unpackSeedReference(input);
		const golden : AbsoluteSeedReference = {
			packet: '',
			seed: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it ('basic unpack empty id', async() => {
		const input = 'https://foo.com/blammo#';
		const result = unpackSeedReference(input);
		const golden : AbsoluteSeedReference = {
			packet: 'https://foo.com/blammo',
			seed: ''
		};
		assert.deepStrictEqual(result, golden);
	});

});

describe('makeAbsolute', () => {
	it('absolute is no op', async() => {
		const base = 'd/e.json';
		const input : AbsoluteSeedReference = {
			packet: 'a/b/c.json',
			seed: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = input;
		assert.deepStrictEqual(result, golden);
	});

	it('relative works for local', async() => {
		const base = 'a/b/c.json';
		const input : SeedReference = {
			packet: '../c/e.json',
			seed: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'a/c/e.json',
			seed: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it('relative works for https', async() => {
		const base = 'https://localhost/a/b/c.json';
		const input : SeedReference = {
			packet: '../c/e.json',
			seed: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'https://localhost/a/c/e.json',
			seed: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it('relative with dot works for local', async() => {
		const base = 'a/b/c.json';
		const input : SeedReference = {
			packet: './f/e.json',
			seed: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'a/b/f/e.json',
			seed: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});

	it('relative with dot works for https', async() => {
		const base = 'https://localhost/a/b/c.json';
		const input : SeedReference = {
			packet: './f/e.json',
			seed: 'foo'
		};
		const result = makeAbsolute(input, base);
		const golden : AbsoluteSeedReference = {
			packet: 'https://localhost/a/b/f/e.json',
			seed: 'foo'
		};
		assert.deepStrictEqual(result, golden);
	});
});