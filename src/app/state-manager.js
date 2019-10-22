import { createSingleSourceOfTruth } from './ssot.js';
import { initialState } from './initial-state.js';
import stepReducer, { 
    patternSelectReducer,
    instrumentSelectReducer,
    faderReducer,
    potReducer,
    transportReducer,
    tempoReducer
} from './reducers.js';


// Create SSOT
const stateManager = createSingleSourceOfTruth(initialState);

// use reducers
stateManager.useReducer(
    stepReducer,
    patternSelectReducer,
    instrumentSelectReducer,
    faderReducer,
    potReducer,
    transportReducer,
    tempoReducer
);

// test reducers
const tempoReducerTest = tempoReducer({tempo: 100}, {type: "tempoChange", value: 10});
console.assert(tempoReducerTest.tempo == 100.5, tempoReducerTest);

export default stateManager;