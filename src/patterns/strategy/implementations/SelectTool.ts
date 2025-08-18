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
    private isDragging: boolean = false;
    private draggedHandle: string | false = false;
    private hasTransformed: boolean = false;
    private originalTransform: {
        left: number;
        top: number;
        scaleX: number;
        scaleY: number;
        angle: number;
        width?: number;
        height?: number;
    } | null = null;
    private mouseStartPos: { x: number; y: number } | null = null;
    private mouseEndPos: { x: number; y: number } | null = null;
    private transformStartBounds: { left: number; top: number; width: number; height: number } | null = null;

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
        this.updateBoundingBoxBehavior();
        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);

        document.addEventListener('keydown', this.handleKeyDown);
        this.canvas.on('before:transform', this.onBeforeTransform);
        this.canvas.on('object:modified', this.onObjectModified);
        this.canvas.on('object:moving', this.onObjectMoving);
        this.canvas.on('object:scaling', this.onObjectScaling);
        this.canvas.on('object:rotating', this.onObjectRotating);
        this.canvas.on('object:rotated', this.onObjectRotated);
        this.canvas.on('mouse:down', this.onMouseDown);
        this.canvas.on('mouse:move', this.onMouseMove);
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
        this.canvas.off('mouse:move', this.onMouseMove);
        this.canvas.off('mouse:up', this.onMouseUp);
    }

    private updateBoundingBoxBehavior(): void {
        const { isGridVisible } = this.controller.model.getState();

        this.canvas.getObjects().forEach(obj => {
            if (obj.isGridLine || obj.isArtboard) return;

            if (isGridVisible) {
                obj.set({
                    lockRotation: false,
                    centeredRotation: true,
                    centeredScaling: false,
                    originX: 'left',
                    originY: 'top',
                    _originalAngle: obj._originalAngle !== undefined ? obj._originalAngle : obj.angle
                });
            } else {
                obj.set({
                    lockRotation: false,
                    centeredRotation: true,
                    centeredScaling: false,
                    originX: 'left',
                    originY: 'top'
                });
                if (obj._originalAngle !== undefined) {
                    delete obj._originalAngle;
                }
            }
        });

        this.canvas.renderAll();
    }

    private setOrthogonalControls(obj: fabric.Object): void {
        return;
    }

    public onMouseDown = (o: fabric.IEvent): void => {
        const target = o.target;
        if (target && o.e) {
            const mouseEvent = o.e as MouseEvent;
            const pointer = this.canvas.getPointer(o.e);
            this.mouseStartPos = { x: pointer.x, y: pointer.y };

            // Force coordinate update
            target.setCoords();

            // These calls are necessary - they trigger internal Fabric.js updates
            const pointerWithoutTransform = this.canvas.getPointer(o.e, true);
            const _oCoords = (target as any).oCoords;
            const _internalPointer = (this.canvas as any)._pointer;

            // Try corner detection with both pointers
            const corner = target._findTargetCorner ? target._findTargetCorner(pointer) : false;
            const cornerAlt = target._findTargetCorner ? target._findTargetCorner(pointerWithoutTransform) : false;

            // CRITICAL FIX: Use cornerAlt when corner fails after viewport transform
            const detectedCorner = corner !== false ? corner : cornerAlt;

            // Check shift+click for rotation reset
            if (mouseEvent.shiftKey && (detectedCorner === 'mtr')) {
                this.resetRotation(target);
                return;
            }

            // Continue with normal processing using the correctly detected corner
            if (detectedCorner !== false) {
                if (detectedCorner === true || detectedCorner === 'mtr') {
                    this.draggedHandle = 'mtr';
                    this.isRotating = true;
                    this.rotationStartAngle = target.angle || 0;
                } else if (typeof detectedCorner === 'string') {
                    this.draggedHandle = detectedCorner;
                }

                this.isDragging = true;
                this.originalTransform = {
                    left: target.left || 0,
                    top: target.top || 0,
                    scaleX: target.scaleX || 1,
                    scaleY: target.scaleY || 1,
                    angle: target.angle || 0,
                    width: target.width,
                    height: target.height
                };

                const bounds = this.getAbsoluteBounds(target);
                this.transformStartBounds = bounds;
            } else {
                if (this.canvas.getActiveObject() === target) {
                    this.isDragging = true;
                    this.draggedHandle = 'move';
                    this.originalTransform = {
                        left: target.left || 0,
                        top: target.top || 0,
                        scaleX: target.scaleX || 1,
                        scaleY: target.scaleY || 1,
                        angle: target.angle || 0
                    };
                }
            }
        }
    };

    private resetRotation(target: fabric.Object): void {
        const currentCenter = target.getCenterPoint();
        target.set({ angle: 0 });
        target.setCoords();
        const newCenter = target.getCenterPoint();

        const deltaX = currentCenter.x - newCenter.x;
        const deltaY = currentCenter.y - newCenter.y;

        target.set({
            left: (target.left || 0) + deltaX,
            top: (target.top || 0) + deltaY
        });

        target.setCoords();
        this.canvas.requestRenderAll();
        this.controller.saveStateToHistory();
    }

    public onMouseMove = (o: fabric.IEvent): void => {
        if (this.isDragging && o.e) {
            const pointer = this.canvas.getPointer(o.e);
            this.mouseEndPos = { x: pointer.x, y: pointer.y };

            if (this.mouseStartPos && !this.hasTransformed) {
                const dx = Math.abs(pointer.x - this.mouseStartPos.x);
                const dy = Math.abs(pointer.y - this.mouseStartPos.y);
                if (dx > 2 || dy > 2) {
                    this.hasTransformed = true;
                }
            }
        }
    };

    public onMouseUp = (o: fabric.IEvent): void => {
        this.isRotating = false;

        if (this.isDragging && o.target) {
            this.isDragging = false;

            const { isGridVisible } = this.controller.model.getState();
            if (isGridVisible && this.hasTransformed) {
                this.applyGridSnapping(o.target);
            }

            this.originalTransform = null;
            this.transformStartBounds = null;
            this.draggedHandle = false;
            this.mouseStartPos = null;
            this.mouseEndPos = null;
            this.hasTransformed = false;
        }
    };

    private getAbsoluteBounds(obj: fabric.Object): { left: number; top: number; width: number; height: number } {
        // Get the absolute position without viewport transform
        const zoom = this.canvas.getZoom();
        const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

        // Calculate the object's corners in absolute canvas coordinates
        const width = obj.width || 0;
        const height = obj.height || 0;
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;

        // Get scaled dimensions
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        // For rotated objects, calculate the axis-aligned bounding box
        if (obj.angle && obj.angle !== 0) {
            const rad = fabric.util.degreesToRadians(obj.angle);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            // Calculate all four corners after rotation
            const hw = scaledWidth / 2;
            const hh = scaledHeight / 2;
            const cx = obj.left || 0;
            const cy = obj.top || 0;

            // Corners relative to center
            const corners = [
                { x: -hw, y: -hh },
                { x: hw, y: -hh },
                { x: hw, y: hh },
                { x: -hw, y: hh }
            ];

            // Rotate corners and find bounds
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            corners.forEach(corner => {
                const rotX = corner.x * cos - corner.y * sin;
                const rotY = corner.x * sin + corner.y * cos;
                const absX = cx + rotX;
                const absY = cy + rotY;
                minX = Math.min(minX, absX);
                minY = Math.min(minY, absY);
                maxX = Math.max(maxX, absX);
                maxY = Math.max(maxY, absY);
            });

            return {
                left: minX,
                top: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        } else {
            // Non-rotated object
            return {
                left: obj.left || 0,
                top: obj.top || 0,
                width: scaledWidth,
                height: scaledHeight
            };
        }
    }

    private applyGridSnapping(target: fabric.Object): void {
        if (!this.originalTransform || !this.draggedHandle) {
            return;
        }

        if (target.type === 'activeSelection') {
            const activeSelection = target as fabric.ActiveSelection;
            activeSelection.getObjects().forEach(obj => this.snapObjectToGrid(obj));
        } else {
            this.snapObjectToGrid(target);
        }

        target.setCoords();
        this.canvas.requestRenderAll();
    }

    private snapObjectToGrid(obj: fabric.Object): void {
        const { gridSize } = this.controller.model.getState();

        // Get viewport transform to understand where the grid actually is
        const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        const panX = vpt[4];
        const panY = vpt[5];

        // Calculate where the visual grid starts (same as in drawGrid)
        const viewPortLeft = -panX / zoom;
        const viewPortTop = -panY / zoom;
        const gridOffsetX = (Math.ceil(viewPortLeft / gridSize) * gridSize) - viewPortLeft;
        const gridOffsetY = (Math.ceil(viewPortTop / gridSize) * gridSize) - viewPortTop;

        // Snap function that accounts for grid offset
        const snap = (value: number, isVertical: boolean = false) => {
            if (isVertical) {
                // For vertical positions (Y axis)
                const offset = value - viewPortTop;
                const snappedOffset = Math.round((offset - gridOffsetY) / gridSize) * gridSize + gridOffsetY;
                return viewPortTop + snappedOffset;
            } else {
                // For horizontal positions (X axis)
                const offset = value - viewPortLeft;
                const snappedOffset = Math.round((offset - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
                return viewPortLeft + snappedOffset;
            }
        };

        if (this.draggedHandle === 'move') {
            // Movement code with updated snap function
            const bounds = this.getAbsoluteBounds(obj);
            if (obj.angle && obj.angle !== 0) {
                const center = obj.getCenterPoint();
                const snappedCenter = new fabric.Point(
                    snap(center.x, false),
                    snap(center.y, true)
                );
                const delta = snappedCenter.subtract(center);

                obj.set({
                    left: (obj.left || 0) + delta.x,
                    top: (obj.top || 0) + delta.y
                });
            } else {
                const snappedLeft = snap(bounds.left, false);
                const snappedTop = snap(bounds.top, true);
                const deltaX = snappedLeft - bounds.left;
                const deltaY = snappedTop - bounds.top;

                obj.set({
                    left: (obj.left || 0) + deltaX,
                    top: (obj.top || 0) + deltaY
                });
            }
        } else if (this.draggedHandle && typeof this.draggedHandle === 'string' && this.draggedHandle !== 'mtr') {
            const handle = this.draggedHandle;

            // Use Fabric's getBoundingRect which accounts for viewport transform
            const boundingRect = obj.getBoundingRect(true, true);

            // Store the fixed point before transformation
            let fixedPoint: fabric.Point;

            if (handle === 'tl') {
                fixedPoint = new fabric.Point(boundingRect.left + boundingRect.width, boundingRect.top + boundingRect.height);
            } else if (handle === 'tr') {
                fixedPoint = new fabric.Point(boundingRect.left, boundingRect.top + boundingRect.height);
            } else if (handle === 'bl') {
                fixedPoint = new fabric.Point(boundingRect.left + boundingRect.width, boundingRect.top);
            } else if (handle === 'br') {
                fixedPoint = new fabric.Point(boundingRect.left, boundingRect.top);
            } else if (handle === 'ml') {
                fixedPoint = new fabric.Point(boundingRect.left + boundingRect.width, boundingRect.top + boundingRect.height / 2);
            } else if (handle === 'mr') {
                fixedPoint = new fabric.Point(boundingRect.left, boundingRect.top + boundingRect.height / 2);
            } else if (handle === 'mt') {
                fixedPoint = new fabric.Point(boundingRect.left + boundingRect.width / 2, boundingRect.top + boundingRect.height);
            } else if (handle === 'mb') {
                fixedPoint = new fabric.Point(boundingRect.left + boundingRect.width / 2, boundingRect.top);
            } else {
                fixedPoint = new fabric.Point(boundingRect.left, boundingRect.top);
            }

            // Calculate target bounds with viewport-aware snapping
            let targetLeft = boundingRect.left;
            let targetTop = boundingRect.top;
            let targetRight = boundingRect.left + boundingRect.width;
            let targetBottom = boundingRect.top + boundingRect.height;

            // Snap the edges being dragged using the viewport-aware snap function
            if (handle.includes('l')) {
                targetLeft = snap(boundingRect.left, false);
            }
            if (handle.includes('r')) {
                targetRight = snap(boundingRect.left + boundingRect.width, false);
            }
            if (handle.includes('t')) {
                targetTop = snap(boundingRect.top, true);
            }
            if (handle.includes('b')) {
                targetBottom = snap(boundingRect.top + boundingRect.height, true);
            }

            // Calculate new dimensions
            const newWidth = Math.abs(targetRight - targetLeft);
            const newHeight = Math.abs(targetBottom - targetTop);

            // Calculate scale factors
            const scaleX = newWidth / boundingRect.width;
            const scaleY = newHeight / boundingRect.height;

            // Apply scaling
            obj.set({
                scaleX: (obj.scaleX || 1) * scaleX,
                scaleY: (obj.scaleY || 1) * scaleY
            });

            // Update coordinates and get new bounding rect
            obj.setCoords();
            const newBoundingRect = obj.getBoundingRect(true, true);

            // Calculate where the fixed point ended up
            let newFixedPoint: fabric.Point;
            if (handle === 'tl') {
                newFixedPoint = new fabric.Point(newBoundingRect.left + newBoundingRect.width, newBoundingRect.top + newBoundingRect.height);
            } else if (handle === 'tr') {
                newFixedPoint = new fabric.Point(newBoundingRect.left, newBoundingRect.top + newBoundingRect.height);
            } else if (handle === 'bl') {
                newFixedPoint = new fabric.Point(newBoundingRect.left + newBoundingRect.width, newBoundingRect.top);
            } else if (handle === 'br') {
                newFixedPoint = new fabric.Point(newBoundingRect.left, newBoundingRect.top);
            } else if (handle === 'ml') {
                newFixedPoint = new fabric.Point(newBoundingRect.left + newBoundingRect.width, newBoundingRect.top + newBoundingRect.height / 2);
            } else if (handle === 'mr') {
                newFixedPoint = new fabric.Point(newBoundingRect.left, newBoundingRect.top + newBoundingRect.height / 2);
            } else if (handle === 'mt') {
                newFixedPoint = new fabric.Point(newBoundingRect.left + newBoundingRect.width / 2, newBoundingRect.top + newBoundingRect.height);
            } else if (handle === 'mb') {
                newFixedPoint = new fabric.Point(newBoundingRect.left + newBoundingRect.width / 2, newBoundingRect.top);
            } else {
                newFixedPoint = new fabric.Point(newBoundingRect.left, newBoundingRect.top);
            }

            // Correct drift
            const drift = fixedPoint.subtract(newFixedPoint);
            obj.set({
                left: (obj.left || 0) + drift.x,
                top: (obj.top || 0) + drift.y
            });
        }

        obj.setCoords();
    }

    private onObjectMoving = (o: fabric.IEvent): void => {
        const target = o.target;
        if (!target) return;

        const { isGridVisible } = this.controller.model.getState();
        if (isGridVisible && target.angle !== 0) {
            this.setOrthogonalControls(target);
        }
    };

    private onObjectScaling = (o: fabric.IEvent): void => {
        const target = o.target;
        if (!target) return;

        // Prevent centered scaling during grid snapping
        const { isGridVisible } = this.controller.model.getState();
        if (isGridVisible) {
            target.set({
                centeredScaling: false,
                originX: 'left',
                originY: 'top'
            });
        }

        if (target?.type === 'i-text') {
            const iText = target as fabric.IText;
            const newFontSize = (iText.fontSize ?? 40) * (Math.abs(iText.scaleX ?? 1));
            this.controller.model.setState({ liveFontSize: Math.round(newFontSize) });
        }

        if (isGridVisible && target.angle !== 0) {
            this.setOrthogonalControls(target);
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

        const { isGridVisible } = this.controller.model.getState();
        if (isGridVisible && target.angle !== 0) {
            this.setOrthogonalControls(target);
        }

        target.setCoords();
        this.canvas.requestRenderAll();
    }

    private onBeforeTransform = (e: fabric.IEvent): void => {
        const target = e.target;
        if (target) {
            target.objectCaching = false;

            // Ensure proper transform settings for grid snapping
            const { isGridVisible } = this.controller.model.getState();
            if (isGridVisible) {
                target.set({
                    centeredScaling: false,
                    originX: 'left',
                    originY: 'top'
                });
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
        const pathOffset = (penObject as any).pathOffset as fabric.Point;

        const matrix = [
            scaleX,
            skewX,
            skewY,
            scaleY,
            0,
            0
        ];

        const transformedData: IAnchorPoint[] = anchorData.map(point => ({
            anchor: fabric.util.transformPoint(point.anchor.add(pathOffset), matrix),
            handle1: fabric.util.transformPoint(point.handle1.add(pathOffset), matrix),
            handle2: fabric.util.transformPoint(point.handle2.add(pathOffset), matrix)
        }));

        const pathString = penTool.generatePathString(transformedData, penObject.isPathClosed || false);
        const newPath = new fabric.Path(pathString);

        const newPathOffset = (newPath as any).pathOffset as fabric.Point;
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