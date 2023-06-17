import  {
    SeedID,
    SeedData,
    SeedPacket,
    Value,
    EnvironmentData
} from './types.js';

import {
    Environment
} from './environment.js';

import {
    grow
} from './grow.js';

class Seed {

    _garden : Garden
    _id : SeedID
    _data : SeedData

    constructor(garden: Garden, id : SeedID, data : SeedData) {
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

export class Garden {
    _env : Environment
    _seeds : {[id : SeedID] : Seed}

    constructor(environment : EnvironmentData) {
        this._env = new Environment(environment);
        this._seeds = {};
    }

    get environment() : Environment {
        return this._env;
    }

    seed(id : SeedID = '') : Seed {
        return this._seeds[id];
    }

    plantSeed(id : SeedID, data : SeedData) {
        this._seeds[id] = new Seed(this, id, data);
    }

    plantSeedPacket(packet: SeedPacket) {
        //TODO: combine IDs with the URL they came from so no collisions
        for (const [id, seed] of Object.entries(packet.seeds)) {
            this.plantSeed(id, seed);
        }
    }

}

