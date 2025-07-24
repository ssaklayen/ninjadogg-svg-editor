// Command to switch the active tool to 'select' and select a target object.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { SetActiveToolCommand } from "./SetActiveToolCommand";

// PATTERN: Command - Encapsulates the logic for activating the select tool and focusing on an object.
export class SwitchToSelectToolCommand implements ICommand {
    private controller: AppController;
    private objectToSelect: fabric.Object;

    constructor(controller: AppController, objectToSelect: fabric.Object) {
        this.controller = controller;
        this.objectToSelect = objectToSelect;
    }

    public execute(): void {
        const canvas = this.controller.fabricCanvas;
        if (!canvas) return;

        new SetActiveToolCommand(this.controller, 'select').execute();

        canvas.setActiveObject(this.objectToSelect);
        canvas.renderAll();
    }
}