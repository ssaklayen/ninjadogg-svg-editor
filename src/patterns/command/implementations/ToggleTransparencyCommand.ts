// Command to toggle the canvas background between a solid/gradient fill and transparency.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the action of toggling canvas transparency.
export class ToggleTransparencyCommand implements ICommand {
    private controller: AppController;
    private isTransparent: boolean;

    constructor(controller: AppController, isTransparent: boolean) {
        this.controller = controller;
        this.isTransparent = isTransparent;
    }

    public execute(): void {
        this.controller.model.setState({ isTransparent: this.isTransparent });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}