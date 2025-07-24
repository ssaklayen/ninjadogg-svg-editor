// Command to open the New Canvas modal dialog.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates opening the new canvas modal.
export class OpenNewCanvasModalCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Sets the relevant state in the model to true.
    public execute(): void {
        this.controller.model.setState({ isModalOpen: true });
    }
}