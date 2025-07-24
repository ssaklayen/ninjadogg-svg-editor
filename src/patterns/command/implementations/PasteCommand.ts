// Command to paste objects from the clipboard onto the canvas.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { uniqueId } from "../../../utils/uniqueId";
import { AddLayerCommand } from "./AddLayerCommand";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the paste action.
export class PasteCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    public async execute(): Promise<void> {
        const canvas = this.controller.fabricCanvas;
        const { clipboard, mousePosition, activeLayerId, layers } = this.controller.model.getState();

        if (!canvas || !clipboard) return;

        const objectsAsJSON = clipboard.objects.map(o => o.toObject());
        const objectsToPaste = await new Promise<fabric.Object[]>(resolve => {
            fabric.util.enlivenObjects(objectsAsJSON, (enlivenedObjects: fabric.Object[]) => {
                resolve(enlivenedObjects);
            }, 'fabric');
        });

        if (objectsToPaste.length === 0) return;

        if (clipboard.isLayer) {
            const originalLayer = layers.find(l => l.id === activeLayerId);
            const newLayerName = `Copy of ${originalLayer?.name || 'Layer'}`;
            await this.controller.executeCommandWithoutHistory(AddLayerCommand, newLayerName);
            const newActiveLayerId = this.controller.model.getState().activeLayerId;

            objectsToPaste.forEach(obj => {
                obj.set({
                    id: uniqueId(),
                    layerId: newActiveLayerId ?? undefined,
                });
            });
        } else {
            let center: fabric.Point;
            if (objectsToPaste.length > 1) {
                const group = new fabric.Group(objectsToPaste);
                center = group.getCenterPoint();
            } else {
                center = objectsToPaste[0].getCenterPoint();
            }

            const pastePosition = canvas.getPointer(new MouseEvent('mousemove', { clientX: mousePosition.x, clientY: mousePosition.y }));

            objectsToPaste.forEach(obj => {
                obj.set({
                    left: (obj.left ?? 0) - center.x + pastePosition.x,
                    top: (obj.top ?? 0) - center.y + pastePosition.y,
                    id: uniqueId(),
                    layerId: activeLayerId ?? undefined,
                });
            });
        }

        canvas.add(...objectsToPaste);

        canvas.discardActiveObject();
        const newSelection = new fabric.ActiveSelection(objectsToPaste, { canvas });
        canvas.setActiveObject(newSelection as fabric.Object);

        await this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);

        canvas.renderAll();
    }
}
