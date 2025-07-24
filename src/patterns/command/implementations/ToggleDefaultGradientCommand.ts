// Command to set the default fill type (solid or gradient) for new shapes.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the action of toggling the default gradient fill setting.
export class ToggleDefaultGradientCommand implements ICommand {
    private controller: AppController;
    private enabled: boolean;

    constructor(controller: AppController, enabled: boolean) {
        this.controller = controller;
        this.enabled = enabled;
    }

    public execute(): void {
        this.controller.model.setState({ isDefaultGradientEnabled: this.enabled });
    }
}