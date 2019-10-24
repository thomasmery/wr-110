// helpers
export const map = (val, min, max, tmin, tmax) => (val-min) / max * (tmax-tmin) + tmin;
export const constrain = (value, min, max) => value > max ? max : value < min ? min : value;

export const dbtoa = db => Math.pow(10, db * 0.05);
export const faderCurve = val => val == 0 ? 0 : dbtoa( map(1 - Math.pow((1-val), 2), 0, 1, -60, 0));

export const pitchToRate = pitch => Math.pow(2, pitch/12);

export const makeDragHandler = (axis = "vertical", handlerFn = val => {}) => 
    event => {
        let X = event.screenX, Y = event.screenY;

        const dragHandler = (event) => {
            const dX = event.screenX - X, dY = event.screenY - Y;
            const arg = axis == "vertical" ? -dY : 
                axis == "horizontal" ? dX :
                axis == "radial" ? Math.sqrt(dY * dY + dX * dX) :
                0;
            handlerFn ( arg );
            Y = event.screenY;
            X = event.screenX;
        }

        const mouseupHandler = () => {
            document.removeEventListener('mousemove', dragHandler);
            document.removeEventListener('mouseup', mouseupHandler)
        }

        document.addEventListener('mousemove', dragHandler)
        document.addEventListener('mouseup', mouseupHandler);
    }

