
import  {
    LocalSeedID,
    SeedData,
    Value
} from './types.js';

import {
    Garden
} from './garden.js';

import {
    grow
} from './grow.js';

export class Seed {

    _garden : Garden
    _id : LocalSeedID
    _data : SeedData

    constructor(garden: Garden, id : LocalSeedID, data : SeedData) {
        this._garden = garden;
        this._id = id;
        this._data = data;
    }

    get data() : SeedData {
        return this._data;
    }

    async grow() : Promise<Value> {
        return grow(this.data, this._garden.environment);
    }
}