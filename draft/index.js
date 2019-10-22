const constants = {
    TEMPO_MIN: 30,
    TEMPO_MAX: 240
}



// transport with space bar
document.addEventListener('keydown', e => {
    if (e.keyCode == 32) {
        stateManager.dispatch({
            type: "playstop"
        })
    }
});

/**
 * 
 *      Reverse engineered Redux
 *      except it allows side effect :) 
 *      because the whole state is being sent to all the reducers on every dispatch
 */

const createSingleSourceOfTruth = (initialState) => {

    let state = Object.assign({}, initialState);
    const reducers = [];
    const subscribers = [];

    const subscribe = (cb) => subscribers.push(cb);

    const dispatch = (action = {}) => {
        state = reducers.reduce( (state, reducer) => 
            reducer(state, action)
        , state);
      
        subscribers.forEach( (cb) => cb(state));
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

/**
 * 
 *  INITIAL STATE 
 * 
 */

// seqences[pattern][track][step]

const initialState = {
    sequences: Array(8).fill().map( (_, patternNum) => 
            Array(8).fill().map( (_, trackNum) => 
                Array(16).fill().map( (_, stepNum) => 
                    Math.floor((trackNum + stepNum) / (patternNum + 1)) % ((trackNum + 4) % Math.floor(Math.random() * 12)) == 0 ? 1 : 0
                )
            )
        ),
    params: Array(8).fill().map( p => Array(4).fill(0.5) ),
    faders: Array(8).fill(0),
    instrument: 0, // (0 - 7) 0 -> Bass Drum, 1 -> Snare, etc.
    pattern: 0, // (0 - 7)
    playing: false,
    recording: false,
    tempo: 101,
    volume: 1,
    currentStep: -1
}

// Create SSOT

const stateManager = createSingleSourceOfTruth(initialState);

/**
 * 
 *      Reducers 
 * 
 */

const stepReducer = (state, action) => {
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
}
const patternSelectReducer = (state, action) => {
    const { type, patternNum } = action;
    switch (type) {
        case "patternSelect":
            state.pattern = patternNum;
            return state;
        default: return state;
    }
}
const instrumentSelectReducer = (state, action) => {
    const { type, instrumentNum } = action;
    switch (type) {
        case "instrumentSelect":
            state.instrument = instrumentNum;
            return state;
        default: return state;
    }
}
const faderReducer = (state, action) => {
    const { type, num, value } = action;
    switch (type) {
        case "fadermove":
            state.faders[num] = constrain(state.faders[num] + value, 0, 1);
            return state;
        default: return state;
    }
}
const potReducer = (state, action) => {
    const { type, value, trackNum, potNum } = action;
    switch (type) {
        case "potmove":
            const change = value * 0.005;
            state.params[trackNum][potNum] = constrain(state.params[trackNum][potNum] + change, 0, 1);
            return state;
        default: return state;
    }
}
const transportReducer = (state, action) => {
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
const tempoReducer = (state, action) => {
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

// test reducers
const tempoReducerTest = tempoReducer({tempo: 100}, {type: "tempoChange", value: 10});
console.assert(tempoReducerTest.tempo == 100.5, tempoReducerTest);

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

/**
 * 
 * DOM loader, listeners and dispatches
 * 
 */

// tracks
document.querySelectorAll('.track').forEach( (track, trackNum) => {

        // pots
        track.querySelectorAll('.pot')
            .forEach( (element, potNum) => {
                element.addEventListener('mousedown', event => {
                    let X = event.screenX, Y = event.screenY;

                    function potDragHandler (event) {
                        stateManager.dispatch({
                            type: "potmove",
                            value: -(event.screenY - Y),
                            trackNum,
                            potNum
                        })
                        Y = event.screenY;
                    }

                    function mouseupHandler () {
                        document.removeEventListener('mousemove', potDragHandler);
                        document.removeEventListener('mouseup', mouseupHandler)
                    }
                    document.addEventListener('mousemove', potDragHandler)
                    document.addEventListener('mouseup', mouseupHandler);
                })

                const potCursorElement = element.querySelector('.pot-cursor');
                stateManager.subscribe( state => {
                    const angle = map( state.params[trackNum][potNum], 0, 1, 45, 315 );
                    potCursorElement.setAttribute('style', `transform: rotate(${angle}deg);`)
                });
            });

        // Faders
        const faderElement = track.querySelector('.fader');
        const faderHandleElement = faderElement.querySelector('.fader-handle');

        const faderHeight       = parseFloat(window.getComputedStyle(faderElement).height);
        const faderHandleHeight = parseFloat(window.getComputedStyle(faderHandleElement).height);
        const availableHeight   = faderHeight - faderHandleHeight;
        
        faderElement.addEventListener('mousedown', (event) => {
            let X = event.screenX, Y = event.screenY;

            function faderDragHandler (event) {
                stateManager.dispatch({
                    type: "fadermove",
                    value: -(event.screenY - Y) / availableHeight,
                    num: trackNum
                })
                Y = event.screenY;
            }

            function mouseupHandler () {
                document.removeEventListener('mousemove', faderDragHandler);
                document.removeEventListener('mouseup', mouseupHandler)
            }

            document.addEventListener('mousemove', faderDragHandler)
            document.addEventListener('mouseup', mouseupHandler);
        })

        stateManager.subscribe( state => {
            faderHandleElement.setAttribute('style', `top: ${availableHeight * (1 - state.faders[trackNum])}px;`)
        })

        // Instrument Select Buttons
        const selectElement = track.querySelector('.select');

        selectElement.addEventListener('click', e => {
                stateManager.dispatch({
                    type: "instrumentSelect",
                    instrumentNum: trackNum
                })
            })

        stateManager.subscribe( state => {
            if (state.instrument == trackNum) {
                selectElement.classList.add('active');
            } else {
                selectElement.classList.remove('active');
            }
        })
})
// steps
document.querySelectorAll('.step').forEach( (element, stepNum) => {
    element.addEventListener('click', e => 
        stateManager.dispatch({
            type: "stepToggle",
            stepNum
        })
    );
    stateManager.subscribe( (state) => {
        const active = state.sequences[state.pattern][state.instrument][stepNum] === 1;
        if ( active ) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }

        const led = element.querySelector('.led');
        const activeLED = state.currentStep == stepNum;
        if (activeLED) {
            led.classList.add('active');
        } else {
            led.classList.remove('active');
        } 
    })
    
});
// pattern pads
document.querySelectorAll('.pattern-pad').forEach( (element, patternNum) => {
    element.addEventListener('click', e => 
        stateManager.dispatch({
            type: "patternSelect",
            patternNum
        })
    );
    stateManager.subscribe( (state) => {
        if (state.pattern == patternNum) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    })
});

// transport
document.querySelector('#play').addEventListener('click', e => {
    stateManager.dispatch({
        type: "play"
    })
});
document.querySelector('#rec').addEventListener('click', e => {
    stateManager.dispatch({
        type: "record"
    })
});
document.querySelector('#stop').addEventListener('click', e => {
    stateManager.dispatch({
        type: "stop"
    })
});

document.querySelector('#tempo-pot').addEventListener('mousedown', 
    makeDragHandler("vertical", value => 
        stateManager.dispatch({
            "type": "tempoChange",
            value
        })
    )
)




// transport
stateManager.subscribe( state => {
    if (state.playing) {
        document.querySelector('#play').classList.add('active');
    } else {
        document.querySelector('#play').classList.remove('active');
    }
    if (state.recording) {
        document.querySelector('#rec').classList.add('active');
    } else {
        document.querySelector('#rec').classList.remove('active');
    }
})

// tempo
stateManager.subscribe( state => {
    // display
    document.querySelector('#tempo-display').textContent = '' + state.tempo.toFixed(0);
    // pot cursor
    const angle = map( state.tempo, constants.TEMPO_MIN, constants.TEMPO_MAX, 45, 315 );
    document.querySelector('#tempo-pot .pot-cursor').setAttribute('style', `transform: rotate(${angle}deg);`)
})

// initialization included in singleSourceOfTruth factory


