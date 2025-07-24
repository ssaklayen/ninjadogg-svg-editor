// Command to update the order of layers in the model.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { ILayer } from "../../../types/types";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the layer reordering action.
export class ReorderLayersCommand implements ICommand {
    private controller: AppController;
    private newLayers: ILayer[];

    constructor(controller: AppController, newLayers: ILayer[]) {
        this.controller = controller;
        this.newLayers = newLayers;
    }

    // Sets the new layer order in the model and updates the canvas.
    public execute(): void {
        this.controller.model.setState({ layers: this.newLayers });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}