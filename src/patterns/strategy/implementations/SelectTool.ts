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

    // New properties for snap-on-release behavior
    private isDragging: boolean = false;
    private originalTransform: {
        left: number;
        top: number;
        scaleX: number;
        scaleY: number;
        angle: number;
    } | null = null;


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

            // Store original transform for snap-on-release
            this.isDragging = true;
            this.originalTransform = {
                left: target.left || 0,
                top: target.top || 0,
                scaleX: target.scaleX || 1,
                scaleY: target.scaleY || 1,
                angle: target.angle || 0
            };
        }
    };

    public onMouseUp = (o: fabric.IEvent): void => {
        this.isRotating = false;

        if (this.isDragging && o.target) {
            this.isDragging = false;

            // Apply grid snapping on release
            const { isGridVisible } = this.controller.model.getState();
            if (isGridVisible) {
                this.applySnapOnRelease(o.target);
            }

            this.originalTransform = null;
        }
    };

    private applySnapOnRelease(target: fabric.Object): void {
        if (target.type === 'activeSelection') {
            const activeSelection = target as fabric.ActiveSelection;
            activeSelection.getObjects().forEach(obj => this.snapSingleObject(obj));
        } else {
            this.snapSingleObject(target);
        }

        target.setCoords();
        this.canvas.requestRenderAll();
    }

    private snapSingleObject(obj: fabric.Object): void {
        const { gridSize } = this.controller.model.getState();
        const snapValue = (value: number) => Math.round(value / gridSize) * gridSize;

        if (obj.isPenObject) {
            this.snapPenObjectBounds(obj as fabric.Path, snapValue);
        } else {
            // Snap regular objects
            const bounds = obj.getBoundingRect(true);
            const snappedLeft = snapValue(bounds.left);
            const snappedTop = snapValue(bounds.top);

            // Calculate offset from bounding rect to object position
            const offsetX = (obj.left || 0) - bounds.left;
            const offsetY = (obj.top || 0) - bounds.top;

            obj.set({
                left: snappedLeft + offsetX,
                top: snappedTop + offsetY
            });
        }
    }

    private onObjectMoving = (o: fabric.IEvent): void => {
        const target = o.target;
        if (!target) return;

    };


    private onObjectScaling = (o: fabric.IEvent): void => {
        const target = o.target;
        if (target?.type === 'i-text') {
            const iText = target as fabric.IText;
            const newFontSize = (iText.fontSize ?? 40) * (Math.abs(iText.scaleX ?? 1));
            this.controller.model.setState({ liveFontSize: Math.round(newFontSize) });
        }

    };

    private onObjectRotating = (o: fabric.IEvent): void => {
        const target = o.target;
        if (!target || !this.isRotating) return;

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

        target.setCoords();
        this.canvas.requestRenderAll();
    }

    private onBeforeTransform = (e: fabric.IEvent): void => {
        const target = e.target;
        if (target) {
            target.objectCaching = false;
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
            this.ensureProperTransformSettings(obj);

            if (obj.isPenObject && obj.anchorData) {
                await this.processPenObjectTransformation(obj as fabric.Path);
            } else {
                if (obj.type === 'i-text') {
                    const iText = obj as fabric.IText;
                    const scaleFactor = Math.abs(iText.scaleX ?? 1);
                    iText.fontSize = (iText.fontSize ?? 40) * scaleFactor;
                    iText.set({ scaleX: 1, scaleY: 1 });
                }
            }
        }

        target.objectCaching = true;
        target.setCoords();

        this.controller.updateSelectionState(target);
        this.controller.saveStateToHistory();
        this.canvas.renderAll();
    };

    private ensureProperTransformSettings(obj: fabric.Object): void {
        obj.set({
            centeredScaling: false,
            centeredRotation: true,
            originX: 'left',
            originY: 'top'
        });
    }

    private snapPenObjectBounds(penObj: fabric.Path, snapValue: (value: number) => number): void {
        // Store the current center point before any transformations
        const center = penObj.getCenterPoint();
        const currentAngle = penObj.angle || 0;

        // Temporarily reset angle to get unrotated bounds
        penObj.set({ angle: 0 });
        const unrotatedBounds = penObj.getBoundingRect(true);

        // Calculate snapped position for unrotated bounds
        const snappedLeft = snapValue(unrotatedBounds.left);
        const snappedTop = snapValue(unrotatedBounds.top);
        const snappedRight = snapValue(unrotatedBounds.left + unrotatedBounds.width);
        const snappedBottom = snapValue(unrotatedBounds.top + unrotatedBounds.height);

        // Calculate new dimensions
        const targetWidth = snappedRight - snappedLeft;
        const targetHeight = snappedBottom - snappedTop;

        // Calculate scale factors
        const scaleX = targetWidth / unrotatedBounds.width;
        const scaleY = targetHeight / unrotatedBounds.height;

        // Apply scaling
        penObj.set({
            scaleX: (penObj.scaleX || 1) * scaleX,
            scaleY: (penObj.scaleY || 1) * scaleY
        });

        // Restore angle
        penObj.set({ angle: currentAngle });

        // Calculate new center after scaling
        const newCenter = penObj.getCenterPoint();

        // Adjust position to maintain center point if object is rotated
        if (currentAngle !== 0) {
            const deltaX = center.x - newCenter.x;
            const deltaY = center.y - newCenter.y;
            penObj.set({
                left: (penObj.left || 0) + deltaX,
                top: (penObj.top || 0) + deltaY
            });
        } else {
            // For unrotated objects, snap the position directly
            penObj.set({
                left: snappedLeft,
                top: snappedTop
            });
        }

        penObj.setCoords();
    }

    private async processPenObjectTransformation(penObject: fabric.Path): Promise<void> {
        const scaleX = penObject.scaleX || 1;
        const scaleY = penObject.scaleY || 1;
        const angle = penObject.angle || 0;
        const skewX = penObject.skewX || 0;
        const skewY = penObject.skewY || 0;

        if (scaleX === 1 && scaleY === 1 && skewX === 0 && skewY === 0) {
            penObject.setCoords();
            return;
        }

        const penTool = this.controller.getTool('pen') as PenTool;
        if (!penTool || !penObject.anchorData) return;

        const anchorData = hydrateAnchorData(penObject.anchorData);
        const pathOffset = penObject.pathOffset;

        const matrix = [
            scaleX,
            skewX,
            skewY,
            scaleY,
            0,
            0
        ];

        // Transform the anchor data
        const transformedData: IAnchorPoint[] = anchorData.map(point => ({
            anchor: fabric.util.transformPoint(point.anchor.add(pathOffset), matrix),
            handle1: fabric.util.transformPoint(point.handle1.add(pathOffset), matrix),
            handle2: fabric.util.transformPoint(point.handle2.add(pathOffset), matrix)
        }));

        // Generate new path
        const pathString = penTool.generatePathString(transformedData, penObject.isPathClosed);
        const newPath = new fabric.Path(pathString);

        // Update anchor data relative to new path offset
        const newPathOffset = newPath.pathOffset;
        const finalAnchorData: IAnchorPoint[] = transformedData.map(point => ({
            anchor: point.anchor.subtract(newPathOffset),
            handle1: point.handle1.subtract(newPathOffset),
            handle2: point.handle2.subtract(newPathOffset)
        }));

        penObject.set({
            path: newPath.path,
            pathOffset: newPathOffset,
            width: newPath.width,
            height: newPath.height,
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
            anchorData: finalAnchorData,
            dirty: true
        });

        delete penObject._originalPathOffset;
        penObject.setCoords();
    }
}