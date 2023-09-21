import {
	z
} from 'zod';

//This is a partial enumeration of real values browsers return for
//KeyboardEvent.key (which Typescript types just as string)
const keyboardKey = z.enum([
	//TODO: support punctuation.
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'h',
	'i',
	'j',
	'k',
	'l',
	'm',
	'n',
	'o',
	'p',
	'q',
	'r',
	's',
	't',
	'u',
	'v',
	'w',
	'x',
	'y',
	'z',
	'0',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	' ',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Enter',
	'Escape',
	'Tab'
]);

type KeyboardKey = z.infer<typeof keyboardKey>;

export const keyboardShortcut = z.object({
	//This means 'meta on Mac, Ctrl everywhere else'
	command : z.boolean().optional(),
	meta: z.boolean().optional(),
	ctrl: z.boolean().optional(),
	shift: z.boolean().optional(),
	alt: z.boolean().optional(),
	//Unless this is true, then when textEditingActive is true, the shortcut
	//will not match by default.
	allowWhileEditing: z.boolean().optional(),
	key : keyboardKey,
});

export type KeyboardShortcut = z.infer<typeof keyboardShortcut>;

const keyboardShortcutsMap = z.record(z.string(), keyboardShortcut);

export type KeyboardShortcutsMap = z.infer<typeof keyboardShortcutsMap>;

const keyboardAction = z.object({
	shortcut: keyboardShortcut,
	action : z.function(z.tuple([]), z.void()),
	//By default an action that is matched will stop bubbling. But if this is
	//true, then it will continue.
	continue: z.boolean().optional()
});

const keyboardActions = z.array(keyboardAction);

export type KeyboardActions = z.infer<typeof keyboardActions>;

export const killEvent = (e : Event) => {
	e.preventDefault();
	e.stopPropagation();
};

const IS_MAC = navigator.platform.indexOf('Mac') != -1;

const effectiveCtrlMeta = (shortcut : KeyboardShortcut) : [ctrlKey : boolean, metaKey : boolean] => {
	const shortcutCtrlKey = shortcut.command ? (IS_MAC ? false : true) : Boolean(shortcut.ctrl);
	const shortcutMetaKey = shortcut.command ? (IS_MAC ? true : false) : Boolean(shortcut.meta);
	return [shortcutCtrlKey, shortcutMetaKey];
};

export const eventMatchesShortcut = (e : KeyboardEvent, shortcut : KeyboardShortcut) : boolean => {

	if (!shortcut.allowWhileEditing && textEditingActive()) return false;

	const [shortcutCtrlKey, shortcutMetaKey] = effectiveCtrlMeta(shortcut);

	if (shortcutCtrlKey != e.ctrlKey) return false;
	if (shortcutMetaKey != e.metaKey) return false;
	if (Boolean(shortcut.alt) != e.altKey) return false;
	if (Boolean(shortcut.shift) != e.shiftKey) return false;

	//We store all letter strings in lower case but the keyboard event might
	//have a or A depending on if the shfit key is pressed. Note that if
	//CapsLock is on, you can get 'A' without shiftKey being true.
	return e.key.toLocaleLowerCase() == shortcut.key.toLocaleLowerCase();
};

//Takes a set of actions and executes the action of the first one that matches. Returns true if any action was executed.
export const executeKeyboardAction = (e : KeyboardEvent, actions: KeyboardActions) : boolean => {
	for (const action of actions) {
		if (eventMatchesShortcut(e, action.shortcut)) {
			action.action();
			if (!action.continue) killEvent(e);
			return true;
		}
	}
	return false;
};

//Eyeballing the list of
//https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types
//that appear to not have keyboard shortcuts 
const NON_TEXTUAL_INPUT_TYPES : {[type : string] : true} = {
	'button': true,
	'checkbox': true,
	'color': true,
	'file': true,
	'hidden': true,
	'image': true,
	'radio': true,
	'range': true,
	'submit': true
};

const activeLeafElement = () : Element | null => {
	let ele = document.activeElement;
	if (!ele) return null;
	while (ele && ele.shadowRoot && ele.shadowRoot.activeElement) {
		ele = ele.shadowRoot.activeElement;
	}
	return ele;
};

//Returns false unless a text control is focused that has multi-line text
//editing (that is, where <enter> does something).
export const multiLineTextEditingActive = () : boolean => {
	const ele = activeLeafElement();
	if (ele instanceof HTMLTextAreaElement) {
		return true;
	}
	if (ele instanceof HTMLElement) {
		if (ele.isContentEditable) return true;
		return false;
	}
	return false;
};

//Returns false unless a control is focused that has text editing or other
//keyboard navigation.
const textEditingActive = () : boolean => {
	const ele = activeLeafElement();
	if (ele instanceof HTMLInputElement) {
		if (NON_TEXTUAL_INPUT_TYPES[ele.type]) return false;
		return true;
	}
	return multiLineTextEditingActive();
};

const SHORTCUT_KEY_STRINGS : {[key in KeyboardKey]: string | [mac: string, other: string]} = {
	' ': ['␣', 'Space'],
	'0': '0',
	'1': '1',
	'2': '2',
	'3': '3',
	'4': '4',
	'5': '5',
	'6': '6',
	'7': '7',
	'8': '8',
	'9': '9',
	'a': 'A',
	'b': 'B',
	'c': 'C',
	'd': 'D',
	'e': 'E',
	'f': 'F',
	'g': 'G',
	'h': 'H',
	'i': 'I',
	'j': 'J',
	'k': 'K',
	'l': 'L',
	'm': 'M',
	'n': 'N',
	'o': 'O',
	'p': 'P',
	'q': 'Q',
	'r': 'R',
	's': 'S',
	't': 'T',
	'u': 'U',
	'v': 'V',
	'w': 'W',
	'x': 'X',
	'y': 'Y',
	'z': 'Z',
	'ArrowDown': '↓',
	'ArrowLeft': '←',
	'ArrowRight': '→',
	'ArrowUp': '↑',
	'Enter': '↩',
	'Escape': ['⎋', 'Esc'],
	'Tab': ['⇥', 'Tab']
};

const shortcutKeyDisplayString = (key : KeyboardKey) : string => {
	const config = SHORTCUT_KEY_STRINGS[key];
	if (typeof config == 'string') {
		return config;
	} 
	return IS_MAC ? config[0] : config[1];
};

//Returns a string like ⌘F, or '' if there is no shortcut.
export const shortcutDisplayString = (shortcut? : KeyboardShortcut) : string => {
	if (!shortcut) return '';
	const [ctrl, meta] = effectiveCtrlMeta(shortcut);
	const modifiers : string[] = [];
	if (shortcut.shift) modifiers.push(IS_MAC ? '⇧' : 'Shift');
	if (ctrl) modifiers.push(IS_MAC ? '^' : 'Ctrl');
	if (meta) modifiers.push(IS_MAC ? '⌘' : 'Meta');
	if (shortcut.alt) modifiers.push(IS_MAC ? '⌥' : 'Alt');

	//Push an empty modifier for combining with the key.
	modifiers.push('');

	return modifiers.join(IS_MAC ? ' ' : '-') + shortcutKeyDisplayString(shortcut.key);
};