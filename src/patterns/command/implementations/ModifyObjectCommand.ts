// Command to modify one or more properties of the selected objects.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates a generic modification of object properties.
export class ModifyObjectCommand implements ICommand {
    private controller: AppController;
    private properties: any;

    constructor(controller: AppController, properties: any) {
        this.controller = controller;
        this.properties = properties;
    }

    // Applies the given properties to the active selection.
    public execute(): void {
        const activeObject = this.controller.fabricCanvas?.getActiveObject();
        if (!activeObject) return;

        const applyProperties = (obj: fabric.Object) => {
            obj.set(this.properties);
            if (obj.type === 'i-text' || (obj.type === 'activeSelection' && this.properties.fontStyle)) {
                (obj as fabric.IText).dirty = true;
            }
        };

        if (activeObject.type === 'activeSelection') {
            (activeObject as fabric.ActiveSelection).forEachObject(applyProperties);
        } else {
            applyProperties(activeObject);
        }

        this.controller.fabricCanvas?.renderAll();

        const selectedObjects = activeObject.type === 'activeSelection'
            ? (activeObject as fabric.ActiveSelection).getObjects()
            : [activeObject];

        this.controller.model.setState({ selection: activeObject, selectedObjects });
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}