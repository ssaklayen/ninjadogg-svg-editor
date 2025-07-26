// Command to toggle the visibility of the canvas border.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the action of toggling border visibility.
export class ToggleBorderVisibilityCommand implements ICommand {
    constructor(private controller: AppController) {}

    public execute(): void {
        const isVisible = this.controller.model.getState().isBorderVisible;
        this.controller.model.setState({ isBorderVisible: !isVisible });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}