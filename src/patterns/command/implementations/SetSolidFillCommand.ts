// Command to set the solid fill color for selected objects.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates setting a solid fill on objects.
export class SetSolidFillCommand implements ICommand {
    private controller: AppController;
    private color: string;

    constructor(controller: AppController, color: string) {
        this.controller = controller;
        this.color = color;
    }

    // Sets the solidFill property on selected objects.
    public execute(): void {
        const activeObject = this.controller.fabricCanvas?.getActiveObject();
        if (!activeObject) return;

        activeObject.solidFill = this.color;

        const selectedObjects = activeObject.type === 'activeSelection'
            ? (activeObject as fabric.ActiveSelection).getObjects()
            : [activeObject];

        this.controller.model.setState({ selection: activeObject, selectedObjects });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}