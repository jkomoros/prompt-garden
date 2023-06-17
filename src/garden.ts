import  {
    Environment,
    SeedData,
    SeedID,
    SeedPacket
} from './types.js';

class Seed {

    _garden : Garden
    _id : SeedID
    _data : SeedData

    constructor(garden: Garden, id : SeedID, data : SeedData) {
        this._garden = garden;
        this._id = id;
        this._data = data;
    }
}

export class Garden {
    _env : Environment
    _seeds : {[id : SeedID] : Seed}

    constructor(environment : Environment) {
        this._env = environment;
        this._seeds = {};
    }

    seed(id : SeedID = '') : Seed {
        return this._seeds[id];
    }

    plantSeed(id : SeedID, data : SeedData) {
        this._seeds[id] = new Seed(this, id, data);
    }

    plantSeedPacket(packet: SeedPacket) {
        for (const [id, seed] of Object.entries(packet.seeds)) {
            this.plantSeed(id, seed);
        }
    }

    //TODO: plantSeedPacket as well
}

