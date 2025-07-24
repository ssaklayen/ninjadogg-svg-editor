// Command to open the Load Project/Image modal dialog.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates opening the load modal.
export class OpenLoadModalCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Sets the relevant state in the model to true.
    public execute(): void {
        this.controller.model.setState({ isLoadModalOpen: true });
    }
}