export const assertUnreachable = (x : never) : never => {
	throw new Error('Exhaustiveness check failed: ' + String(x));
};

export const mockedResult = (input : string) : string => {
	return 'Mocked result: ' + input;
};

//eslint-disable-next-line no-useless-escape
const ILLEGAL_FILE_CHARS = /[\/\?<>\\:\*\|"]/g;

//Returns a filename like input but with characters that are illegal on mac stripped out.
export const safeFileName = (input : string) : string => {
	return input.replace(ILLEGAL_FILE_CHARS, '_');
};