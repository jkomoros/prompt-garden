/*eslint-env node*/
import {
    Garden
} from '../../src/garden.js';

import assert from 'assert';


describe('Garden smoke test', () => {
    it('basic running', async () => {
        const garden = new Garden({});
        assert.notEqual(garden, undefined);
    });

});
