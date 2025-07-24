// Command to open the Save Project modal dialog.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates opening the save modal.
export class OpenSaveModalCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Sets the relevant state in the model to true.
    public execute(): void {
        this.controller.model.setState({ isSaveModalOpen: true });
    }
}