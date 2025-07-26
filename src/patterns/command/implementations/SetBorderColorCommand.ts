// Command to set the color of the canvas border.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates setting the canvas border color.
export class SetBorderColorCommand implements ICommand {
    constructor(private controller: AppController, private color: string) {}

    // Updates the model and triggers a canvas state update to redraw the border.
    public execute(): void {
        this.controller.model.setState({ borderColor: this.color });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}