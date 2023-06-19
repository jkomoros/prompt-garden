import { zodToJsonSchema } from "zod-to-json-schema";

import {
    seedPacket
} from '../../src/types.js';

import {
    writeFileSync
} from 'fs';

const SCHEMA_FILE = 'seed-schema.json';

const main = () => {
    const schema = zodToJsonSchema(seedPacket);
    writeFileSync(SCHEMA_FILE, JSON.stringify(schema, null, '\t'));
};

(() => {
    main();
})();