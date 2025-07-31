// src/patterns/strategy/implementations/SelectTool.ts
import { fabric } from 'fabric';
import { Tool } from '../Tool';
import { UpdateCanvasStateCommand } from '../../command/implementations';
import { AppController } from '../../../core/AppController';
import { hydrateAnchorData } from '../../../utils/pathUtils';
import { IAnchorPoint } from '../../../types/types';
import { PenTool } from './PenTool';

export class SelectTool extends Tool {
    private isRotating: boolean = false;
    private rotationStartAngle: number = 0;

    constructor(controller: AppController) {
        super(controller);
    }

    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.ctrlKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            const { layers, activeLayerId } = this.controller.model.getState();
            if (!activeLayerId) return;

            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer || !activeLayer.isVisible || activeLayer.isLocked) return;

            const objectsToSelect = this.canvas.getObjects().filter(obj =>
                obj.layerId === activeLayerId && obj.selectable && !obj.isGridLine && !obj.isArtboard
            );

            if (objectsToSelect.length > 0) {
                this.canvas.discardActiveObject();
                const selection = new fabric.ActiveSelection(objectsToSelect, { canvas: this.canvas });
                this.canvas.setActiveObject(selection as fabric.Object);
                this.canvas.renderAll();
            }
        }
    };

    public activate(): void {
        this.canvas.selection = true;
        this.canvas.defaultCursor = 'default';
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);

        document.addEventListener('keydown', this.handleKeyDown);
        this.canvas.on('before:transform', this.onBeforeTransform);
        this.canvas.on('object:modified', this.onObjectModified);
        this.canvas.on('object:moving', this.onObjectMoving);
        this.canvas.on('object:scaling', this.onObjectScaling);
        this.canvas.on('object:rotating', this.onObjectRotating);
        this.canvas.on('object:rotated', this.onObjectRotated);
        this.canvas.on('mouse:down', this.onMouseDown);
        this.canvas.on('mouse:up', this.onMouseUp);
    }

    public deactivate(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.off('before:transform', this.onBeforeTransform);
        this.canvas.off('object:modified', this.onObjectModified);
        this.canvas.off('object:moving', this.onObjectMoving);
        this.canvas.off('object:scaling', this.onObjectScaling);
        this.canvas.off('object:rotating', this.onObjectRotating);
        this.canvas.off('object:rotated', this.onObjectRotated);
        this.canvas.off('mouse:down', this.onMouseDown);
        this.canvas.off('mouse:up', this.onMouseUp);
    }

    public onMouseDown = (o: fabric.IEvent): void => {
        const target = o.target;
        if (target && o.e) {
            const pointer = this.canvas.getPointer(o.e);
            const corner = target.controls && target._findTargetCorner(pointer);
            if (corner === 'mtr') {
                this.isRotating = true;
                this.rotationStartAngle = target.angle || 0;
            }
        }
    };

    public onMouseUp = (o: fabric.IEvent): void => {
        this.isRotating = false;
    };

    private onObjectMoving = (o: fabric.IEvent): void => {
        const target = o.target;
        if (!target) return;

        const { isGridVisible } = this.controller.model.getState();
        if (isGridVisible) {
            target.set({
                left: this.controller.snapValueToGrid(target.left!),
                top: this.controller.snapValueToGrid(target.top!)
            });
        }
    };

    private onObjectScaling = (o: fabric.IEvent): void => {
        const target = o.target;
        if (target?.type === 'i-text') {
            const iText = target as fabric.IText;
            const newFontSize = (iText.fontSize ?? 40) * (Math.abs(iText.scaleX ?? 1));
            this.controller.model.setState({ liveFontSize: Math.round(newFontSize) });
        }
    };

    // private onObjectRotating = (o: fabric.IEvent): void => {
    //     const target = o.target;
    //     if (!target || !this.isRotating) return;
    //
    //     target.set({
    //         angle: target.angle,
    //         dirty: true
    //     });
    //
    //     if (target.controls) {
    //         target.setCoords();
    //     }
    // };

    private onObjectRotating = (o: fabric.IEvent): void => {
        const target = o.target;
        if (!target || !this.isRotating) return;

        // Handle all objects the same way - no special case for pen objects
        target.set({
            angle: target.angle,
            dirty: true
        });

        if (target.controls) {
            target.setCoords();
        }
    }

    private onObjectRotated = (o: fabric.IEvent): void => {
        const target = o.target;
        if (!target) return;

        // Just ensure coordinates are properly set for all objects
        target.setCoords();
        this.canvas.requestRenderAll();
    }

    private onBeforeTransform = (e: fabric.IEvent): void => {
        const target = e.target;
        if (target) {
            target.objectCaching = false;

            if (target.isPenObject && target.anchorData) {
                const penObject = target as fabric.Path;
                penObject._originalPathOffset = new fabric.Point(
                    penObject.pathOffset.x,
                    penObject.pathOffset.y
                );
            }
        }
    };

    private onObjectModified = async (o: fabric.IEvent): Promise<void> => {
        this.controller.model.setState({ liveFontSize: undefined });
        const target = o.target;
        if (!target) {
            this.controller.saveStateToHistory();
            return;
        }

        const objectsToProcess = target.type === 'activeSelection'
            ? (target as fabric.ActiveSelection).getObjects()
            : [target];

        for (const obj of objectsToProcess) {
            if (obj.isPenObject && obj.anchorData) {
                await this.processPenObjectTransformation(obj as fabric.Path);
            }

            if (obj.type === 'i-text') {
                const iText = obj as fabric.IText;
                const scaleFactor = Math.abs(iText.scaleX ?? 1);
                iText.fontSize = (iText.fontSize ?? 40) * scaleFactor;
                iText.set({ scaleX: 1, scaleY: 1 });
            }
        }

        target.objectCaching = true;
        target.setCoords();

        this.controller.updateSelectionState(target);
        this.controller.saveStateToHistory();
        this.canvas.renderAll();
    };

    private async processPenObjectTransformation(penObject: fabric.Path): Promise<void> {
        const scaleX = penObject.scaleX || 1;
        const scaleY = penObject.scaleY || 1;
        const angle = penObject.angle || 0;
        const skewX = penObject.skewX || 0;
        const skewY = penObject.skewY || 0;

        // IMPORTANT: Skip processing if ONLY rotation was applied
        // Let Fabric.js handle pure rotation naturally like other objects
        if (scaleX === 1 && scaleY === 1 && skewX === 0 && skewY === 0) {
            // Even if angle !== 0, don't process - let rotation work naturally
            penObject.setCoords();
            return;
        }

        // Only process if there's actual scaling, skewing, or complex transformations
        // (not just rotation)
        const penTool = this.controller.getTool('pen') as PenTool;
        if (!penTool) return;

        const hydratedAnchorData = hydrateAnchorData(penObject.anchorData);
        const originalPathOffset = penObject._originalPathOffset || penObject.pathOffset;

        const angleRad = angle * Math.PI / 180;
        const skewXRad = skewX * Math.PI / 180;
        const skewYRad = skewY * Math.PI / 180;

        const transformMatrix = [
            scaleX * Math.cos(angleRad),
            scaleX * Math.sin(angleRad),
            -scaleY * Math.sin(angleRad + skewXRad),
            scaleY * Math.cos(angleRad + skewXRad),
            0,
            0
        ];

        const absoluteAnchorData: IAnchorPoint[] = hydratedAnchorData.map(pointData => {
            const objRelativeAnchor = pointData.anchor.add(originalPathOffset);
            const objRelativeHandle1 = pointData.handle1.add(originalPathOffset);
            const objRelativeHandle2 = pointData.handle2.add(originalPathOffset);

            return {
                anchor: fabric.util.transformPoint(objRelativeAnchor, transformMatrix).add(new fabric.Point(penObject.left || 0, penObject.top || 0)),
                handle1: fabric.util.transformPoint(objRelativeHandle1, transformMatrix).add(new fabric.Point(penObject.left || 0, penObject.top || 0)),
                handle2: fabric.util.transformPoint(objRelativeHandle2, transformMatrix).add(new fabric.Point(penObject.left || 0, penObject.top || 0)),
            };
        });

        const absolutePathString = penTool.generatePathString(absoluteAnchorData, penObject.isPathClosed);
        const tempPath = new fabric.Path(absolutePathString);

        const newLeft = tempPath.left || 0;
        const newTop = tempPath.top || 0;
        const newPathOffset = new fabric.Point(tempPath.pathOffset.x, tempPath.pathOffset.y);

        const pathRelativeAnchorData: IAnchorPoint[] = absoluteAnchorData.map(pointData => ({
            anchor: pointData.anchor.subtract(new fabric.Point(newLeft, newTop)).subtract(newPathOffset),
            handle1: pointData.handle1.subtract(new fabric.Point(newLeft, newTop)).subtract(newPathOffset),
            handle2: pointData.handle2.subtract(new fabric.Point(newLeft, newTop)).subtract(newPathOffset),
        }));

        penObject.set({
            path: tempPath.path,
            pathOffset: newPathOffset,
            left: newLeft,
            top: newTop,
            width: tempPath.width,
            height: tempPath.height,
            scaleX: 1,
            scaleY: 1,
            angle: 0, // Only reset angle if we're rebuilding the path
            skewX: 0,
            skewY: 0,
            flipX: false,
            flipY: false,
            anchorData: pathRelativeAnchorData,
            dirty: true,
        });

        delete penObject._originalPathOffset;
        penObject.setCoords();
    }

}