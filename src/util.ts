export const assertUnreachable = (x : never) : never => {
	throw new Error('Exhaustiveness check failed: ' + String(x));
};