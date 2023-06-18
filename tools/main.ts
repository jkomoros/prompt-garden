import {
    loadLocalGarden
} from './util.js';

const main = async () => {
    const garden = await loadLocalGarden();
    //Select default seed
    const seed = garden.seed();
    const result = await seed.grow();
    console.log(result);
};

(async () => {
    await main()
})();
