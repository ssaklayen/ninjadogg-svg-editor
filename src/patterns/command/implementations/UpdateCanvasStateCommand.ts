// Command to perform a full canvas render and state synchronization.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";
import { fabric } from "fabric";
import { Theme } from "../../../types/types";

// PATTERN: Command - Encapsulates the comprehensive process of updating the entire canvas view based on the current model state.
export class UpdateCanvasStateCommand implements ICommand {
    private controller: AppController;
    private static darkCheckerboardPattern?: fabric.Pattern;
    private static lightCheckerboardPattern?: fabric.Pattern;

    constructor(controller: AppController) {
        this.controller = controller;
    }

    public execute(): void {
        const canvas = this.controller.fabricCanvas;
        if (!canvas) return;

        canvas.renderOnAddRemove = false;

        const { layers, isGridVisible, gridSize, gridColor, activeLayerId, isTransparent, canvasSolidColor, isCanvasGradientEnabled, canvasGradient, theme } = this.controller.model.getState();

        if (isTransparent) {
            this.setCheckerboardBackground(canvas, theme);
        } else if (isCanvasGradientEnabled && canvasGradient) {
            const gradOpts: any = { type: canvasGradient.type, colorStops: canvasGradient.colorStops };
            if (canvasGradient.type === 'radial') {
                gradOpts.coords = { x1: canvas.width! / 2, y1: canvas.height! / 2, x2: canvas.width! / 2, y2: canvas.height! / 2, r1: 0, r2: canvas.width! / 2 };
            } else {
                gradOpts.coords = { x1: 0, y1: 0, x2: canvas.width!, y2: 0 };
            }
            canvas.setBackgroundColor(new fabric.Gradient(gradOpts), () => canvas.renderAll());
        } else {
            canvas.setBackgroundColor(canvasSolidColor, () => canvas.renderAll());
        }

        const allObjects = canvas.getObjects();
        const oldGridLines = allObjects.filter(o => o.isGridLine);
        canvas.remove(...oldGridLines);

        if (isGridVisible) {
            this.drawGrid(canvas, gridSize, gridColor);
        }

        const allUserObjects = allObjects.filter(o => !o.isGridLine);
        const isActiveToolSelect = this.controller.model.getState().activeTool === 'select';

        allUserObjects.forEach(obj => {
            const layer = layers.find(l => l.id === obj.layerId);
            if (layer) {
                const isSelectable = isActiveToolSelect && (!layer.isLocked || layer.id === activeLayerId);
                const isEvented = !layer.isLocked || layer.id === activeLayerId;
                obj.set({
                    visible: layer.isVisible,
                    opacity: layer.opacity,
                    selectable: isSelectable,
                    evented: isEvented,
                });
            }

            if (obj.isFillEnabled) {
                if (obj.isGradientFillEnabled && obj.gradientFill) {
                    const sourceGradient = obj.gradientFill;
                    const options: any = {
                        type: sourceGradient.type,
                        colorStops: sourceGradient.colorStops,
                    };

                    if (sourceGradient.type === 'radial') {
                        options.coords = {
                            x1: obj.width! / 2, y1: obj.height! / 2,
                            x2: obj.width! / 2, y2: obj.height! / 2,
                            r1: 0, r2: obj.width! / 2
                        };
                    } else {
                        options.coords = { x1: 0, y1: 0, x2: obj.width!, y2: 0 };
                    }
                    obj.set('fill', new fabric.Gradient(options));
                } else {
                    obj.set('fill', obj.solidFill || '#ffffff');
                }
            } else {
                obj.set('fill', 'transparent');
            }

            if (obj.isStrokeEnabled) {
                obj.set('stroke', obj.solidStroke || '#000000');
            } else {
                obj.set('stroke', 'transparent');
            }
        });

        const gridLines = canvas.getObjects().filter(o => o.isGridLine);
        const userObjects = canvas.getObjects().filter(o => !o.isGridLine);
        const newStack: fabric.Object[] = [];

        layers.slice().reverse().forEach(layer => {
            const layerObjs = userObjects.filter(obj => obj.layerId === layer.id);
            newStack.push(...layerObjs);
        });

        canvas._objects = [...gridLines, ...newStack];

        canvas.renderOnAddRemove = true;
        canvas.renderAll();
    }

    private setCheckerboardBackground(canvas: fabric.Canvas, theme: Theme): void {
        const isDark = theme === 'dark';
        const targetPattern = isDark ? UpdateCanvasStateCommand.darkCheckerboardPattern : UpdateCanvasStateCommand.lightCheckerboardPattern;

        if (targetPattern) {
            canvas.setBackgroundColor(targetPattern, () => canvas.renderAll());
        } else {
            this.createCheckerboardPattern(theme, (pattern) => {
                if (pattern) {
                    if (isDark) {
                        UpdateCanvasStateCommand.darkCheckerboardPattern = pattern;
                    } else {
                        UpdateCanvasStateCommand.lightCheckerboardPattern = pattern;
                    }
                    canvas.setBackgroundColor(pattern, () => canvas.renderAll());
                }
            });
        }
    }

    private createCheckerboardPattern(theme: Theme, callback: (pattern: fabric.Pattern | null) => void): void {
        const patternSize = 24;
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternCanvas.height = patternSize;
        const ctx = patternCanvas.getContext('2d');
        if (!ctx) {
            callback(null);
            return;
        }

        const colors = theme === 'dark'
            ? { light: '#4a5568', dark: '#3a4150' }
            : { light: '#ffffff', dark: '#f0f0f0' };


        ctx.fillStyle = colors.dark;
        ctx.fillRect(0, 0, patternSize, patternSize);
        ctx.fillStyle = colors.light;
        ctx.fillRect(0, 0, patternSize / 2, patternSize / 2);
        ctx.fillRect(patternSize / 2, patternSize / 2, patternSize / 2, patternSize / 2);

        fabric.Image.fromURL(patternCanvas.toDataURL(), (img: any) => {
            const pattern = new fabric.Pattern({
                source: img._element,
                repeat: 'repeat'
            });
            callback(pattern);
        });
    }

    private drawGrid(canvas: fabric.Canvas, gridSize: number, gridColor: string): void {
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;
        if (!vpt) return;

        const width = canvas.width || 0;
        const height = canvas.height || 0;

        const viewPortLeft = -vpt[4] / zoom;
        const viewPortTop = -vpt[5] / zoom;
        const viewPortRight = viewPortLeft + width / zoom;
        const viewPortBottom = viewPortTop + height / zoom;

        const firstVerticalX = Math.ceil(viewPortLeft / gridSize) * gridSize;
        const firstHorizontalY = Math.ceil(viewPortTop / gridSize) * gridSize;

        for (let x = firstVerticalX; x <= viewPortRight; x += gridSize) {
            canvas.add(new fabric.Line([x, viewPortTop, x, viewPortBottom], {
                stroke: gridColor, selectable: false, evented: false, isGridLine: true, objectCaching: false, excludeFromExport: true
            } as any));
        }
        for (let y = firstHorizontalY; y <= viewPortBottom; y += gridSize) {
            canvas.add(new fabric.Line([viewPortLeft, y, viewPortRight, y], {
                stroke: gridColor, selectable: false, evented: false, isGridLine: true, objectCaching: false, excludeFromExport: true
            } as any));
        }
    }
}
