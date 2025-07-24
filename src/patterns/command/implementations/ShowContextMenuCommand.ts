// Command to show or hide the context menu.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { IContextMenuState } from "../../../types/types";

// PATTERN: Command - Encapsulates the action of updating the context menu's state.
export class ShowContextMenuCommand implements ICommand {
    private controller: AppController;
    private contextMenuState: IContextMenuState;

    constructor(controller: AppController, state: IContextMenuState) {
        this.controller = controller;
        this.contextMenuState = state;
    }

    public execute(): void {
        this.controller.model.setState({ contextMenuState: this.contextMenuState });
    }
}