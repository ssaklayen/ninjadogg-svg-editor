// Command to rename project
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the action of renaming the project.
export class RenameProjectCommand implements ICommand {
    constructor(private controller: AppController, private newName: string) { }

    public execute(): void {
        const trimmedName = this.newName.trim();
        if (trimmedName) {
            this.controller.model.setState({ projectName: trimmedName });
        }
    }
}