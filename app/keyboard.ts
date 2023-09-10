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
	key : keyboardKey,
});

export type KeyboardShortcut = z.infer<typeof keyboardShortcut>;

//TODO: actually calculate this with useragent sniffing or something.
const IS_MAC = true;

export const eventMatchesShortcut = (e : KeyboardEvent, shortcut : KeyboardShortcut) : boolean => {

	const shortcutCtrlKey = shortcut.command ? (IS_MAC ? false : true) : Boolean(shortcut.ctrl);
	const shortcutMetaKey = shortcut.command ? (IS_MAC ? true : false) : Boolean(shortcut.meta);

	if (shortcutCtrlKey != e.ctrlKey) return false;
	if (shortcutMetaKey != e.metaKey) return false;
	if (Boolean(shortcut.shift) != e.shiftKey) return false;

	return e.key == shortcut.key;
};