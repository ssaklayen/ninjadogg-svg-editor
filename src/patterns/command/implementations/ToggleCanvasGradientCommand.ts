// Command to toggle the canvas background between a solid color and a gradient.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the action of enabling or disabling the canvas gradient.
export class ToggleCanvasGradientCommand implements ICommand {
    private controller: AppController;
    private enabled: boolean;

    constructor(controller: AppController, enabled: boolean) {
        this.controller = controller;
        this.enabled = enabled;
    }

    public execute(): void {
        this.controller.model.setState({ isCanvasGradientEnabled: this.enabled });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}