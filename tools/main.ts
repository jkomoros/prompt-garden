import {
    Garden
} from '../src/garden.js';

const main = () => {
    const garden = new Garden(new Map());
    console.log(garden);
};

(() => {
    main()
})();
