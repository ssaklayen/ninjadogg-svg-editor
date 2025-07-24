// Command to close all open modal dialogs.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the action of closing modals.
export class CloseModalsCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    public execute(): void {
        this.controller.model.setState({
            isSaveModalOpen: false,
            isExportModalOpen: false,
            isLoadModalOpen: false
        });
    }
}