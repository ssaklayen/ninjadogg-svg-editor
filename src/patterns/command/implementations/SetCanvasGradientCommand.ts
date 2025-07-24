// Command to set the gradient for the canvas background.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { IGradientOptions } from "../../../types/types";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates setting the canvas background gradient.
export class SetCanvasGradientCommand implements ICommand {
    private controller: AppController;
    private gradient: IGradientOptions;

    constructor(controller: AppController, gradient: IGradientOptions) {
        this.controller = controller;
        this.gradient = gradient;
    }

    // Updates the model and triggers a canvas state update.
    public execute(): void {
        this.controller.model.setState({ canvasGradient: this.gradient });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}