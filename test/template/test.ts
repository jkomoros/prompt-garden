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

	it('Missing opening braces', async () => {
		const input = 'Hello, name}} it\'s {{day}}';
		assert.throws(() => {
			new Template(input);
		});
	});

	it('Illegal name in var', async () => {
		const input = 'Hello, {{ name# }} it\'s {{day}}';
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

	it('An unknown modifier type throws', async () => {
		const input = 'Hello, {{name|unknown}} it\'s {{day}}';
		assert.throws(() => {
			new Template(input);
		});
	});

	it('Default value', async () => {
		const input = 'Hello, {{name|default:\'Alex\'}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, Alex it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Empty Default value', async () => {
		const input = 'Hello, {{name|default:\'\'}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello,  it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Default value with double quotes is allowed', async () => {
		const input = 'Hello, {{name|default:"Alex"}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, Alex it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Default value with no quotes throws', async () => {
		const input = 'Hello, {{name|default:Alex}} it\'s {{day}}';
		assert.throws(() => {
			new Template(input);
		});
	});

	it('Default value including a }} in a string is OK', async () => {
		const input = 'Hello, {{name|default:\'Alex }}\'}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, Alex }} it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Default value including a {{ in a string is OK', async () => {
		const input = 'Hello, {{name|default:\'Alex {{\'}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, Alex {{ it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Default value including a | in a string is OK', async () => {
		const input = 'Hello, {{name|default:\'Alex |\'}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, Alex | it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Default value including a : in a string is OK', async () => {
		const input = 'Hello, {{name|default:\'Alex :\'}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, Alex : it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Escaped double quote OK', async () => {
		const input = 'Hello, {{name|default:"Alex\\" "}} it\'s {{day}}';
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		const golden = 'Hello, Alex"  it\'s Tuesday';
		assert.deepStrictEqual(actual, golden);
	});

	it('Escaped single quote OK', async () => {
		//eslint-disable-next-line quotes
		const input = "Hello, {{name|default:'Alex\\' '}} it's {{day}}";
		const template = new Template(input);
		const vars = {
			day: 'Tuesday'
		};
		const actual = template.render(vars);
		//eslint-disable-next-line quotes
		const golden = "Hello, Alex'  it's Tuesday";
		assert.deepStrictEqual(actual, golden);
	});
});

describe('template.extract', () => {

	it('noop', async () => {
		const template = 'Blammo';
		const t = new Template(template);
		const input = 'Blammo';
		const actual = t.extract(input);
		const golden = {};
		assert.deepStrictEqual(actual, golden);
	});

	it('simple', async () => {
		const template = 'Hi {{name}}, it\'s {{day}}';
		const t = new Template(template);
		const input = 'Hi Alex, it\'s Tuesday';
		const actual = t.extract(input);
		const golden = {
			name: 'Alex',
			day: 'Tuesday'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('simple no match', async () => {
		const template = 'Hi {{name}}, NOT it\'s {{day}}';
		const t = new Template(template);
		const input = 'Hi Alex, it\'s Tuesday';
		assert.throws(() => {
			t.extract(input);
		});
	});

	it('Special characters in the pattern', async () => {
		const template = 'Hi **{{name}}*?, it\'s {{day}}';
		const t = new Template(template);
		const input = 'Hi **Alex*?, it\'s Tuesday';
		const actual = t.extract(input);
		const golden = {
			name: 'Alex',
			day: 'Tuesday'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('Optional in the pattern no default', async () => {
		const template = 'Hi *{{name|optional}}*, it\'s {{day}}';
		const t = new Template(template);
		const input = 'Hi **, it\'s Tuesday';
		const actual = t.extract(input);
		const golden = {
			day: 'Tuesday'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('Optional in the pattern with default', async () => {
		const template = 'Hi *{{name|optional|default:\'Alex\'}}*, it\'s {{day}}';
		const t = new Template(template);
		const input = 'Hi **, it\'s Tuesday';
		const actual = t.extract(input);
		const golden = {
			name: 'Alex',
			day: 'Tuesday'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('int modifier', async () => {
		const template = 'Your age is {{age|int}}, OK?';
		const t = new Template(template);
		const input = 'Your age is 5, OK?';
		const actual = t.extract(input);
		const golden = {
			age: 5
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('int modifier with default and optional', async () => {
		const template = 'Your age is {{age|int|default:\'3\'|optional}}, OK?';
		const t = new Template(template);
		const input = 'Your age is , OK?';
		const actual = t.extract(input);
		const golden = {
			age: 3
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('float modifier for int', async () => {
		const template = 'Your age is {{age|float}}, OK?';
		const t = new Template(template);
		const input = 'Your age is 5, OK?';
		const actual = t.extract(input);
		const golden = {
			age: 5
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('float modifier', async () => {
		const template = 'Your age is {{age|float}}, OK?';
		const t = new Template(template);
		const input = 'Your age is 5.2, OK?';
		const actual = t.extract(input);
		const golden = {
			age: 5.2
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('float modifier with default and optional', async () => {
		const template = 'Your age is {{age|float|default:\'3.2\'|optional}}, OK?';
		const t = new Template(template);
		const input = 'Your age is , OK?';
		const actual = t.extract(input);
		const golden = {
			age: 3.2
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('boolean modifier', async () => {
		const template = 'You are included: {{included|boolean}}, OK?';
		const t = new Template(template);
		const input = 'You are included: true, OK?';
		const actual = t.extract(input);
		const golden = {
			included: true
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('loop parses', async () => {
		const template = '{{ @loop|foo}}Your name is {{name}}{{ @end}}';
		assert.doesNotThrow(() => {
			new Template(template);
		});
	});

	it('nested loop parses', async () => {
		const template = '{{ @loop|foo}}{{ @loop|bar}}Your name is {{name}}{{ @end}}{{ @end}}';
		assert.doesNotThrow(() => {
			new Template(template);
		});
	});
});