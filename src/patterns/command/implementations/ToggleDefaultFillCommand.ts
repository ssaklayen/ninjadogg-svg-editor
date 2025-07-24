// Command to toggle the default fill for newly created shape objects.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the action of toggling the default fill setting.
export class ToggleDefaultFillCommand implements ICommand {
    private controller: AppController;
    private enabled: boolean;

    constructor(controller: AppController, enabled: boolean) {
        this.controller = controller;
        this.enabled = enabled;
    }

    public execute(): void {
        this.controller.model.setState({ isDefaultFillEnabled: this.enabled });
    }
}