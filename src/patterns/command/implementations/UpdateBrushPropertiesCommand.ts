// Command to update the properties of the free-drawing brush (Pencil tool).
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the logic to sync the brush with model defaults.
export class UpdateBrushPropertiesCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    public execute(): void {
        const canvas = this.controller.fabricCanvas;
        if (!canvas || this.controller.model.getState().activeTool !== 'pencil') return;

        const { defaultShapeStroke, defaultShapeStrokeWidth } = this.controller.model.getState();
        canvas.freeDrawingBrush.color = defaultShapeStroke;
        canvas.freeDrawingBrush.width = defaultShapeStrokeWidth;
    }
}