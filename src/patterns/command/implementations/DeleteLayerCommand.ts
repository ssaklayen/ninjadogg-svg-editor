// Command to delete a specified layer and all of its objects.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the layer deletion action.
export class DeleteLayerCommand implements ICommand {
    private controller: AppController;
    private layerId: string;

    constructor(controller: AppController, layerId: string) {
        this.controller = controller;
        this.layerId = layerId;
    }

    // Removes the layer from the model and its associated objects from the canvas.
    public execute(): void {
        const { layers, activeLayerId } = this.controller.model.getState();
        if (layers.length <= 1) return;

        let newActiveLayerId = activeLayerId;
        const isDeletingActiveLayer = this.layerId === activeLayerId;

        const newLayers = layers.filter(l => l.id !== this.layerId);

        if (isDeletingActiveLayer && newLayers.length > 0) {
            const originalIndex = layers.findIndex(l => l.id === this.layerId);
            const newIndex = Math.min(originalIndex, newLayers.length - 1);
            newActiveLayerId = newLayers[newIndex].id;
        }

        this.controller.fabricCanvas?.getObjects()
            .filter(o => o.layerId === this.layerId)
            .forEach(o => this.controller.fabricCanvas?.remove(o));

        this.controller.model.setState({
            layers: newLayers,
            activeLayerId: newActiveLayerId,
        });

        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}