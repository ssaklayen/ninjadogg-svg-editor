// Command to zoom the canvas in or out.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";

// PATTERN: Command - Encapsulates the canvas zoom action.
export class ZoomCommand implements ICommand {
    private controller: AppController;
    private factor: number;

    constructor(controller: AppController, factor: number) {
        this.controller = controller;
        this.factor = factor;
    }

    public execute(): void {
        const canvas = this.controller.fabricCanvas;
        if (!canvas) return;

        let newZoom = canvas.getZoom() * this.factor;
        newZoom = Math.max(0.1, Math.min(newZoom, 10));

        canvas.zoomToPoint(new fabric.Point((canvas.width || 0) / 2, (canvas.height || 0) / 2), newZoom);
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
    }
}