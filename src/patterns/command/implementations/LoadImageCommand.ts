// Command to load a raster image (PNG, JPG, GIF) onto a new canvas.
// src/patterns/command/implementations/LoadImageCommand.ts
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from 'fabric';
import { uniqueId } from "../../../utils/uniqueId";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";
import { SetActiveToolCommand } from "./SetActiveToolCommand";
import { awaitBrowserNextFrame } from "../../../utils/awaitBrowserNextFrame";
import { ILayer } from "../../../types/types";

// PATTERN: Command - Encapsulates loading and setting up a new image.
export class LoadImageCommand implements ICommand {
    private controller: AppController;
    private imageUrl: string;
    private projectName: string;

    constructor(controller: AppController, imageUrl: string, projectName: string) {
        this.controller = controller;
        this.imageUrl = imageUrl;
        this.projectName = projectName;
    }

    // Resets the canvas, loads the image, and adjusts canvas size to match.
    public async execute(): Promise<void> {
        const fabricCanvas = this.controller.fabricCanvas;
        if (!fabricCanvas) return;

        fabricCanvas.clear();

        const image = await new Promise<fabric.Image>((resolve) => {
            fabric.Image.fromURL(this.imageUrl, (img) => {
                resolve(img);
            }, { crossOrigin: 'anonymous' });
        });

        const imageWidth = image.width || 500;
        const imageHeight = image.height || 500;
        const currentTheme = this.controller.model.getState().theme;
        const pristineState = this.controller.model.getInitialState();
        const newLayer: ILayer = {
            id: uniqueId(),
            name: "Image Layer",
            isVisible: true,
            opacity: 1,
            isLocked: true,
            previewBackground: currentTheme === 'dark' ? 'dark' : 'light',
        };
        image.set({ id: uniqueId(), layerId: newLayer.id });

        this.controller.model.setState({
            ...pristineState,
            projectName: this.projectName,
            theme: currentTheme,
            isModalOpen: false,
            canvasSize: { width: imageWidth, height: imageHeight },
            layers: [newLayer],
            activeLayerId: newLayer.id,
            isDirty: false
        });
        new SetActiveToolCommand(this.controller, 'select').execute();

        await awaitBrowserNextFrame();

        fabricCanvas.setWidth(imageWidth);
        fabricCanvas.setHeight(imageHeight);
        fabricCanvas.calcOffset();

        fabricCanvas.add(image);
        image.center();

        fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        fabricCanvas.renderAll();

        const historyManager = (this.controller as any).historyManager;
        historyManager.clear();
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
        this.controller.saveStateToHistory();
        this.controller.model.setState({ isDirty: false });
    }
}