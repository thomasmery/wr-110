import { constrain } from './helpers.js';
import constants from './constants.js';

/**
 * 
 *      Reducers 
 * 
 */

export default (state, action) => {
    const { instrument, pattern } = state;
    const { stepNum, currentStep } = action;
    switch (action.type) {
        case "stepToggle":
            state.sequences[pattern][instrument][stepNum] = state.sequences[pattern][instrument][stepNum] ? 0 : 1;
            return state;
        case "setCurrentStep":
            state.currentStep = currentStep;
            return state;
        default: return state;
    }
};
export const patternSelectReducer = (state, action) => {
    const { type, patternNum } = action;
    switch (type) {
        case "patternSelect":
            state.pattern = patternNum;
            return state;
        default: return state;
    }
}
export const instrumentSelectReducer = (state, action) => {
    const { type, instrumentNum } = action;
    switch (type) {
        case "instrumentSelect":
            state.instrument = instrumentNum;
            return state;
        default: return state;
    }
}
export const faderReducer = (state, action) => {
    const { type, num, value } = action;
    switch (type) {
        case "fadermove":
            state.faders[num] = constrain(state.faders[num] + value, 0, 1);
            return state;
        default: return state;
    }
}
export const potReducer = (state, action) => {
    const { type, value, trackNum, potNum } = action;
    switch (type) {
        case "potmove":
            const change = value * 0.005;
            state.params[trackNum][potNum] = constrain(state.params[trackNum][potNum] + change, 0, 1);
            return state;
        default: return state;
    }
}
export const transportReducer = (state, action) => {
    const {type} = action;
    switch (type) {
        case "play":
            state.playing = true;
            return state;
        case "record":
            state.recording = !state.recording;
            return state;
        case "stop":
            state.playing = false;
            state.recording = false;
            return state;
        case "playstop":
            if (state.playing) {
                state.playing = false;
                state.recording = false;
            } else {
                state.playing = true;
            }
            return state;
        default: return state;
    }
}
export const tempoReducer = (state, action) => {
    const { type, value } = action;
    switch (type) {
        case "tempoDecrease":
            state.tempo -= 1;
            return state;
        case "tempoIncrease":
            state.tempo += 1;
            return state;
        case "tempoChange":
            const change = value * 0.05;
            state.tempo += change;
            state.tempo = constrain(state.tempo, constants.TEMPO_MIN, constants.TEMPO_MAX);
            return state;
        default: return state;
    }
}