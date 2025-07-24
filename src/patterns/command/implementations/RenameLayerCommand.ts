// Command to rename a specified layer.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the layer rename action.
export class RenameLayerCommand implements ICommand {
    private controller: AppController;
    private layerId: string;
    private newName: string;

    constructor(controller: AppController, layerId: string, newName: string) {
        this.controller = controller;
        this.layerId = layerId;
        this.newName = newName;
    }

    // Updates the layer's name in the model.
    public execute(): void {
        this.controller.updateLayerProperties(this.layerId, { name: this.newName });
    }
}