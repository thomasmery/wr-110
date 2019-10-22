/**
 *      
 *      Audio
 * 
 */

const audioContext = new AudioContext();

const soundsList = [
    'kick.wav',
    'snare.wav',
    'ch.wav',
    'oh.wav',
    'clap.wav',
    'cym.wav',
    'tom.wav',
    'cb.wav'
]

let samples = Promise.all( soundsList.map( (fileName) => {
        return new Promise( (resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', `/snd/${fileName}`, true);
            request.responseType = 'arraybuffer';
            request.onload = () => {
                audioContext.decodeAudioData(
                    request.response,
                    decodedSample => resolve(decodedSample),
                    error => reject(error)
                );
            }
            request.send();
        })
    }))
    .then( buffList => samples = buffList )

const audioManager = ( (audioContext) => {

    let startTime = 0;
    let lastStep = -1;
    let currentStep = -1;
    let firstClick = true;
    let playing = false;
    let tempo = 0;
    let sequenceDuration = 60 * 4 / tempo;
    let sixteenth = sequenceDuration / 16;
    let scheduledStep = {
        number: -1,     
        buffSources: []
    };
    
    let sequence = [];

    const paramsMapping = [
        value => pitchToRate(map(value, 0, 1, -24, 24)),
        value => map(Math.pow(value, 3), 0, 1, 0.05, 5),
        value => value,
        value => value
    ];

    const tracks = ( (audioContext) => Array(8).fill().map( function createTracks() {
            const input = new GainNode(audioContext, {
                gain: 1
            });
            input.connect(audioContext.destination);
            const levelValue = new ConstantSourceNode(audioContext);
            const smoothFilter = new BiquadFilterNode(audioContext, {
                type: 'lowpass',
                frequency: 5
            });
            levelValue.connect(smoothFilter);
            smoothFilter.connect(input.gain);

            const setLevel = level => levelValue.offset.value = level - 1;
            const plug = node => node.connect(input);
            levelValue.start();
            return {
                plug,
                setLevel
            }
        })
    ) (audioContext)

    const params = ( (audioContext) => Array(32).fill().map( function createParams() {
        const paramValue = new ConstantSourceNode(audioContext, {
            offset: 0
        });
        const smoothFilter = new BiquadFilterNode(audioContext, {
            type: 'lowpass',
            frequency: 5
        });
        paramValue.connect(smoothFilter);
        paramValue.start();
        const setValue = value => paramValue.offset.value = value - 1;
        const connect = smoothFilter.connect.bind(smoothFilter);
        return {
            setValue,
            connect
        }
    }))(audioContext)

    const createADSR = (audioContext, A = 0.00, D = 0.125, S = 0, R = 0.5) => {
        const input = new GainNode(audioContext, {
            gain: 1
        });
        const keyDown = () => {
            input.gain.exponentialRampToValueAtTime(1, audioContext.currentTime + A);
            input.gain.setTargetAtTime(S + Number.MIN_VALUE, audioContext.currentTime + A, D );
        }
        const keyUp = () => input.gain.setTargetAtTime(0 + Number.MIN_VALUE, audioContext.currentTime + A + D, R );
        return {
            input,
            keyDown,
            keyUp
        }
    }

    const setParamValue = (paramNum, value) => {
        const paramType = paramNum % 4;
        const mapFn = paramsMapping[paramType]; 
        params[paramNum].setValue( mapFn(value));
    }
    const setTempo = (_tempo) => {
        tempo = _tempo;
        sequenceDuration = 60 * 4 / tempo;
        sixteenth = sequenceDuration / 16;
    }
    const setSequence = (_sequence) => sequence = _sequence;
    const setTrackLevel = (trackNum, level) => {
        tracks[trackNum].setLevel(level);
    }
    const getCurrentStep = () => currentStep;
    const start = () => {
        if (!playing) {
            playing = true;
            startTime = audioContext.currentTime;
            animateAudio();
        }
    }
    const stop = () => {
        playing = false;
        firstClick = true;
        currentStep = -1;
        lastStep = -1;
        scheduledStep.buffSources.forEach( buff => buff.stop() );
        scheduledStep = {
            number: -1,     // -1
            buffSources: [] //
        }
    }
    const animateAudio = () => {
        if ( !playing ) {
            return;
        }
        requestAnimationFrame(animateAudio);
        const audioTime = audioContext.currentTime;
        const sequenceTime = (audioTime - startTime) % sequenceDuration;
        currentStep = Math.floor( sequenceTime * 16 / sequenceDuration) % 16;
        const nextStep = Math.ceil( (sequenceTime * 16) / sequenceDuration) % 16;
        const sequenceCount = Math.floor( (audioTime - startTime) / sequenceDuration );

        const nextStepTime = firstClick ? 0 : (nextStep == 0 ? 16 : nextStep) * sixteenth + startTime + (sequenceCount * sequenceDuration);
        firstClick = false;

        if ( nextStep != scheduledStep.number ) {
            scheduledStep.number = nextStep;
            scheduledStep.buffSources = [];
            sequence.forEach( (seq, instrument) => {
                if (seq[nextStep] == 1) {
                    scheduledStep.buffSources.push( playSample( samples[instrument], nextStepTime, instrument));
                }
            })
        }

        // state update
        if (currentStep != lastStep) {
            lastStep = currentStep;
            stateManager.dispatch({
                "type": "setCurrentStep",
                currentStep
            })
        }
    }
    const playSample = (sample, time, trackNum) => {
        const buffSource = new AudioBufferSourceNode(audioContext, {
            buffer: sample
        }) 
        params[trackNum * 4].connect(buffSource.playbackRate); 
        //const adsr = createADSR(audioContext);
        //adsr.keyDown();
        //buffSource.connect(adsr.input);
        //tracks[trackNum].plug(adsr.input);
        tracks[trackNum].plug(buffSource);
        buffSource.start(time);
        return buffSource;
    }
    return {
        start,
        stop,
        setTempo,
        setSequence,
        setTrackLevel,
        setParamValue,
        getCurrentStep
    }
}) (audioContext)


/**
 * 
 * stateManager subscriptions
 * 
 */ 

// start/stop
stateManager.subscribe( state => {
    if (state.playing) {
        audioManager.start();
    } else {
        audioManager.stop();
    }
});
// sequence/pattern
stateManager.subscribe( state => {
    audioManager.setSequence(state.sequences[state.pattern]);
});
// tempo
stateManager.subscribe( state => audioManager.setTempo(state.tempo))
// levels
stateManager.subscribe( state => {
    state.faders.forEach( (val, trackNum) =>
        audioManager.setTrackLevel(trackNum, faderCurve(val))
    )
});

// params
stateManager.subscribe( state => {
    state.params.forEach( (paramArray, trackNum) => {
        paramArray.forEach( (value, paramNum) => {
            audioManager.setParamValue(trackNum * 4 + paramNum, value);
        })
    });
});

// https://developer.mozilla.org/en-US/docs/Web/API/AudioParam
// https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
// https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet

/**
 * 
 * 
 *
 * 
 */

/*
// audio mixer
const createMixer = (inputNum, auxNum, ctx) => {
    // pre aux !!!
    const mixer = [...Array(inputNum).fill(0)].map( input => {
        const auxes = [...Array(auxNum).fill(0)].map( aux => {
            return ctx.createGain();
        });
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        return {
            input,
            auxes
        };
    })
    const connect = (src, inputNum) => {
        src.connect(mixer[inputNum].master)
        mixer[inputNum].auxes.forEach( aux => src.connect(aux) );
    }
    const setLevel = (level, trackNum) => {
        mixer[trackNum].master.gain.linearRampToValueAtTime(level, ctx.currentTime + 0.05);
    }
    const setAuxLevel = (level, trackNum, auxNum) => {
        mixer[trackNum].auxes[auxNum].gain.linearRampToValueAtTime(level, ctx.currentTime + 0.05);
    }
    return {
        connect,
        setLevel,
        setAuxLevel
    }
}
const mixer = createMixer(8, 2, audioContext);

*/



// play samples with 1-8 keys
// document.addEventListener('keydown', e => {
//     switch (e.keyCode) {
//         case 49: playSample(samples[0], 0); return;
//         case 50: playSample(samples[1], 0); return;
//         case 51: playSample(samples[2], 0); return;
//         case 52: playSample(samples[3], 0); return;
//         case 53: playSample(samples[4], 0); return;
//         case 54: playSample(samples[5], 0); return;
//         case 55: playSample(samples[6], 0); return;
//         case 56: playSample(samples[7], 0); return;
//         default: return;
//     }
// })