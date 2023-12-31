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

	it('loop parses', async () => {
		const template = '{{ @loop:foo}}Your name is {{name}}{{ @end}}';
		assert.doesNotThrow(() => {
			new Template(template);
		});
	});

	it('loop with suffix parses', async () => {
		const template = '{{ @loop:foo}}Your name is {{name}}. {{ @end}}';
		assert.doesNotThrow(() => {
			new Template(template);
		});
	});

	it('nested loop parses', async () => {
		const template = '{{ @loop:foo}}{{ @loop:bar}}Your name is {{name}}{{ @end}}{{ @end}}';
		assert.doesNotThrow(() => {
			new Template(template);
		});
	});

	it('loop with unterminated loops fails to parse', async () => {
		const template = '{{ @loop:foo}}Your name is {{name}}{{ end}}';
		assert.throws(() => {
			new Template(template);
		});
	});

	it('loop with extra end fails to parse', async () => {
		const template = '{{ loop}}Your name is {{name}}{{ @end}}';
		assert.throws(() => {
			new Template(template);
		});
	});

	it('loop with modifiers on @loop fails to parse', async () => {
		const template = '{{ @loop:foo|optional}}Your name is {{name}}{{ @end}}';
		assert.throws(() => {
			new Template(template);
		});
	});

	it('loop with no name fails to parse', async () => {
		const template = '{{ @loop }}Your name is {{name}}{{ @end}}';
		assert.throws(() => {
			new Template(template);
		});
	});

	it('loop with name on end fails to parse', async () => {
		const template = '{{ @loop:foo }}Your name is {{name}}{{ @end|bar}}';
		assert.throws(() => {
			new Template(template);
		});
	});

	it('renders loop', async () => {
		const template = '{{ @loop:foo}}Your name is {{name}}. {{ @end}}';
		const t = new Template(template);
		const actual = t.render({
			foo: [
				{
					name: 'Alex',
				},
				{
					name: 'Daniel'
				}
			]
		});
		const golden = 'Your name is Alex. Your name is Daniel. ';
		assert.deepStrictEqual(actual, golden);
	});

	it('renders nested loop', async () => {
		const template = '{{ @loop:foo}}{{ @loop:bar}}Your name is {{name}}. {{ @end}}{{ @end}}';
		const t = new Template(template);
		const actual = t.render({
			foo: [
				{
					bar: [
						{
							name: 'Alex',
						},
						{
							name: 'Daniel'
						}
					]
				},
				{
					bar: [
						{
							name: 'Adeline',
						},
						{
							name: 'Thomas'
						}
					]
				}
			]
		});
		const golden = 'Your name is Alex. Your name is Daniel. Your name is Adeline. Your name is Thomas. ';
		assert.deepStrictEqual(actual, golden);
	});

	it('default and choice mismatch fails to parse', () => {
		const template = '{{name|default:"foo"|choice:"bar"|choice:"baz"}}';
		assert.throws(() => {
			new Template(template);
		});
	});

	it('choices fails to render when given invalid choice', () => {
		const template = '{{name|choice:"bar"|choice:"baz"}}';
		const input = {
			name: 'foo'
		};
		const t = new Template(template);
		assert.throws(() => {
			t.render(input);
		});
	});

	it('choices with valid default renders when not given value', () => {
		const template = '{{name|default:"bar"|choice:"bar"|choice:"baz"}}';
		const input = {};
		const t = new Template(template);
		const actual = t.render(input);
		const golden = 'bar';
		assert.deepStrictEqual(actual, golden);
	});
	
	it('ignore var name dropped in rendering', () => {
		const template = 'foo{{ _|int}}';
		const input = {};
		const t = new Template(template);
		const actual = t.render(input);
		const golden = 'foo';
		assert.deepStrictEqual(actual, golden);
	});

	it('pattern with greedy quantifiers does not parse', () => {
		const template = '{{name|pattern:"\\d*"}}';
		assert.throws(() => {
			new Template(template);
		});
	});

	it('json rendering', () => {
		const template = '{{foo|json}}';
		const input = {
			foo: {
				a: 1,
				b: [
					2,
					3
				]
			}
		};
		const t = new Template(template);
		const actual = t.render(input);
		const golden = `{
	"a": 1,
	"b": [
		2,
		3
	]
}`;
		assert.deepStrictEqual(actual, golden);
	});

	it('template that uses a dotted property name', () => {
		const template = 'foo{{ a.b|int}}';
		const input = {
			a: {
				b: 3
			}
		};
		const t = new Template(template);
		const actual = t.render(input);
		const golden = 'foo3';
		assert.deepStrictEqual(actual, golden);
	});

	it('template with a loop that uses a dotted property name', () => {
		const template = '{{ @loop:bar}}foo{{ a.b|int}}{{@end}}';
		const input = {
			bar: [
				{
					a: {
						b: 3
					}
				}
			]
		};
		const t = new Template(template);
		const actual = t.render(input);
		const golden = 'foo3';
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

	it('extract within a loop', async () => {
		const template = '{{ @loop:foo}}Your name is {{name}}. {{ @end}}';
		const t = new Template(template);
		const input = 'Your name is Alex. Your name is Daniel. ';
		const actual = t.extract(input);
		const golden = {
			foo: [
				{
					name: 'Alex'
				},
				{
					name: 'Daniel'
				}
			]
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('extract within a loop with a number outside the loop', async () => {
		const template = 'Hello {{number|int}} people! {{ @loop:foo}}Your name is {{name}}. {{ @end}}';
		const t = new Template(template);
		const input = 'Hello 22 people! Your name is Alex. Your name is Daniel. ';
		const actual = t.extract(input);
		const golden = {
			number: 22,
			foo: [
				{
					name: 'Alex'
				},
				{
					name: 'Daniel'
				}
			]
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('extract within a doubly-nested loop', async () => {
		const template = '{{ @loop:foo}}Foo {{@loop:bar}}Your name is {{name}}. {{@end}}{{ @end}}';
		const t = new Template(template);
		const input = 'Foo Your name is Alex. Your name is Daniel. Foo Your name is Adeline. ';
		const actual = t.extract(input);
		const golden = {
			foo: [
				{
					bar: [
						{
							name: 'Alex'
						},
						{
							name: 'Daniel'
						}
					]
				},
				{
					bar: [
						{
							name: 'Adeline'
						}
					]
				}
			]
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('extract within a loop with a default inside', async () => {
		const template = '{{ @loop:foo}}Your name is {{name|default:"Adeline"|optional}}. {{ @end}}';
		const t = new Template(template);
		const input = 'Your name is Alex. Your name is . ';
		const actual = t.extract(input);
		const golden = {
			foo: [
				{
					name: 'Alex'
				},
				{
					name: 'Adeline'
				}
			]
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('choices extracts out a choice', () => {
		const template = '{{name|choice:"bar"|choice:"baz"}}';
		const input = 'bar';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			name: 'bar'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('choices with a default extracts out a choice', () => {
		const template = 'foo{{name|optional|default:"bar"|choice:"bar"|choice:"baz"}}';
		const input = 'foo';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			name: 'bar'
		};
		assert.deepStrictEqual(actual, golden);
	});
	
	it('ignore var dropped in extract', () => {
		const template = 'foo{{ _|int}}';
		const input = 'foo342';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {};
		assert.deepStrictEqual(actual, golden);
	});

	it('dotted property extract works', () => {
		const template = 'foo{{ a.b|int}}';
		const input = 'foo342';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			a: {
				b: 342
			}
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('dotted property extract in loop works', () => {
		const template = '{{ @loop:bar}}foo{{ a.b|int}}{{@end}}';
		const input = 'foo342';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			bar: [
				{
					a: {
						//TODO: this ideally would be 342.
						b: 3
					}
				}
			]
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('dotted property with default extract works', () => {
		const template = 'foo{{ a.b|default:"342"}}';
		const input = 'foo';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			a: {
				b: '342'
			}
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('pattern modifier', () => {
		const template = 'foo{{name|pattern:"\\d+?"}}';
		const input = 'foo342';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			name: '342'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('whitespace modifier', () => {
		const template = 'foo{{_|whitespace}}bar';
		const input = 'foo\t bar';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {};
		assert.deepStrictEqual(actual, golden);
	});

	it('whitespace modifier in a loop', () => {
		//TODO: shouldn't we have to have a whitespace absorber at the end?
		const template = '{{ @loop:bar }}foo{{_|whitespace}}{{name}}{{_|whitespace}}bar{{ @end }}';
		const input = 'foo\t Alex  bar foo Daniel  bar';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			bar: [
				{
					name: 'Alex'
				},
				{
					name: 'Daniel'
				}
			]
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('json modifier full text multi-line', () => {
		const template = '{{foo|json}}';
		const input = `{
	"a": 1,
	"b":[
		2,
		3
	]
}`;
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			foo: {
				a: 1,
				b: [
					2,
					3
				]
			}
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('json modifier', () => {
		const template = 'foo {{foo|json}} bar';
		const input = 'foo {"a": 1, "b":[2,3]} bar';
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			foo: {
				a: 1,
				b: [
					2,
					3
				]
			}
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('Multi-line extract', () => {
		const template = 'Title:\n{{title}}\nContent:\n{{content}}';
		const input = `Title:
This is the title.
Content:
This is the content.
It might go on for two sentences.
`;
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			title: 'This is the title.',
			content: 'This is the content.\nIt might go on for two sentences.\n'
		};
		assert.deepStrictEqual(actual, golden);
	});

	it('Multi-line looping extract', () => {
		const template = '{{ @loop:lines }}{{line}}\n{{ @end }}';
		const input = `1. A line
2. Also a line
`;
		const t = new Template(template);
		const actual = t.extract(input);
		const golden = {
			lines: [
				{
					line: '1. A line',
				},
				{
					line: '2. Also a line'
				}
			]
		};
		assert.deepStrictEqual(actual, golden);
	});

});