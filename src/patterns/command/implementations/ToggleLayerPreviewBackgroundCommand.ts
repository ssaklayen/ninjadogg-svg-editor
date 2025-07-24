// Command to cycle through the available background styles for a layer's preview thumbnail.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { PreviewBackground } from "../../../types/types";

// PATTERN: Command - Encapsulates the action of changing a layer's preview background style.
export class ToggleLayerPreviewBackgroundCommand implements ICommand {
    constructor(private controller: AppController, private layerId: string) {}

    public execute(): void {
        const backgroundCycle: PreviewBackground[] = ['dark', 'light', 'flat-dark', 'flat-white'];
        const currentLayers = this.controller.model.getState().layers;
        const layerToUpdate = currentLayers.find(layer => layer.id === this.layerId);

        if (layerToUpdate) {
            const currentBackground = layerToUpdate.previewBackground || 'dark';
            const currentIndex = backgroundCycle.indexOf(currentBackground);
            const nextIndex = (currentIndex + 1) % backgroundCycle.length;
            const newBackground = backgroundCycle[nextIndex];
            this.controller.updateLayerProperties(this.layerId, { previewBackground: newBackground });
        }
    }
}