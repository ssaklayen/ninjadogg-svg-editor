// Command to copy selected objects or layers to the clipboard.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";

// PATTERN: Command - Encapsulates the copy action.
export class CopyCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    public async execute(): Promise<void> {
        const canvas = this.controller.fabricCanvas;
        if (!canvas) return;

        let objectsToCopy: fabric.Object[] = canvas.getActiveObjects();
        let isLayerCopy = false;

        if (objectsToCopy.length === 0) {
            const { activeLayerId } = this.controller.model.getState();
            if (!activeLayerId) return;

            objectsToCopy = canvas.getObjects().filter(obj => obj.layerId === activeLayerId);
            isLayerCopy = true;
        }

        if (objectsToCopy.length === 0) {
            this.controller.model.setState({ clipboard: null });
            return;
        }

        const clonedObjects = await Promise.all(
            objectsToCopy.map(obj => new Promise<fabric.Object>(resolve => obj.clone(resolve)))
        );

        this.controller.model.setState({
            clipboard: {
                objects: clonedObjects,
                isLayer: isLayerCopy
            }
        });
    }
}
