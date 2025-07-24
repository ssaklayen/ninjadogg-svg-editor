// Command to add a new layer to the canvas.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { uniqueId } from "../../../utils/uniqueId";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";
import { ILayer } from "../../../types/types";

// PATTERN: Command - Encapsulates the action of adding a layer.
export class AddLayerCommand implements ICommand {
    private controller: AppController;
    private layerName?: string;

    constructor(controller: AppController, layerName?: string) {
        this.controller = controller;
        this.layerName = layerName;
    }

    public execute(): void {
        const { layers, theme } = this.controller.model.getState();
        const newName = this.layerName || `Layer ${layers.length + 1}`;
        const newLayer: ILayer = {
            id: uniqueId(),
            name: newName,
            isVisible: true,
            opacity: 1,
            isLocked: true,
            previewBackground: theme === 'dark' ? 'dark' : 'light',
        };
        const newLayers = [newLayer, ...layers];

        this.controller.model.setState({ layers: newLayers, activeLayerId: newLayers[0].id });
        this.controller.fabricCanvas?.discardActiveObject();

        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}