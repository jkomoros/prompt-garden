import {
    Garden
} from '../src/garden.js';

import {
    environment
} from '../src/types.js';

import * as fs from 'fs';

const ENVIRONMENT_PATH = 'environment.SECRET.json';

const main = () => {
    const data = fs.readFileSync(ENVIRONMENT_PATH).toString();
    const env = environment.parse(JSON.parse(data));
    const garden = new Garden(env);
    console.log(garden);
};

(() => {
    main()
})();
