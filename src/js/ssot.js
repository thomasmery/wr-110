/**
 * 
 *      Reverse engineered Redux
 *      except it allows side effect :) 
 *      because the whole state is being sent to all the reducers on every dispatch
 */


export const createSingleSourceOfTruth = (initialState) => {

    let state = Object.assign({}, initialState);
    const reducers = [];
    const subscribers = [];

    const subscribe = (cb) => subscribers.push(cb);

    const dispatch = (action = {}) => {
        state = reducers.reduce( (state, reducer) => 
            reducer(state, action)
        , state);
      
        subscribers.forEach( (cb) => cb(state));
        
        localStorage.setItem('wr', JSON.stringify(state));
    };

    const useReducer = (...reducerList) => reducers.push(...reducerList);

    // only for debugging !
    const getState = () => state;

    //init on next tick
    setTimeout(dispatch, 0);

    return {
        useReducer,
        subscribe,
        dispatch,
        getState
    };
}