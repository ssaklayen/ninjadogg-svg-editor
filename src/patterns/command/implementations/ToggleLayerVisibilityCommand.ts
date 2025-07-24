// Command to toggle the visibility of a layer.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the logic for showing or hiding a layer and its objects.
export class ToggleLayerVisibilityCommand implements ICommand {
    private controller: AppController;
    private layerId: string;

    constructor(controller: AppController, layerId: string) {
        this.controller = controller;
        this.layerId = layerId;
    }

    public execute(): void {
        const { layers } = this.controller.model.getState();
        const canvas = this.controller.fabricCanvas;
        const layerToToggle = layers.find(l => l.id === this.layerId);
        if (!layerToToggle) return;

        const isHidingLayer = layerToToggle.isVisible;

        if (isHidingLayer && canvas) {
            const activeObjects = canvas.getActiveObjects();
            const selectionHasObjectOnHiddenLayer = activeObjects.some(obj => obj.layerId === this.layerId);

            if (selectionHasObjectOnHiddenLayer) {
                canvas.discardActiveObject();
                canvas.renderAll();
            }
        }

        this.controller.updateLayerProperties(this.layerId, { isVisible: !layerToToggle.isVisible });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}