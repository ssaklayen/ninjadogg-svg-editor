// Command to toggle the visibility of the canvas grid.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the action of toggling grid visibility.
export class ToggleGridCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    public execute(): void {
        this.controller.model.setState({ isGridVisible: !this.controller.model.getState().isGridVisible });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}