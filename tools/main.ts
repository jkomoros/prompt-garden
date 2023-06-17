import {
    Garden
} from '../src/garden.js';

const main = () => {
    const garden = new Garden({});
    console.log(garden);
};

(() => {
    main()
})();
