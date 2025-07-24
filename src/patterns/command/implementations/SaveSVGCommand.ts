// Command to save the canvas content as an SVG file.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the SVG saving logic.
export class SaveSVGCommand implements ICommand {
    private controller: AppController;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    // Generates an SVG string from the canvas and triggers a download.
    public execute(): void {
        const fabricCanvas = this.controller.fabricCanvas;
        if (!fabricCanvas) return;

        const { isTransparent } = this.controller.model.getState();
        let svg;

        if (isTransparent) {
            const originalBackground = fabricCanvas.backgroundColor;
            fabricCanvas.backgroundColor = '';
            svg = fabricCanvas.toSVG();
            fabricCanvas.backgroundColor = originalBackground;
        } else {
            svg = fabricCanvas.toSVG();
        }

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ninja-dogg-drawing.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}