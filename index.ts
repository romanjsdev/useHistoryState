import React, { useReducer, useCallback } from 'react';

export const useHistoryState = <T>(value: T, size = 20) => {
  interface IState {
    past: T[];
    present: T;
    future: T[];
  }

  enum ActionType {
    SET = 'SET',
    SET_NOT_UNDOABLE = 'SET_NOT_UNDOABLE',
    UNDO = 'UNDO',
    REDO = 'REDO',
    RESET = 'RESET',
  }

  type Action = {
    type: ActionType.SET | ActionType.SET_NOT_UNDOABLE;
    payload: T;
  };

  type ActionWithoutPayload = {
    type: ActionType.UNDO | ActionType.REDO | ActionType.RESET;
  };

  type ArgF = (state: T) => T;
  type Arg = T | ArgF;

  const isFunc = (arg: Arg): arg is ArgF => {
    return typeof arg === 'function';
  };

  type UseHistoryState = [
    T,
    (payload: Arg, notUndoAble?: boolean) => void,
    {
      canUndo: boolean;
      canRedo: boolean;
      undo: () => void;
      redo: () => void;
      reset: () => void;
    },
  ];

  const initState: IState = {
    past: [],
    present: value,
    future: [],
  };

  const reducer = (
    state: IState,
    action: Action | ActionWithoutPayload,
  ): IState => {
    switch (action.type) {
      case ActionType.SET:
        return {
          ...state,
          past: [...state.past.slice(-size), state.present],
          present: action.payload,
        };
      case ActionType.SET_NOT_UNDOABLE:
        return {
          ...state,
          present: action.payload,
        };
      case ActionType.UNDO:
        return {
          past: state.past.slice(0, state.past.length - 1),
          present: state.past[state.past.length - 1],
          future: [...state.future, state.present],
        };
      case ActionType.REDO:
        return {
          past: [...state.past.slice(size), state.present],
          present: state.future[state.future.length - 1],
          future: state.future.slice(0, state.future.length - 1),
        };

      case ActionType.RESET:
        return initState;
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, initState);

  const canUndo = !!state.past.length;
  const canRedo = !!state.future.length;

  const setState = useCallback((payload: Arg, notUndoAble = false) => {
    const newState = isFunc(payload) ? payload(state.present) : payload;
    const type = notUndoAble ? ActionType.SET_NOT_UNDOABLE : ActionType.SET;
    dispatch({ type, payload: newState });
  }, []);

  const undo = useCallback(() => {
    if (canUndo) {
      dispatch({ type: ActionType.UNDO });
    } else {
      throw new Error('Undo not allowed');
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      dispatch({ type: ActionType.REDO });
    } else {
      throw new Error('Redo not allowed');
    }
  }, [canRedo]);

  const reset = useCallback(() => dispatch({ type: ActionType.RESET }), []);

  return [
    state.present,
    setState,
    {
      canUndo,
      canRedo,
      undo,
      redo,
      reset,
    },
  ] as UseHistoryState;
};
