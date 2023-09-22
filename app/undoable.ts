
type Version<T> = {
	data: T,
	description: string
};

export type UndoableState<T> = {
	current: number,
	//The most recent head is at 0.
	//Don't allow states to be empty
	versions: [Version<T>, ...Version<T>[]]
};

export const initialVersion = <T>(initialVersion : T, description : string): UndoableState<T> => {
	return {
		current: 0,
		versions: [{
			data: initialVersion,
			description
		}]
	};
};

export const currentVersion = <T>(undoState : UndoableState<T>) : T => {
	const subState = undoState.versions[undoState.current];
	if (subState === undefined) throw new Error('No such state');
	return subState.data;
};

export const currentVersionDescription = <T>(undoState : UndoableState<T>) : string => {
	const subState = undoState.versions[undoState.current];
	if (subState === undefined) throw new Error('No such state');
	return subState.description;
};

//Not exactly an alias of currentVersionDescription because it will return undefined if nothing to undo.
export const undoVersionDescription = <T>(undoState : UndoableState<T>): string | undefined => {
	if (!mayUndo(undoState)) return undefined;
	return currentVersionDescription(undoState);
};

export const redoVersionDescription = <T>(undoState : UndoableState<T>) : string | undefined => {
	if (!mayRedo(undoState)) return undefined;
	const subState = undoState.versions[undoState.current + 1];
	if (subState === undefined) throw new Error('Unexpected no redo state');
	return subState.description;
};

export const mayUndo = <T>(undoState : UndoableState<T>) : boolean => {
	return undoState.current < (undoState.versions.length - 1);
};

export const mayRedo = <T>(undoState : UndoableState<T>) : boolean => {
	return undoState.current > 0;
};

export const undo = <T>(undoState : UndoableState<T>) : UndoableState<T> => {
	if (!mayUndo(undoState)) throw new Error('Not allowed to undo');
	return {
		...undoState,
		current: undoState.current + 1
	};
};

export const redo = <T>(undoState : UndoableState<T>): UndoableState<T> => {
	if (!mayRedo(undoState)) throw new Error('Not allowed to redo');
	return {
		...undoState,
		current: undoState.current - 1
	};
};

export const pushVersion = <T>(undoState : UndoableState<T>, state : T, description: string): UndoableState<T> => {
	//Lop off any states before the current one, since we're now doing a new history forward.
	const currentVersions = undoState.versions.slice(undoState.current);
	const version : Version<T> = {
		data: state,
		description
	};
	return {
		...undoState,
		current: 0,
		versions: [version, ...currentVersions]
	};
};