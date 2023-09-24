import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import { ZodError } from 'zod';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	Choice,
	seedData,
	SeedData,
	SeedDataIsh,
	SeedDataType,
	SeedDataTypes
} from '../../src/types.js';

import {
	changePropertyType,
	changeSeedType,
	EMPTY_PROPERTY_SHAPE,
	SeedShape,
	SHAPE_BY_SEED,
	shapeForSeed
} from '../../src/meta.js';

import {
	ObjectPath,
	CollapsedSeedMap,
	Prompter,
	PacketsBundle,
	EMPTY_PACKETS_BUNDLE,
	SeedSelector,
	EMPTY_SEED_SELECTOR
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	help,
	HelpStyles
} from './help-badges.js';

import {
	makePropertyChangedEvent,
	makePropertyCollapsedEvent,
	PropertyChangedEvent
} from '../events.js';

import './value-editor.js';

const defaultValueForSeedProperty = (shape : SeedShape, prop : string) : unknown => {
	const propValue = shape.arguments[prop] || shape.options[prop] || EMPTY_PROPERTY_SHAPE;
	return changePropertyType('', propValue.allowedTypes[0]);
};

type PathErrors = Partial<Record<keyof SeedData, string>>;

const errorsByPath = (data : SeedDataIsh, err : ZodError | null) : PathErrors  => {
	const result : PathErrors = {};
	if (!err) return result;
	for (const subErr of err.errors) {
		if (subErr.code == 'unrecognized_keys') {
			for (const key of subErr.keys) {
				result[key as keyof SeedData] = `${key} is not a legal property for this seed type`;
			}
			continue;
		}
		if (subErr.code == 'invalid_union') {
			//This is how validation errors for a sub-key show up.
			const key = subErr.path.slice(-1)[0] as keyof SeedData;
			//Is this for a missing required key, or an invalid existing key?
			if (key in data) {
				result[key] = subErr.message;
			} else {
				//It's not on the seedData yet (so it's likely a missing property), so stash it on type.
				const newMessage = `${key} is required for this seed type but was not provided`;
				result.type = (result.type) ? result.type + '\n' + newMessage : newMessage;
			}
			continue;
		}
		//TODO: One way to trigger one that I don't understand:
		// 1) Start off with default noop -> value at top level
		// 2) Within the value, make it a seed of type if.
		// 3) Inside the then statement, make it a seed of type noop.
		// 4) Inside the new noop, delete the `value`.
		console.error(`Unexpected subErr code: ${subErr.code}`);
		result.type = (result.type) ? result.type + '\n' + subErr.message : subErr.message;
	}
	return result;
};

@customElement('seed-editor')
export class SeedEditor extends LitElement {

	@property({type:Boolean})
		editable = false;

	@property({type:Object})
		seed? : SeedDataIsh;

	@property({type: Object})
		packets : PacketsBundle = EMPTY_PACKETS_BUNDLE;

	@property({type: Object})
		currentSeedSelector : SeedSelector = EMPTY_SEED_SELECTOR;

	@property({type: Object})
		collapsed? : CollapsedSeedMap;

	@property({type: Array})
		path: ObjectPath = [];

	@property({type: Object})
		prompter? : Prompter;

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
			HelpStyles
		];
	}

	get seedShape() : SeedShape {
		return shapeForSeed(this.seed);
	}

	override render() : TemplateResult {
		const seed = this.seed || {} as SeedData;
		const seedDataShape = this.seedShape;
		const collapsed = this.collapsed ? this.collapsed.collapsed : false;
		const pathErrors = errorsByPath(seed, this._errorForSeed());
		const legalKeys = [...Object.keys(seedDataShape.options), ...Object.keys(seedDataShape.arguments)];
		const missingKeys = legalKeys.filter(key => !(key in seed));
		const missingOptionsKeys = missingKeys.filter(key => key in seedDataShape.options);
		const missingArgumentsKeys = missingKeys.filter(key => key in seedDataShape.arguments);
		const missingArgumentsRequiredKeys = missingArgumentsKeys.filter(key => !seedDataShape.arguments[key].optional);
		const missingArgumentsOptionalKeys = missingArgumentsKeys.filter(key => seedDataShape.arguments[key].optional);

		//TODO: render the type drop down in the summary line instead of duplicating it

		return html`
		<details .open=${!collapsed}>
		<summary @click=${this._handleSummaryClicked}><strong class='label'>${this.seed ? this.seed.type : 'Seed'} ${help(seedDataShape.description)}</strong></summary>
		${TypedObject.keys(seed).map(prop => this._controlForProperty(prop, pathErrors))}
		${missingKeys.length ? html`<select .value=${''} @change=${this._handleAddKeyChanged} ?disabled=${!this.editable}>
		<option .value=${''} selected><em>Add a property...</em></option>
		${missingArgumentsRequiredKeys.map(key => html`<option .value=${key} .title=${seedDataShape.arguments[key]?.description || key}>${key} (required)</option>`)}
		${missingArgumentsOptionalKeys.map(key => html`<option .value=${key} .title=${seedDataShape.arguments[key]?.description || key}>${key}</option>`)}
		${missingArgumentsKeys.length && missingOptionsKeys.length ? html`<option disabled>_________</option>` : ''}
		${missingOptionsKeys.map(key => html`<option .value=${key} .title=${seedDataShape.options[key]?.description || key}>${key}</option>`)}
	</select>` : ''}
		</details>
		`;
	}

	_errorForSeed() : ZodError | null {
		if (!this.seed) return null;
		//TODO: cache this
		const safeParseResult = seedData.safeParse(this.seed);
		if (!safeParseResult.success) {
			return safeParseResult.error;
		}
		return null;
	}

	_warningForProperty(prop : keyof SeedData, err: PathErrors) : TemplateResult {
		if (err[prop]) {
			return help(err[prop] || '', true, true);
		}
		return html``;
	}

	_controlForProperty(prop : keyof SeedData, err : PathErrors) : TemplateResult {
		const subPath = [...this.path, prop];
		if (!this.seed) return html``;
		const subData = this.seed[prop];
		const subCollapsed = this.collapsed ? this.collapsed.seeds[prop] : undefined;

		let propShape = this.seedShape.options[prop] || this.seedShape.arguments[prop] || EMPTY_PROPERTY_SHAPE;
		let disallowTypeChange = false;
		let description = propShape.description || '';
		let hookTypeChangedEvent = false;

		if (prop == 'type') {
			propShape  = {
				optional: false,
				description: 'The type of the seed',
				multiLine: false,
				allowedTypes: ['string'],
				choices:  Object.entries(SHAPE_BY_SEED).map(entry => ({value:entry[0], description:entry[1].description})) as [Choice, ...Choice[]]
			};
			disallowTypeChange = true;
			description = 'The type of the seed, which defines its behavior';
			hookTypeChangedEvent = true;
		}

		const warning = this._warningForProperty(prop, err);

		return html`<div class='row'>
					<label>${prop} ${description ? help(description) : html``}${warning}</label>
					<value-editor
						.path=${subPath}
						.data=${subData}
						.collapsed=${subCollapsed}
						.disallowDelete=${disallowTypeChange}
						.disallowTypeChange=${disallowTypeChange}
						.propertyShape=${propShape}
						.editable=${this.editable}
						.prompter=${this.prompter}
						.packets=${this.packets}
						.currentSeedSelector=${this.currentSeedSelector}
						@property-changed=${hookTypeChangedEvent ? this._handleSubTypeChanged : this._handleNormalPropertyChanged}>
					</value-editor>
				</div>`;
	}

	_handleSummaryClicked(e : MouseEvent) {

		//Don't open/close the details/summary, we'll do it manually via re-rendering
		e.stopPropagation();
		e.preventDefault();

		const collapsed = this.collapsed ? this.collapsed.collapsed : false;
		this.dispatchEvent(makePropertyCollapsedEvent(this.path, !collapsed));
	}

	_handleNormalPropertyChanged() {
		//No op, just allow it to pass through.
	}

	_handleSubTypeChanged(e : PropertyChangedEvent) {
		//We'll replace this with our own event.
		e.stopPropagation();

		if (!this.seed) throw new Error('No seed');

		const rawType = String(e.detail.newValue);

		if (!SeedDataTypes.some(typ => typ == rawType)) throw new Error(`Not valid type: ${rawType}`);

		const newType = rawType as SeedDataType;

		const newData = changeSeedType(this.seed, newType);

		this.dispatchEvent(makePropertyChangedEvent(e.detail.path.slice(0, -1), newData));
	}

	_handleAddKeyChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not a select');
		const key = ele.value;
		ele.value = '';
		const defaultValue = defaultValueForSeedProperty(this.seedShape, key);
		this.dispatchEvent(makePropertyChangedEvent([...this.path, key], defaultValue));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-editor': SeedEditor;
	}
}
