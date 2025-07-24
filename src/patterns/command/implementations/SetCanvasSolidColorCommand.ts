// Command to set a solid color for the canvas background.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates setting the canvas background color.
export class SetCanvasSolidColorCommand implements ICommand {
    private controller: AppController;
    private color: string;

    constructor(controller: AppController, color: string) {
        this.controller = controller;
        this.color = color;
    }

    // Updates the model and triggers a canvas state update.
    public execute(): void {
        this.controller.model.setState({ canvasSolidColor: this.color });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}