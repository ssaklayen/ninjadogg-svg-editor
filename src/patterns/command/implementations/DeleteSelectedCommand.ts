// Command to delete the currently selected objects from the canvas.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the deletion of selected objects.
export class DeleteSelectedCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Removes all active objects from the canvas.
    public execute(): void {
        const fabricCanvas = this.controller.fabricCanvas;
        if (!fabricCanvas) return;

        const activeObjects = fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
            fabricCanvas.remove(...activeObjects);
            fabricCanvas.discardActiveObject().renderAll();
        }
    }
}