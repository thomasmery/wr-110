export const initialState = {
    // sequences[pattern][track][step]
    sequences: Array(8).fill().map( (_, patternNum) => 
            Array(8).fill().map( (_, trackNum) => 
                Array(16).fill().map( (_, stepNum) => 
                    stepNum % Math.abs(4 - trackNum + patternNum) == 0 ? 1 : 0
                )
            )
        ),
    // params[track][paramNum]
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