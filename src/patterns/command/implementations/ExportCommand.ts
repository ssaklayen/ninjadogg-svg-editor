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

        const { isTransparent } = this.controller.model.getState();
        const originalBackground = canvas.backgroundColor;
        const originalTransform = canvas.viewportTransform;
        const extension = this.format === 'jpeg' ? 'jpg' : this.format;
        const finalFilename = this.filename.endsWith(`.${extension}`) ? this.filename : `${this.filename}.${extension}`;
        let dataUrl: string;

        try {
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

            if (isTransparent) {
                if (this.format === 'jpeg') {
                    canvas.backgroundColor = '#ffffff';
                } else {
                    canvas.backgroundColor = '';
                }
            }

            if (this.format === 'svg') {
                dataUrl = 'data:image/svg+xml;charset=utf-g,' + encodeURIComponent(canvas.toSVG());
            } else {
                dataUrl = canvas.toDataURL({
                    format: this.format,
                    quality: this.format === 'jpeg' ? 0.8 : 1,
                });
            }

            this.triggerDownload(dataUrl, finalFilename);

        } finally {
            if(originalTransform) canvas.setViewportTransform(originalTransform);
            canvas.backgroundColor = originalBackground;
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