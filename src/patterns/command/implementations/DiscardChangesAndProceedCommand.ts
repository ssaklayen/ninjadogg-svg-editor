// Command to discard unsaved changes and execute a pending action.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Handles discarding changes and proceeding with a stored action.
export class DiscardChangesAndProceedCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Executes the pending action stored in the model.
    public execute(): void {
        const { pendingAction } = this.controller.model.getState();
        if (pendingAction) {
            pendingAction();
        }
        this.controller.model.setState({
            isUnsavedChangesModalOpen: false,
            pendingAction: null
        });
    }
}