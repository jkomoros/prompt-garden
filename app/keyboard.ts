import {
	z
} from 'zod';

//This is a partial enumeration of real values browsers return for
//KeyboardEvent.key (which Typescript types just as string)
const keyboardKey = z.enum([
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
	'Enter'
]);

const keyboardShortcut = z.object({
	//This means 'meta on Mac, Ctrl everywhere else'
	command : z.boolean().optional(),
	meta: z.boolean().optional(),
	ctrl: z.boolean().optional(),
	shift: z.boolean().optional(),
	//Unless this is true, then when textEditingActive is true, the shortcut
	//will not match by default.
	allowWhileEditing: z.boolean().optional(),
	key : keyboardKey,
});

export type KeyboardShortcut = z.infer<typeof keyboardShortcut>;

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
	if (Boolean(shortcut.shift) != e.shiftKey) return false;

	return e.key == shortcut.key;
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

//Returns false unless a control is focused that has text editing or other
//keyboard navigation.
const textEditingActive = () : boolean => {
	//TODO: rename to textEditingActive.
	const ele = activeLeafElement();
	if (ele instanceof HTMLInputElement) {
		if (NON_TEXTUAL_INPUT_TYPES[ele.type]) return false;
		return true;
	}
	if (ele instanceof HTMLTextAreaElement) {
		return true;
	}
	if (ele instanceof HTMLElement) {
		if (ele.isContentEditable) return true;
		return false;
	}
	return false;
};

//TODO: make a shortcutString function to generate things like ⌘-⌃-F

//TODO: allow mainView to pass a map of commands to shortcut, which if provided will be there