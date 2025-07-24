// Command to set the color of the grid lines.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates setting the grid color.
export class SetGridColorCommand implements ICommand {
    constructor(private controller: AppController, private color: string) {}

    // Updates the model and triggers a canvas state update to redraw the grid.
    public execute(): void {
        this.controller.model.setState({ gridColor: this.color });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}