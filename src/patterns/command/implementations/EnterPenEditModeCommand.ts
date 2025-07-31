import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { SetActiveToolCommand } from "./SetActiveToolCommand";
import { PenTool } from "../../strategy/implementations";

export class EnterPenEditModeCommand implements ICommand {
    constructor(private controller: AppController, private target: fabric.Path) { }

    public execute(): void {
        this.controller.executeCommandWithoutHistory(SetActiveToolCommand, 'pen');
        const penToolInstance = this.controller.getTool('pen') as PenTool;
        if (penToolInstance) {
            penToolInstance.enterEditMode(this.target);
        }
    }
}