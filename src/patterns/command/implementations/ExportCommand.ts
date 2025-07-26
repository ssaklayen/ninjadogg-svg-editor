// FILE: src/patterns/command/implementations/ExportCommand.ts
// Command to export the canvas content to a specified image format.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";

type ExportFormat = 'svg' | 'png' | 'jpeg' | 'gif';

// PATTERN: Command - Encapsulates the logic for exporting the canvas.
export class ExportCommand implements ICommand {
    private controller: AppController;
    private format: ExportFormat;
    private filename: string;

    constructor(controller: AppController, format: ExportFormat, filename:string) {
        this.controller = controller;
        this.format = format;
        this.filename = filename;
    }

    // Generates a data URL for the specified format and triggers a download.
    public execute(): void {
        const canvas = this.controller.fabricCanvas;
        if (!canvas) return;

        const { canvasSize } = this.controller.model.getState();
        const extension = this.format === 'jpeg' ? 'jpg' : this.format;
        const finalFilename = this.filename.endsWith(`.${extension}`) ? this.filename : `${this.filename}.${extension}`;
        let dataUrl: string;

        const artboardRect = canvas.getObjects().find(o => o.isArtboard);
        const originalStroke = artboardRect?.stroke;
        const originalStrokeWidth = artboardRect?.strokeWidth;
        const originalStrokeDashArray = artboardRect?.strokeDashArray;
        const originalCanvasBg = canvas.backgroundColor;
        const originalVpt = canvas.viewportTransform;

        try {
            if (artboardRect) {
                artboardRect.set({ stroke: 'transparent', strokeWidth: 0, strokeDashArray: undefined });
            }

            if (this.format === 'jpeg') {
                canvas.backgroundColor = '#ffffff';
            } else {
                canvas.backgroundColor = '';
            }

            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.renderAll();

            if (this.format === 'svg') {
                dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(canvas.toSVG({
                    width: canvasSize.width,
                    height: canvasSize.height,
                    viewBox: {
                        x: 0,
                        y: 0,
                        width: canvasSize.width,
                        height: canvasSize.height,
                    }
                }));
            } else {
                dataUrl = canvas.toDataURL({
                    format: this.format,
                    quality: this.format === 'jpeg' ? 0.8 : 1,
                    left: 0,
                    top: 0,
                    width: canvasSize.width,
                    height: canvasSize.height,
                });
            }

            this.triggerDownload(dataUrl, finalFilename);

        } finally {
            if(originalVpt) canvas.setViewportTransform(originalVpt);

            if (artboardRect) {
                artboardRect.set({
                    stroke: originalStroke,
                    strokeWidth: originalStrokeWidth,
                    strokeDashArray: originalStrokeDashArray
                });
            }
            canvas.backgroundColor = originalCanvasBg;
            canvas.renderAll();
        }
    }

    private triggerDownload(dataUrl: string, filename: string): void {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}