// The Caretaker for the Memento pattern, managing the undo/redo history.
import {CanvasMemento} from './CanvasMemento';
import {AppController} from '../../core/AppController';

// PATTERN: Memento (Caretaker) - Manages the history of Mementos for undo/redo.
export class HistoryManager {
    private originator: AppController;
    private undoStack: CanvasMemento[] = [];
    private redoStack: CanvasMemento[] = [];

    constructor(originator: AppController) {
        this.originator = originator;
    }

    public save() {
        const memento = this.originator.createMemento();
        this.undoStack.push(memento);
        this.redoStack = [];
    }

    public undo() {
        if (!this.canUndo()) return;
        const lastMemento = this.undoStack.pop()!;
        this.redoStack.push(lastMemento);
        const previousMemento = this.undoStack[this.undoStack.length - 1];
        if (previousMemento) this.originator.restoreFromMemento(previousMemento);
    }

    public redo() {
        if (!this.canRedo()) return;
        const nextMemento = this.redoStack.pop()!;
        this.undoStack.push(nextMemento);
        this.originator.restoreFromMemento(nextMemento);
    }

    public canUndo = (): boolean => this.undoStack.length > 1;
    public canRedo = (): boolean => this.redoStack.length > 0;
    public clear = () => {
        this.undoStack = [];
        this.redoStack = [];
    };
}