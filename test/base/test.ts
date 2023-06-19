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
        const result = await seed.grow();
        const golden = mockedResult(seed.data.prompt);
        assert.deepEqual(result, golden);
    })

});
