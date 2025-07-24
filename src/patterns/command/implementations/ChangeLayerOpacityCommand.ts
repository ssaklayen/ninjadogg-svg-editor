// Command to change the opacity of a specific layer.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the action of changing layer opacity.
export class ChangeLayerOpacityCommand implements ICommand {
    private controller: AppController;
    private layerId: string;
    private opacity: number;

    constructor(controller: AppController, layerId: string, opacity: number) {
        this.controller = controller;
        this.layerId = layerId;
        this.opacity = opacity;
    }

    public execute(): void {
        this.controller.updateLayerProperties(this.layerId, { opacity: this.opacity });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}