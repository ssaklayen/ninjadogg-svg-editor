// Command to set the currently active layer.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates setting the active layer.
export class SetActiveLayerCommand implements ICommand {
    private controller: AppController;
    private layerId: string;

    constructor(controller: AppController, layerId: string) {
        this.controller = controller;
        this.layerId = layerId;
    }

    // Updates the model and deselects any active objects.
    public execute(): void {
        this.controller.fabricCanvas?.discardActiveObject().renderAll();
        this.controller.model.setState({ activeLayerId: this.layerId });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}