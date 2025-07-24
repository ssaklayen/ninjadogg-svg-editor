// Command to open the Export modal dialog.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates opening the export modal.
export class OpenExportModalCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Sets the relevant state in the model to true.
    public execute(): void {
        this.controller.model.setState({ isExportModalOpen: true });
    }
}