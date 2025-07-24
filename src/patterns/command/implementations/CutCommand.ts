// Command to copy selected objects to the clipboard and then delete them.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { CopyCommand } from "./CopyCommand";

// PATTERN: Command - Encapsulates the cut action.
export class CutCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Executes a copy and then removes the selected objects or layer from the canvas.
    public async execute(): Promise<void> {
        const canvas = this.controller.fabricCanvas;
        if (!canvas) return;

        const copyCommand = new CopyCommand(this.controller);
        await copyCommand.execute();

        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            canvas.remove(...activeObjects);
            canvas.discardActiveObject();
        } else {
            const { activeLayerId } = this.controller.model.getState();
            if (activeLayerId) {
                const layerObjects = canvas.getObjects().filter(obj => obj.layerId === activeLayerId);
                canvas.remove(...layerObjects);
            }
        }
        canvas.renderAll();
    }
}