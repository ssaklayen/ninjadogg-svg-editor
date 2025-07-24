// The Memento object that stores a snapshot of the canvas and model state.
// PATTERN: Memento - Stores the internal state of the Originator (AppController).
export class CanvasMemento {
    private readonly _state: any;

    constructor(state: any) {
        this._state = JSON.parse(JSON.stringify(state));
    }

    public getState = (): any => this._state;
}