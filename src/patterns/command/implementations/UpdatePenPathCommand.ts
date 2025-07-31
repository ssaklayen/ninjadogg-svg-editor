// src/patterns/command/implementations/UpdatePenPathCommand.ts
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { PenTool } from "../../strategy/implementations";
import { IAnchorPoint } from "../../../types/types";

export class UpdatePenPathCommand implements ICommand {
    /**
     * @param controller The application controller.
     * @param target The fabric.Path object to update.
     * @param absoluteAnchorData The new, ABSOLUTE canvas-space anchor data.
     */
    constructor(
        private controller: AppController,
        private target?: fabric.Path,
        private absoluteAnchorData?: IAnchorPoint[]
    ) { }

    public async execute(): Promise<void> {
        if (!this.target || !this.absoluteAnchorData || !this.controller.fabricCanvas) {
            return;
        }

        const penTool = this.controller.getTool('pen') as PenTool;
        if (!penTool) return;

        // Temporarily disable rendering to prevent flicker
        this.controller.fabricCanvas.renderOnAddRemove = false;

        // Generate the new path string directly from absolute coordinates
        const pathString = penTool.generatePathString(this.absoluteAnchorData, this.target.isPathClosed);

        // Create a completely new path to get accurate positioning
        const tempPath = new fabric.Path(pathString);
        const newLeft = tempPath.left || 0;
        const newTop = tempPath.top || 0;
        const newPathOffset = new fabric.Point(tempPath.pathOffset.x, tempPath.pathOffset.y);

        // Convert absolute anchor data to path-relative coordinates for storage
        const relativeAnchorData = this.absoluteAnchorData.map(point => ({
            anchor: new fabric.Point(
                point.anchor.x - newLeft - newPathOffset.x,
                point.anchor.y - newTop - newPathOffset.y
            ),
            handle1: new fabric.Point(
                point.handle1.x - newLeft - newPathOffset.x,
                point.handle1.y - newTop - newPathOffset.y
            ),
            handle2: new fabric.Point(
                point.handle2.x - newLeft - newPathOffset.x,
                point.handle2.y - newTop - newPathOffset.y
            )
        }));

        // Update the target object completely - let Fabric.js handle the geometry naturally
        this.target.set({
            path: tempPath.path,
            pathOffset: newPathOffset,
            width: tempPath.width,
            height: tempPath.height,
            left: newLeft,
            top: newTop,
            angle: 0, // Reset angle since we've absorbed it into the path coordinates
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
            anchorData: relativeAnchorData,
            dirty: true,
        });

        this.target.setCoords();

        const activeObject = this.controller.fabricCanvas.getActiveObject();
        if (activeObject === this.target) {
            this.controller.updateSelectionState(this.target);
        }

        // Re-enable rendering and render everything at once
        this.controller.fabricCanvas.renderOnAddRemove = true;
        this.controller.fabricCanvas.requestRenderAll();
    }
}



