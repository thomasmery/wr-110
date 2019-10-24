import stateManager from './state-manager.js';
import { makeDragHandler, map } from './helpers.js';
import constants from './constants.js';

/**
 * 
 * DOM subscriptions and dispatches
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

// space bar -> PLAY
document.addEventListener('keydown', e => {
    if (e.keyCode == 32) {
        stateManager.dispatch({
            type: "playstop"
        })
    }
});


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