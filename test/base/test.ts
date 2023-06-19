/*eslint-env node*/
import {
    Garden
} from '../../src/garden.js';

import {
    loadLocalGarden
} from '../../tools/util.js';

import {
    mockedResult
} from '../../src/util.js';

import assert from 'assert';

describe('Garden smoke test', () => {
    it('basic running', async () => {
        const garden = new Garden({});
        assert.notEqual(garden, undefined);
    });

    it('handles loading default garden', async () => {
        const garden = await loadLocalGarden();
        assert.notEqual(garden, undefined);
    })

    it('prompt respects mock parameter', async () => {
        const garden = await loadLocalGarden({mock: true});
        const seed = garden.seed();
         //Checking type and throwing narrows type
        if (seed.data.type != 'prompt') throw new Error('Unexpected type');
        const result = await seed.grow();
        const golden = mockedResult(seed.data.prompt);
        assert.deepEqual(result, golden);
    })

    it('handles echo', async () => {
        const garden = await loadLocalGarden();
        const seed = garden.seed('hello-world');
        //Checking type and throwing narrows type
        if (seed.data.type != 'echo') throw new Error('Unexpected type');
        const result = await seed.grow();
        const golden = 'Hello, world!';
        assert.deepEqual(result, golden);
    })

    it('throws for unknown seed', async () => {
        const garden = await loadLocalGarden();
        assert.throws(() => {
            garden.seed('unknown-123');
        })
    })

});
