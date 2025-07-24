// The strategy for freehand drawing with the pencil tool.
import { fabric } from 'fabric';
import { Tool } from '../Tool';
import { AppController } from '../../../core/AppController';
import { InitializeObjectPropertiesCommand, UpdateCanvasStateCommand } from '../../command/implementations';
import { uniqueId } from '../../../utils/uniqueId';

// PATTERN: Strategy (Concrete) - Implements the freehand drawing behavior.
export class PencilTool extends Tool {

    constructor(controller: AppController) {
        super(controller);
    }

    public activate(): void {
        if (!this.canvas) return;
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);

        const { defaultShapeStroke, defaultShapeStrokeWidth } = this.controller.model.getState();
        this.canvas.freeDrawingBrush.color = defaultShapeStroke;
        this.canvas.freeDrawingBrush.width = defaultShapeStrokeWidth;
        this.canvas.on('path:created', this.handlePathCreated);
    }

    public deactivate(): void {
        if (!this.canvas) return;
        this.canvas.isDrawingMode = false;
        this.canvas.off('path:created', this.handlePathCreated);
    }

    // Sets custom properties on the newly created path and saves history.
    private handlePathCreated = (e: fabric.IEvent & { path?: fabric.Path }) => {
        const path = e.path;
        if (path) {
            if ((path.width ?? 0) < 5 && (path.height ?? 0) < 5) {
                this.canvas?.remove(path);
                return;
            }
            const { activeLayerId } = this.controller.model.getState();
            path.set({ id: uniqueId(), layerId: activeLayerId || undefined });
            path.setCoords();
            this.controller.executeCommandWithoutHistory(InitializeObjectPropertiesCommand, path);
            this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
            this.controller.saveStateToHistory();
        }
    };
}