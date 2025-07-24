// Command to toggle the locked/unlocked state of a layer.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";
import { fabric } from "fabric";

// PATTERN: Command - Encapsulates the logic for locking or unlocking a layer.
export class ToggleLayerLockCommand implements ICommand {
    constructor(private controller: AppController, private layerId: string) {}

    public execute(): void {
        const canvas = this.controller.fabricCanvas;
        const { layers, activeLayerId } = this.controller.model.getState();
        const layerToToggle = layers.find(l => l.id === this.layerId);

        if (canvas && layerToToggle && !layerToToggle.isLocked && this.layerId !== activeLayerId) {
            const selection = canvas.getActiveObject();

            if (selection && selection.type === 'activeSelection') {
                const activeSelection = selection as fabric.ActiveSelection;
                const objectsToRemove = activeSelection.getObjects().filter(obj => obj.layerId === this.layerId);

                if (objectsToRemove.length > 0) {
                    objectsToRemove.forEach(obj => activeSelection.removeWithUpdate(obj));
                    const remainingObjects = activeSelection.getObjects();

                    if (remainingObjects.length === 1) {
                        canvas.discardActiveObject();
                        canvas.setActiveObject(remainingObjects[0]);
                    } else if (remainingObjects.length === 0) {
                        canvas.discardActiveObject();
                    }
                    canvas.renderAll();
                }
            }
        }

        const isNowLocked = !layerToToggle?.isLocked;
        this.controller.updateLayerProperties(this.layerId, { isLocked: isNowLocked });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}