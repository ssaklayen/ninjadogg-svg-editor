// Command to close the "unsaved changes" confirmation modal.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the action of closing the unsaved changes modal.
export class CloseUnsavedChangesModalCommand implements ICommand {
    private controller: AppController;
    private clearPendingAction: boolean;

    constructor(controller: AppController, clearPendingAction: boolean) {
        this.controller = controller;
        this.clearPendingAction = clearPendingAction;
    }

    public execute(): void {
        const stateUpdate: any = { isUnsavedChangesModalOpen: false };
        if (this.clearPendingAction) {
            stateUpdate.pendingAction = null;
        }
        this.controller.model.setState(stateUpdate);
    }
}