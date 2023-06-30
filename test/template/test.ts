/*eslint-env node*/
import {
	Template
} from '../../src/template.js';

import assert from 'assert';

describe('Template', () => {
	it('noop', async () => {
		const input = '';
		const template = new Template(input);
		const actual = template.render({});
		const golden = '';
		assert.deepStrictEqual(actual, golden);
	});

	it('No replacements', async () => {
		const input = 'Hello, world';
		const template = new Template(input);
		const actual = template.render({});
		const golden = 'Hello, world';
		assert.deepStrictEqual(actual, golden);
	});

	it('One straightforward replacement', async () => {
		const input = 'Hello, {{name}}';
		const template = new Template(input);
		const vars = {
			name: 'world'
		};
		const actual = template.render(vars);
		const golden = 'Hello, world';
		assert.deepStrictEqual(actual, golden);
	});

	it('One straightforward replacement with whitespace', async () => {
		const input = 'Hello, {{ name	}}';
		const template = new Template(input);
		const vars = {
			name: 'world'
		};
		const actual = template.render(vars);
		const golden = 'Hello, world';
		assert.deepStrictEqual(actual, golden);
	});

	it('Two straightforward replacements', async () => {
		const input = 'Hello, {{name}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			name: 'world',
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, world it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Extra var is ignored', async () => {
		const input = 'Hello, {{name}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			name: 'world',
			day: 'Tuesday',
			unnecessary: 'shouldn\'t complain',
		};
		const actual = template.render(vars);
		const golden = 'Hello, world it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Missing closing braces', async () => {
		const input = 'Hello, {{name it\'s {{day}}';
		assert.throws(() => {
			new Template(input);
		});
	});

	it('Missing opening braces', async () => {
		const input = 'Hello, name}} it\'s {{day}}';
		assert.throws(() => {
			new Template(input);
		});
	});

	it('Missing var at render', async () => {
		const input = 'Hello, {{name}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			name: 'world',
		};
		assert.throws(() => {
			template.render(vars);
		});
	});

});

