
export type UndoableState<T> = {
	current: number,
	//The most recent head is at 0.
	//Don't allow states to be empty
	states: [T, ...T[]]
};

export const currentState = <T>(undoState : UndoableState<T>) : T => {
	const subState = undoState.states[undoState.current];
	if (subState === undefined) throw new Error('No such state');
	return subState;
};

export const mayUndo = <T>(undoState : UndoableState<T>) : boolean => {
	return undoState.current < (undoState.states.length - 1);
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

export const pushState = <T>(undoState : UndoableState<T>, state : T): UndoableState<T> => {
	//Lop off any states before the current one, since we're now doing a new history forward.
	const currentStates = undoState.states.slice(undoState.current);
	return {
		...undoState,
		current: 0,
		states: [state, ...currentStates]
	};
};