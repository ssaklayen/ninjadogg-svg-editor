// Command to set the active stamp image and update its cursor.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { svgToPngDataUrl } from "../../../utils/svgToPngDataUrl";

// PATTERN: Command - Encapsulates setting the active stamp.
export class SetActiveStampCommand implements ICommand {
    private controller: AppController;
    private src: string;

    constructor(controller: AppController, src: string) {
        this.controller = controller;
        this.src = src;
    }

    // Sets the active stamp source and generates a data URL for the cursor.
    public async execute(): Promise<void> {
        let cursorUrl = '';
        try {
            cursorUrl = await svgToPngDataUrl(this.src);
        } catch (error) {
            console.error("Could not generate cursor for stamp:", error);
        }

        this.controller.model.setState({
            activeStampSrc: this.src,
            activeStampCursor: cursorUrl
        });

        const { activeTool } = this.controller.model.getState();
        if (activeTool === 'stamp' && this.controller.fabricCanvas) {
            const cursorStyle = cursorUrl ? `url(${cursorUrl}) 16 16, crosshair` : 'crosshair';
            this.controller.fabricCanvas.defaultCursor = cursorStyle;
            this.controller.fabricCanvas.hoverCursor = cursorStyle;
        }
    }
}