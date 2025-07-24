// Command to toggle the default stroke for newly created text objects.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the action of toggling the default stroke setting for text.
export class ToggleDefaultTextStrokeCommand implements ICommand {
    private controller: AppController;
    private enabled: boolean;

    constructor(controller: AppController, enabled: boolean) {
        this.controller = controller;
        this.enabled = enabled;
    }

    public execute(): void {
        this.controller.model.setState({ isDefaultTextStrokeEnabled: this.enabled });
    }
}