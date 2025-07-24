// Command to switch the application's color theme between light and dark mode.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { Theme } from "../../../types/types";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the action of changing the global UI theme.
export class ToggleThemeCommand implements ICommand {
    constructor(private controller: AppController) {}

    public execute(): void {
        const currentTheme = this.controller.model.getState().theme;
        const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
        this.controller.model.setState({ theme: newTheme });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}