// Command to apply a gradient fill to selected objects.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { IGradientOptions } from "../../../types/types";
import { ApplyFillCommand } from "./ApplyFillCommand";
import { fabric } from "fabric";

// PATTERN: Command - Encapsulates setting a gradient fill on objects.
export class SetGradientFillCommand implements ICommand {
    private controller: AppController;
    private gradient: IGradientOptions;

    constructor(controller: AppController, gradient: IGradientOptions) {
        this.controller = controller;
        this.gradient = gradient;
    }

    // Sets the gradient property on selected objects and applies it.
    public execute(): void {
        const activeObject = this.controller.fabricCanvas?.getActiveObject();
        if (!activeObject) return;

        const applyGradientAndUpdate = (obj: fabric.Object) => {
            obj.gradientFill = this.gradient;
            new ApplyFillCommand(this.controller, obj, true).execute();
        };

        if (activeObject.type === 'activeSelection') {
            (activeObject as fabric.ActiveSelection).forEachObject(applyGradientAndUpdate);
        } else {
            applyGradientAndUpdate(activeObject);
        }

        const selectedObjects = activeObject.type === 'activeSelection'
            ? (activeObject as fabric.ActiveSelection).getObjects()
            : [activeObject];

        this.controller.model.setState({ selection: activeObject, selectedObjects });
        this.controller.fabricCanvas?.renderAll();
    }
}