// The strategy for creating and editing text objects.
import { fabric } from 'fabric';
import { Tool } from '../Tool';
import { ApplyFillCommand, UpdateCanvasStateCommand } from '../../command/implementations';
import { AppController } from '../../../core/AppController';

// PATTERN: Strategy (Concrete) - Implements the text creation behavior.
export class TextTool extends Tool {
    private clickTimeout: NodeJS.Timeout | null = null;
    private textArtifact: fabric.Object | null = null;

    constructor(controller: AppController) {
        super(controller);
    }

    public deactivate(): void {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
        }
        this.clickTimeout = null;
        this.textArtifact = null;
    }

    public onMouseDown(o: fabric.IEvent<MouseEvent>): void {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }

        const pointerObj = this.canvas.getPointer(o.e);
        const pointer = new fabric.Point(pointerObj.x, pointerObj.y);

        const state = this.controller.model.getState();
        const text = this.controller.factory.create('text', pointer, state) as fabric.IText;

        this.canvas.add(text);
        this.controller.executeCommandWithoutHistory(ApplyFillCommand, text, true);
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
        this.canvas.renderAll();
        this.textArtifact = text;

        this.clickTimeout = setTimeout(() => {
            if (!this.textArtifact) return;
            const textToFinalize = this.textArtifact as fabric.IText;
            this.canvas.setActiveObject(textToFinalize);
            textToFinalize.enterEditing();
            textToFinalize.selectAll();
            this.controller.saveStateToHistory();
            this.textArtifact = null;
            this.clickTimeout = null;
        }, 250);
    }

    public onDblClick(o: fabric.IEvent<MouseEvent>): void {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
        if (this.textArtifact) {
            this.canvas.remove(this.textArtifact);
            this.textArtifact = null;
        }
        super.onDblClick(o);
    }
}