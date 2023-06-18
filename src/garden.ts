import  {
    SeedReference,
    SeedData,
    SeedPacket,
    EnvironmentData,
    SeedPacketLocation
} from './types.js';

import {
    Environment
} from './environment.js';

import {
    Seed
} from './seed.js';

export class Garden {
    _env : Environment
    _seeds : {[id : SeedReference] : Seed}
    _location? : SeedPacketLocation

    constructor(environment : EnvironmentData) {
        this._env = new Environment(environment);
        this._seeds = {};
    }

    get environment() : Environment {
        return this._env;
    }

    //Returns the location of the first seed packet loaded.
    get location() : SeedPacketLocation | undefined {
        return this._location;
    }

    seed(id : SeedReference = '') : Seed {
        return this._seeds[id];
    }

    plantSeed(id : SeedReference, data : SeedData) {
        this._seeds[id] = new Seed(this, id, data);
    }

    plantSeedPacket(location: SeedPacketLocation, packet: SeedPacket) {
        if (!this._location) this._location = location;
        //TODO: combine IDs with the URL they came from so no collisions
        for (const [id, seed] of Object.entries(packet.seeds)) {
            this.plantSeed(id, seed);
        }
    }

}

