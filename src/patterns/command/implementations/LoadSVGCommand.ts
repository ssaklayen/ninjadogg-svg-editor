// src/patterns/command/implementations/LoadSVGCommand.ts
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from 'fabric';
import { uniqueId } from "../../../utils/uniqueId";
import { ILayer } from "../../../types/types";
import { UpdateCanvasStateCommand } from "./UpdateCanvasStateCommand";
import { SetActiveToolCommand } from "./SetActiveToolCommand";
import { InitializeObjectPropertiesCommand } from "./InitializeObjectPropertiesCommand";

// PATTERN: Command - Encapsulates the logic for parsing and loading an SVG.
export class LoadSVGCommand implements ICommand {
    private controller: AppController;
    private svgString: string;
    private projectName: string;

    constructor(controller: AppController, svgString: string, projectName: string) {
        this.controller = controller;
        this.svgString = svgString;
        this.projectName = projectName;
    }

    // Parses the SVG string, creates Fabric objects, and resets the application state.
    public execute(): void {
        const fabricCanvas = this.controller.fabricCanvas;
        if (!fabricCanvas) return;
        const currentTheme = this.controller.model.getState().theme;
        fabricCanvas.clear();

        fabric.loadSVGFromString(this.svgString, (objects, options) => {
            if (!this.controller.fabricCanvas) return;

            let bgColor = '#ffffff';
            let bgGradient = null;
            let startIdx = 0;
            let isTransparent = true;

            if (objects.length > 0 && objects[0].get('type') === 'rect' && objects[0].width === options.width && objects[0].height === options.height) {
                const firstObj = objects[0];
                if (firstObj.fill) {
                    isTransparent = false;
                    if (typeof firstObj.fill === 'object') {
                        bgGradient = firstObj.fill;
                    } else {
                        bgColor = firstObj.fill as string;
                    }
                }
                startIdx = 1;
            }

            const visibleObjects = objects.slice(startIdx).filter(obj => {
                const isPath = obj.type === 'path' || obj.type === 'polyline' || obj.type === 'polygon';
                const path = isPath ? (obj as fabric.Path).path : undefined;
                const hasPath = Array.isArray(path) && path.length > 0;
                const hasDimensions = !!obj.width && !!obj.height && obj.width > 0 && obj.height > 0;
                const hasStyle = (!!obj.fill && obj.fill !== 'none' && obj.fill !== '') || (!!obj.stroke && obj.stroke !== 'none' && obj.stroke !== '');
                return (hasDimensions || hasPath) && hasStyle;
            });

            const pristineState = this.controller.model.getInitialState();

            if (visibleObjects.length === 0) {
                this.controller.model.setState({
                    ...pristineState,
                    projectName: this.projectName,
                    theme: currentTheme,
                    isModalOpen: false,
                    isTransparent: isTransparent,
                    canvasSolidColor: bgColor,
                    isDirty: false
                });
                this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
                return;
            }

            const newLayer: ILayer = {
                id: uniqueId(),
                name: "Loaded SVG",
                isVisible: true,
                opacity: 1,
                isLocked: true,
                previewBackground: currentTheme === 'dark' ? 'dark' : 'light',
            };
            const loadedGroup = fabric.util.groupSVGElements(visibleObjects, options);
            const itemsToAdd = (loadedGroup instanceof fabric.Group) ? loadedGroup.getObjects() : [loadedGroup];

            if(loadedGroup instanceof fabric.Group) loadedGroup._restoreObjectsState();

            itemsToAdd.forEach((obj: fabric.Object) => {
                this.controller.executeCommandWithoutHistory(InitializeObjectPropertiesCommand, obj);
                obj.set({
                    id: uniqueId(),
                    layerId: newLayer.id
                });
                this.controller.fabricCanvas?.add(obj);
            });

            this.controller.model.setState({
                ...pristineState,
                projectName: this.projectName,
                theme: currentTheme,
                isModalOpen: false,
                layers: [newLayer],
                activeLayerId: newLayer.id,
                isTransparent: isTransparent,
                canvasSolidColor: bgColor,
                isCanvasGradientEnabled: !!bgGradient,
                isDirty: false
            });
            new SetActiveToolCommand(this.controller, 'select').execute();


            const historyManager = (this.controller as any).historyManager;
            historyManager.clear();
            this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
            this.controller.fabricCanvas.renderAll();
            this.controller.saveStateToHistory();
            this.controller.model.setState({ isDirty: false });
        });
    }
}