import { fabric } from 'fabric';
import { Tool } from '../Tool';
import { AppController } from '../../../core/AppController';
import { UpdatePenPathCommand } from '../../command/implementations/UpdatePenPathCommand';
import { uniqueId } from '../../../utils/uniqueId';
import { IAnchorPoint, VertexType } from '../../../types/types';
import { hydrateAnchorData } from '../../../utils/pathUtils';

type PenToolMode = 'CREATING' | 'EDITING';

export class PenTool extends Tool {
    private mode: PenToolMode = 'CREATING';
    private editingObject: fabric.Path | null = null;
    private draggedHandle: { pointIndex: number; handle: 'anchor' | 'handle1' | 'handle2' } | null = null;
    private isDragging: boolean = false;
    private visualAids: fabric.Object[] = [];
    private currentPathData: IAnchorPoint[] = [];
    private editingAnchorData: IAnchorPoint[] | null = null;
    private isShiftPressed: boolean = false;
    private MIN_HANDLE_LENGTH = 15; // Minimum handle length to ensure grabbability
    private isClosingPath: boolean = false; // Track if we're closing the path
    private hasMouseMoved: boolean = false; // Track if mouse has moved since mousedown
    private mouseDownPoint: fabric.Point | null = null; // Store initial mouse down position
    private livePreviewPath: fabric.Path | null = null;


    constructor(controller: AppController) {
        super(controller);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    public activate(): void {
        super.activate();
        this.canvas.discardActiveObject();
        this.canvas.selection = false;
        this.canvas.skipTargetFind = true;
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.hoverCursor = 'crosshair';

        this.canvas.forEachObject(obj => {
            const isPen = !!obj.isPenObject;
            obj.set({
                selectable: false,
                evented: isPen
            });
        });

        this.canvas.requestRenderAll();
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    public deactivate(): void {
        super.deactivate();
        this.canvas.skipTargetFind = false;
        this.finalizePath(false);
        this.exitEditMode();
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.canvas.selection = true;
        this.canvas.defaultCursor = 'default';

        this.canvas.forEachObject(obj => {
            obj.set({
                selectable: true,
                evented: true,
                hasControls: true
            });
        });

        this.canvas.requestRenderAll();
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Shift') {
            this.isShiftPressed = true;
        }

        if (e.key === 'Escape' || e.key === 'Enter') {
            e.preventDefault();
            if (this.mode === 'CREATING' && this.currentPathData.length > 0) {
                this.finalizePath(false);
            } else if (this.mode === 'EDITING') {
                this.exitEditMode();
            }
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        if (e.key === 'Shift') {
            this.isShiftPressed = false;
        }
    }

    public onMouseDown(o: fabric.IEvent<MouseEvent>): void {
        if (!o.e) return;
        const pointer = this.canvas.getPointer(o.e);
        const fabricPoint = new fabric.Point(pointer.x, pointer.y);
        const isModifierDown = o.e.ctrlKey || o.e.metaKey;
        const isCtrlShiftDown = (o.e.ctrlKey || o.e.metaKey) && o.e.shiftKey; // Changed from isCtrlAltDown

        this.hasMouseMoved = false;
        this.mouseDownPoint = fabricPoint;

        // --- CTRL+Click to Enter Edit Mode ---
        if (isModifierDown && this.mode !== 'EDITING') {
            const target = this.findPenObjectAt(fabricPoint);
            if (target) {
                this.enterEditMode(target);
                return;
            }
        }

        // --- Edit Mode Logic ---
        if (this.mode === 'EDITING' && this.editingObject) {
            // Check for handle clicks first
            const clickedHandle = this.findClickedHandle(fabricPoint);
            if (clickedHandle) {
                if (isCtrlShiftDown && clickedHandle.handle === 'anchor') {
                    this.toggleAnchorType(clickedHandle.pointIndex);
                    return;
                }

                this.isDragging = true;
                this.draggedHandle = clickedHandle;
                return;
            }

            // Check if clicking on the path to add a vertex
            if (this.editingObject.containsPoint(fabricPoint)) {
                this.addAnchorPoint(fabricPoint);
                return;
            }
        }

        // --- Creation Mode Logic ---
        if (this.mode === 'CREATING') {
            const snappedPointer = this.controller.snapPointToGrid(fabricPoint);

            // Check if closing the path
            if (this.currentPathData.length > 0 && this.isNearFirstPoint(snappedPointer)) {
                this.isClosingPath = true;
                this.isDragging = true;
                return;
            }

            // Create new point - initially as corner point
            const newPoint: IAnchorPoint = {
                anchor: snappedPointer,
                handle1: new fabric.Point(snappedPointer.x, snappedPointer.y), // Collapsed handles
                handle2: new fabric.Point(snappedPointer.x, snappedPointer.y)  // Collapsed handles
            };
            this.currentPathData.push(newPoint);
            this.isDragging = true;
            this.updateLivePath();

        }
    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        if (!o.e) return;
        const pointer = this.controller.snapPointToGrid(
            new fabric.Point(this.canvas.getPointer(o.e).x, this.canvas.getPointer(o.e).y)
        );

        // Track if mouse has moved significantly since mousedown
        if (this.mouseDownPoint && !this.hasMouseMoved) {
            const distance = pointer.distanceFrom(this.mouseDownPoint);
            if (distance > 3) { // Small threshold to ignore tiny movements
                this.hasMouseMoved = true;
            }
        }

        if (this.mode === 'EDITING') {
            if (this.isDragging && this.draggedHandle && this.editingAnchorData) {
                // Pass shift key state instead of alt key and isShiftPressed property
                this.updateEditingHandle(pointer, o.e.shiftKey);
            }
        } else {
            if (this.isDragging && this.currentPathData.length > 0) {
                if (this.isClosingPath) {
                    this.updateClosingHandle(pointer);
                } else {
                    this.updateCreatingHandle(pointer, this.isShiftPressed);
                }
            }
            this.updateLivePath(pointer);
        }
    }

    public onMouseUp(): void {
        if (this.mode === 'CREATING') {
            if (this.isClosingPath) {
                this.handlePathClosure();
                return;
            }

            // If mouse didn't move or shift was pressed, ensure point remains a corner
            if (!this.hasMouseMoved || this.isShiftPressed) {
                if (this.currentPathData.length > 0) {
                    const currentPoint = this.currentPathData[this.currentPathData.length - 1];
                    currentPoint.handle1.setFromPoint(currentPoint.anchor);
                    currentPoint.handle2.setFromPoint(currentPoint.anchor);
                }
            }
        }

        if (this.mode === 'EDITING' && this.isDragging && this.editingObject && this.editingAnchorData) {
            // Clean up live preview
            this.cleanupLivePreview();

            // Execute the final update command
            this.controller.executeCommand(UpdatePenPathCommand, this.editingObject, this.editingAnchorData);
        }

        this.isDragging = false;
        this.draggedHandle = null;
        this.hasMouseMoved = false;
        this.mouseDownPoint = null;
    }
    private findClickedEditElement(pointer: fabric.Point): { pointIndex: number; handle: 'anchor' | 'handle1' | 'handle2' } | null {
        if (!this.editingAnchorData) return null;

        const CLICK_TOLERANCE = 10;

        for (let i = 0; i < this.editingAnchorData.length; i++) {
            const pointData = this.editingAnchorData[i];

            // Check anchor point
            if (pointer.distanceFrom(pointData.anchor) <= CLICK_TOLERANCE) {
                return { pointIndex: i, handle: 'anchor' };
            }

            // Check handle1 (only if it's not collapsed)
            if (pointData.handle1.distanceFrom(pointData.anchor) > this.MIN_HANDLE_LENGTH) {
                if (pointer.distanceFrom(pointData.handle1) <= CLICK_TOLERANCE) {
                    return { pointIndex: i, handle: 'handle1' };
                }
            }

            // Check handle2 (only if it's not collapsed)
            if (pointData.handle2.distanceFrom(pointData.anchor) > this.MIN_HANDLE_LENGTH) {
                if (pointer.distanceFrom(pointData.handle2) <= CLICK_TOLERANCE) {
                    return { pointIndex: i, handle: 'handle2' };
                }
            }
        }

        return null;
    }

    // Handle path closure logic
    private handlePathClosure(): void {
        if (this.currentPathData.length < 2) return;

        const lastPoint = this.currentPathData[this.currentPathData.length - 1];
        const firstPoint = this.currentPathData[0];

        if (this.isShiftPressed) {
            // Force corner closure - collapse handles to create sharp corners
            lastPoint.handle2.setFromPoint(lastPoint.anchor);
            firstPoint.handle1.setFromPoint(firstPoint.anchor);
        } else {
            // Create professional smooth closure with curvature continuity
            this.createSmoothClosure(lastPoint, firstPoint);
        }

        this.finalizePath(true);
        this.isClosingPath = false;
    }

    // Professional smooth closure matching industry standards
    private createSmoothClosure(lastPoint: IAnchorPoint, firstPoint: IAnchorPoint): void {

        const pathLength = this.currentPathData.length;

        // Calculate outgoing handle for last point (toward first point)
        this.calculateLastPointOutgoingHandle(lastPoint, firstPoint, pathLength);

        // Calculate incoming handle for first point (from last point)
        this.calculateFirstPointIncomingHandle(firstPoint, lastPoint, pathLength);
    }

    private calculateLastPointOutgoingHandle(lastPoint: IAnchorPoint, firstPoint: IAnchorPoint, pathLength: number): void {
        if (pathLength > 2) {
            // Use curvature continuity: analyze the incoming curve direction
            const secondToLastPoint = this.currentPathData[pathLength - 2];

            // Calculate the incoming direction and curvature
            const incomingVector = lastPoint.anchor.subtract(secondToLastPoint.anchor);
            const closingVector = firstPoint.anchor.subtract(lastPoint.anchor);

            // Professional approach: blend the incoming direction with the closing direction
            // This creates natural curvature continuation
            const incomingLength = incomingVector.distanceFrom(new fabric.Point(0, 0));
            const closingLength = closingVector.distanceFrom(new fabric.Point(0, 0));

            if (incomingLength > 0 && closingLength > 0) {
                // Normalize vectors
                const incomingNorm = this.normalizeVector(incomingVector);
                const closingNorm = this.normalizeVector(closingVector);

                // Blend directions (weighted toward natural flow)
                const blendFactor = 0.6; // Professional software typically uses 60/40 blend
                const blendedDirection = new fabric.Point(
                    incomingNorm.x * blendFactor + closingNorm.x * (1 - blendFactor),
                    incomingNorm.y * blendFactor + closingNorm.y * (1 - blendFactor)
                );

                // Use proportional handle length (typical 1/3 of segment length)
                const handleLength = Math.min(closingLength * 0.33, incomingLength * 0.33);
                const finalLength = Math.max(this.MIN_HANDLE_LENGTH, handleLength);

                lastPoint.handle2 = new fabric.Point(
                    lastPoint.anchor.x + blendedDirection.x * finalLength,
                    lastPoint.anchor.y + blendedDirection.y * finalLength
                );
            } else {
                // Fallback for edge cases
                this.setSimpleDirectionalHandle(lastPoint, firstPoint, 'outgoing');
            }
        } else {
            // Simple two-point path - use direct approach
            this.setSimpleDirectionalHandle(lastPoint, firstPoint, 'outgoing');
        }
    }

    private calculateFirstPointIncomingHandle(firstPoint: IAnchorPoint, lastPoint: IAnchorPoint, pathLength: number): void {
        if (pathLength > 2) {
            // Use curvature continuity: analyze the outgoing curve direction
            const secondPoint = this.currentPathData[1];

            // Calculate the outgoing direction and curvature
            const outgoingVector = secondPoint.anchor.subtract(firstPoint.anchor);
            const incomingVector = firstPoint.anchor.subtract(lastPoint.anchor);

            const outgoingLength = outgoingVector.distanceFrom(new fabric.Point(0, 0));
            const incomingLength = incomingVector.distanceFrom(new fabric.Point(0, 0));

            if (outgoingLength > 0 && incomingLength > 0) {
                // Normalize vectors
                const outgoingNorm = this.normalizeVector(outgoingVector);
                const incomingNorm = this.normalizeVector(incomingVector);

                // Blend directions (weighted toward natural flow)
                const blendFactor = 0.6;
                const blendedDirection = new fabric.Point(
                    -outgoingNorm.x * blendFactor + incomingNorm.x * (1 - blendFactor),
                    -outgoingNorm.y * blendFactor + incomingNorm.y * (1 - blendFactor)
                );

                // Use proportional handle length
                const handleLength = Math.min(incomingLength * 0.33, outgoingLength * 0.33);
                const finalLength = Math.max(this.MIN_HANDLE_LENGTH, handleLength);

                firstPoint.handle1 = new fabric.Point(
                    firstPoint.anchor.x + blendedDirection.x * finalLength,
                    firstPoint.anchor.y + blendedDirection.y * finalLength
                );

                const outgoingHandleLength = Math.max(this.MIN_HANDLE_LENGTH, outgoingLength * 0.33);
                firstPoint.handle2 = new fabric.Point(
                    firstPoint.anchor.x + outgoingNorm.x * outgoingHandleLength,
                    firstPoint.anchor.y + outgoingNorm.y * outgoingHandleLength
                );

            } else {
                // Fallback for edge cases
                this.setSimpleDirectionalHandle(firstPoint, lastPoint, 'incoming');
                this.setSimpleDirectionalHandle(firstPoint, this.currentPathData[1], 'outgoing');
            }
        } else {
            // Simple two-point path - use direct approach
            this.setSimpleDirectionalHandle(firstPoint, lastPoint, 'incoming');
            const vector = firstPoint.handle1.subtract(firstPoint.anchor);
            firstPoint.handle2 = new fabric.Point(
                firstPoint.anchor.x - vector.x,
                firstPoint.anchor.y - vector.y
            );
        }
    }

    private setSimpleDirectionalHandle(point: IAnchorPoint, targetPoint: IAnchorPoint, direction: 'incoming' | 'outgoing'): void {
        const vector = direction === 'outgoing' ?
            targetPoint.anchor.subtract(point.anchor) :
            point.anchor.subtract(targetPoint.anchor);

        const length = Math.max(this.MIN_HANDLE_LENGTH, vector.distanceFrom(new fabric.Point(0, 0)) * 0.33);
        const normalized = this.normalizeVector(vector);

        const handlePoint = new fabric.Point(
            point.anchor.x + normalized.x * length,
            point.anchor.y + normalized.y * length
        );

        if (direction === 'outgoing') {
            point.handle2 = handlePoint;
        } else {
            point.handle1 = handlePoint;
        }
    }

    // Helper method to normalize a vector (keep existing implementation)
    private normalizeVector(vector: fabric.Point): fabric.Point {
        const length = vector.distanceFrom(new fabric.Point(0, 0));
        if (length === 0) return new fabric.Point(1, 0);
        return new fabric.Point(vector.x / length, vector.y / length);
    }

    public onDblClick(o: fabric.IEvent<MouseEvent>): void {
        // Check if we're in edit mode
        if (this.mode === 'EDITING' && o.e) {
            const pointer = this.controller.fabricCanvas?.getPointer(o.e);
            if (!pointer || !this.editingAnchorData) return;

            // Find which handle or anchor was clicked
            const clickedElement = this.findClickedEditElement(new fabric.Point(pointer.x, pointer.y));
            if (!clickedElement) return;

            const { pointIndex, handle } = clickedElement;

            if (o.e.shiftKey) {
                // Shift + double-click: handle/anchor manipulation
                const pointData = this.editingAnchorData[pointIndex];

                if (handle === 'anchor') {
                    // Shift + double-click on anchor
                    const handle1Collapsed = this.isHandleCollapsed(pointData, 'handle1');
                    const handle2Collapsed = this.isHandleCollapsed(pointData, 'handle2');

                    if (handle1Collapsed && handle2Collapsed) {
                        // Both handles collapsed - extend both
                        this.extendHandle(pointData, 'handle1');
                        this.extendHandle(pointData, 'handle2');
                    } else if (handle1Collapsed || handle2Collapsed) {
                        // One handle collapsed - extend the collapsed one
                        if (handle1Collapsed) this.extendHandle(pointData, 'handle1');
                        if (handle2Collapsed) this.extendHandle(pointData, 'handle2');
                    } else {
                        // Both handles extended - collapse both
                        this.collapseHandle(pointData, 'handle1');
                        this.collapseHandle(pointData, 'handle2');
                    }
                } else {
                    // Shift + double-click on handle
                    const handleKey = handle as 'handle1' | 'handle2';

                    if (this.isHandleCollapsed(pointData, handleKey)) {
                        // Handle is collapsed - extend it
                        this.extendHandle(pointData, handleKey);
                    } else {
                        // Handle is extended - collapse it
                        this.collapseHandle(pointData, handleKey);
                    }
                }

                // Update the preview and re-render
                this.updateLivePreview();
                this.renderEditHandles();
            } else {
                // Regular double-click: delete vertex (only if clicked on anchor)
                if (handle === 'anchor') {
                    this.deleteAnchorPoint(pointIndex);
                }
            }

            // Prevent the event from bubbling up
            o.e.preventDefault();
            o.e.stopPropagation();
            return;
        }

        // If not in edit mode, fall back to default behavior
        super.onDblClick(o);
    }

    // Find pen object at point (for CTRL+click detection)
    private findPenObjectAt(point: fabric.Point): fabric.Path | null {
        const objects = this.canvas.getObjects();
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            if (obj.isPenObject && obj.visible && obj.containsPoint(point)) {
                return obj as fabric.Path;
            }
        }
        return null;
    }

    // Toggle between corner and smooth anchor
    private toggleAnchorType(pointIndex: number): void {
        if (!this.editingAnchorData) return;

        const point = this.editingAnchorData[pointIndex];
        const anchor = point.anchor;

        // Check if handles are collapsed (corner point)
        const h1Dist = point.handle1.distanceFrom(anchor);
        const h2Dist = point.handle2.distanceFrom(anchor);

        if (h1Dist < 5 && h2Dist < 5) {
            const prevIndex = (pointIndex - 1 + this.editingAnchorData.length) % this.editingAnchorData.length;
            const nextIndex = (pointIndex + 1) % this.editingAnchorData.length;
            const prevAnchor = this.editingAnchorData[prevIndex].anchor;
            const nextAnchor = this.editingAnchorData[nextIndex].anchor;

            const angle = Math.atan2(nextAnchor.y - prevAnchor.y, nextAnchor.x - prevAnchor.x);

            point.handle1 = new fabric.Point(
                anchor.x - Math.cos(angle) * this.MIN_HANDLE_LENGTH * 2,
                anchor.y - Math.sin(angle) * this.MIN_HANDLE_LENGTH * 2
            );
            point.handle2 = new fabric.Point(
                anchor.x + Math.cos(angle) * this.MIN_HANDLE_LENGTH * 2,
                anchor.y + Math.sin(angle) * this.MIN_HANDLE_LENGTH * 2
            );
        } else {
            point.handle1 = new fabric.Point(anchor.x, anchor.y);
            point.handle2 = new fabric.Point(anchor.x, anchor.y);
        }

        this.regeneratePathFromData();
        this.renderEditHandles();
    }

    // Add anchor point with smooth handles
    private addAnchorPoint(clickPoint: fabric.Point): void {
        if (!this.editingObject || !this.editingAnchorData) return;

        let bestMatch = {
            index: -1,
            distance: Infinity,
            point: clickPoint,
            t: 0 // Parameter along the curve
        };

        // Find the best segment to add the point to
        for (let i = 0; i < (this.editingObject.isPathClosed ? this.editingAnchorData.length : this.editingAnchorData.length - 1); i++) {
            const p1 = this.editingAnchorData[i];
            const p2 = this.editingAnchorData[(i + 1) % this.editingAnchorData.length];

            // Find closest point on bezier curve
            const result = this.findClosestPointOnBezier(clickPoint, p1, p2);

            if (result.distance < bestMatch.distance) {
                bestMatch = {
                    index: i + 1,
                    distance: result.distance,
                    point: result.point,
                    t: result.t
                };
            }
        }

        if (bestMatch.distance < 20) {
            let newAnchor: IAnchorPoint;

            if (this.isShiftPressed) {
                // Create corner point - handles collapsed to anchor
                newAnchor = {
                    anchor: bestMatch.point,
                    handle1: new fabric.Point(bestMatch.point.x, bestMatch.point.y),
                    handle2: new fabric.Point(bestMatch.point.x, bestMatch.point.y)
                };
            } else {
                // Create smooth point with handles based on bezier tangent
                const i = bestMatch.index - 1;
                const p1 = this.editingAnchorData[i];
                const p2 = this.editingAnchorData[(i + 1) % this.editingAnchorData.length];

                // Get tangent at this point
                const tangent = this.getBezierTangent(p1, p2, bestMatch.t);

                // Calculate handle length as average of neighbors
                const handle1Length = Math.max(
                    this.MIN_HANDLE_LENGTH,
                    (p1.anchor.distanceFrom(p1.handle2) + p2.anchor.distanceFrom(p2.handle1)) / 2
                );

                newAnchor = {
                    anchor: bestMatch.point,
                    handle1: new fabric.Point(
                        bestMatch.point.x - tangent.x * handle1Length,
                        bestMatch.point.y - tangent.y * handle1Length
                    ),
                    handle2: new fabric.Point(
                        bestMatch.point.x + tangent.x * handle1Length,
                        bestMatch.point.y + tangent.y * handle1Length
                    )
                };
            }

            this.editingAnchorData.splice(bestMatch.index, 0, newAnchor);
            this.controller.executeCommand(UpdatePenPathCommand, this.editingObject, this.editingAnchorData).then(() => {
                if (this.editingObject) {
                    this.editingAnchorData = this.convertPathRelativeToAbsolute();
                    this.renderEditHandles();
                }
            });
        }

    }

    // Find closest point on a bezier curve segment
    private findClosestPointOnBezier(
        point: fabric.Point,
        p1: IAnchorPoint,
        p2: IAnchorPoint
    ): { point: fabric.Point, distance: number, t: number } {
        // Sample the curve and find closest point
        let bestT = 0;
        let bestDistance = Infinity;
        let bestPoint = p1.anchor;

        for (let t = 0; t <= 1; t += 0.01) {
            const curvePoint = this.getBezierPoint(p1, p2, t);
            const distance = point.distanceFrom(curvePoint);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestT = t;
                bestPoint = curvePoint;
            }
        }

        return { point: bestPoint, distance: bestDistance, t: bestT };
    }

    // Get point on bezier curve at parameter t
    private getBezierPoint(p1: IAnchorPoint, p2: IAnchorPoint, t: number): fabric.Point {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        const x = mt3 * p1.anchor.x + 3 * mt2 * t * p1.handle2.x +
            3 * mt * t2 * p2.handle1.x + t3 * p2.anchor.x;
        const y = mt3 * p1.anchor.y + 3 * mt2 * t * p1.handle2.y +
            3 * mt * t2 * p2.handle1.y + t3 * p2.anchor.y;

        return new fabric.Point(x, y);
    }

    // Get normalized tangent vector at point t on bezier curve
    private getBezierTangent(p1: IAnchorPoint, p2: IAnchorPoint, t: number): fabric.Point {
        const t2 = t * t;
        const mt = 1 - t;
        const mt2 = mt * mt;

        // Derivative of bezier curve
        const dx = -3 * mt2 * p1.anchor.x + 3 * mt2 * p1.handle2.x -
            6 * mt * t * p1.handle2.x + 6 * mt * t * p2.handle1.x -
            3 * t2 * p2.handle1.x + 3 * t2 * p2.anchor.x;
        const dy = -3 * mt2 * p1.anchor.y + 3 * mt2 * p1.handle2.y -
            6 * mt * t * p1.handle2.y + 6 * mt * t * p2.handle1.y -
            3 * t2 * p2.handle1.y + 3 * t2 * p2.anchor.y;

        // Normalize
        const length = Math.sqrt(dx * dx + dy * dy);
        return new fabric.Point(dx / length, dy / length);
    }

    // Update handles when closing the path
    private updateClosingHandle(pointer: fabric.Point): void {
        if (this.currentPathData.length < 2 || !this.hasMouseMoved) return;

        const lastPoint = this.currentPathData[this.currentPathData.length - 1];
        const firstPoint = this.currentPathData[0];

        // Only create handles if mouse has moved and shift is not pressed
        if (!this.isShiftPressed) {
            // Update last point's outgoing handle
            const dragVector = pointer.subtract(lastPoint.anchor);
            lastPoint.handle2.setFromPoint(lastPoint.anchor.add(dragVector));

            // Update first point's incoming handle symmetrically
            const firstVector = firstPoint.anchor.subtract(pointer);
            firstPoint.handle1.setFromPoint(firstPoint.anchor.add(firstVector));
        }
    }

    // Update handle during creation
    private updateCreatingHandle(pointer: fabric.Point, shiftPressed: boolean): void {
        const currentPoint = this.currentPathData[this.currentPathData.length - 1];
        const origin = currentPoint.anchor;

        if (shiftPressed) {
            // Keep handles collapsed for straight line - no visual curve during drag
            currentPoint.handle1.setFromPoint(origin);
            currentPoint.handle2.setFromPoint(origin);
            return;
        }

        // Normal smooth behavior
        const dragVector = pointer.subtract(origin);
        currentPoint.handle2.setFromPoint(origin.add(dragVector));
        currentPoint.handle1.setFromPoint(origin.subtract(dragVector));
    }

    // Update handle during editing with constraints
    // private updateEditingHandle(pointer: fabric.Point, isAltDown: boolean, isShiftDown: boolean): void {
    //     if (!this.draggedHandle || !this.editingAnchorData) return;
    //
    //     const { pointIndex, handle } = this.draggedHandle;
    //     const pointData = this.editingAnchorData[pointIndex];
    //
    //     if (handle === 'anchor') {
    //         const delta = pointer.subtract(pointData.anchor);
    //         pointData.anchor.setFromPoint(pointer);
    //         pointData.handle1.addEquals(delta);
    //         pointData.handle2.addEquals(delta);
    //     } else {
    //         if (isShiftDown) {
    //             // Constrain to straight line through anchor
    //             const vector = pointer.subtract(pointData.anchor);
    //             const length = Math.max(this.MIN_HANDLE_LENGTH, vector.distanceFrom(new fabric.Point(0, 0)));
    //             const angle = Math.atan2(vector.y, vector.x);
    //
    //             pointData[handle] = new fabric.Point(
    //                 pointData.anchor.x + Math.cos(angle) * length,
    //                 pointData.anchor.y + Math.sin(angle) * length
    //             );
    //
    //             // Keep opposite handle straight
    //             const oppositeHandle = handle === 'handle1' ? 'handle2' : 'handle1';
    //             const oppositeLength = pointData[oppositeHandle].distanceFrom(pointData.anchor);
    //             pointData[oppositeHandle] = new fabric.Point(
    //                 pointData.anchor.x - Math.cos(angle) * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength),
    //                 pointData.anchor.y - Math.sin(angle) * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength)
    //             );
    //         } else {
    //             pointData[handle].setFromPoint(pointer);
    //             if (!isAltDown) {
    //                 // Mirror handle for smooth curve
    //                 const oppositeHandle = handle === 'handle1' ? 'handle2' : 'handle1';
    //                 const vector = pointData.anchor.subtract(pointer);
    //                 pointData[oppositeHandle].setFromPoint(pointData.anchor.add(vector));
    //             }
    //         }
    //     }
    //
    //     // Create live preview instead of modifying the actual path
    //     this.updateLivePreview();
    //     this.renderEditHandles();
    // }

    // New method for live preview during editing
    private updateLivePreview(): void {
        if (!this.editingObject || !this.editingAnchorData) return;

        // Remove existing preview
        if (this.livePreviewPath) {
            this.canvas.remove(this.livePreviewPath);
            this.livePreviewPath = null;
        }

        // Generate preview path string from absolute coordinates
        const pathString = this.generatePathString(this.editingAnchorData, this.editingObject.isPathClosed);

        // Handle fill property - convert to string if needed
        let fillValue: string = 'transparent';
        if (typeof this.editingObject.fill === 'string') {
            fillValue = this.editingObject.fill;
        } else if (this.editingObject.fill) {
            // For gradients and patterns, use a fallback color
            fillValue = '#cccccc'; // Or extract a representative color
        }

        // Handle stroke property - convert to string if needed
        let strokeValue: string = 'transparent';
        if (typeof this.editingObject.stroke === 'string') {
            strokeValue = this.editingObject.stroke;
        } else if (this.editingObject.stroke) {
            // For gradients and patterns, use a fallback color
            strokeValue = '#000000'; // Or extract a representative color
        }

        // Create preview path with same styling as original
        this.livePreviewPath = new fabric.Path(pathString, {
            ...this.getPreviewProps(),
            fill: fillValue,
            stroke: strokeValue,
            strokeWidth: this.editingObject.strokeWidth,
            opacity: 1, // Full opacity for clean preview
        });

        // Add preview path just below the edit handles
        this.canvas.add(this.livePreviewPath);

        // Completely hide the original object during drag
        this.editingObject.set({ opacity: 0 });

        this.canvas.requestRenderAll();
    }

    // New method to clean up live preview
    private cleanupLivePreview(): void {
        if (this.livePreviewPath) {
            this.canvas.remove(this.livePreviewPath);
            this.livePreviewPath = null;
        }

        // Restore original object opacity
        if (this.editingObject) {
            this.editingObject.set({ opacity: 1 });
        }
    }

    // Find clicked handle or anchor with zoom-independent hit detection
    private findClickedHandle(pointer: fabric.Point): { pointIndex: number; handle: 'anchor' | 'handle1' | 'handle2' } | null {
        if (!this.editingObject || !this.editingAnchorData) return null;

        const zoom = this.canvas.getZoom();
        const anchorHitRadius = 8 / zoom;
        const handleHitRadius = 6 / zoom;

        for (let i = 0; i < this.editingAnchorData.length; i++) {
            const p = this.editingAnchorData[i];
            if (pointer.distanceFrom(p.anchor) < anchorHitRadius) return { pointIndex: i, handle: 'anchor' };
            if (pointer.distanceFrom(p.handle1) < handleHitRadius) return { pointIndex: i, handle: 'handle1' };
            if (pointer.distanceFrom(p.handle2) < handleHitRadius) return { pointIndex: i, handle: 'handle2' };
        }
        return null;
    }

    // Enter edit mode
    public enterEditMode(penObject: fabric.Path): void {
        // Exit any existing edit mode first
        if (this.mode === 'EDITING') {
            this.exitEditMode();
        }

        this.mode = 'EDITING';
        this.editingObject = penObject;

        // Clear any existing creation state
        this.currentPathData = [];
        this.cleanupLivePreview();

        // Convert coordinates and setup edit context
        this.editingAnchorData = this.convertPathRelativeToAbsolute();

        // Render handles after a brief delay to ensure canvas is ready
        setTimeout(() => {
            this.renderEditHandles();
            this.canvas.requestRenderAll();
        }, 5);
    }


    // Exit edit mode
    // Modify exitEditMode to clean up preview
    private exitEditMode(): void {
        if (!this.editingObject) return;

        // Clean up any live preview
        this.cleanupLivePreview();

        this.removeVisualAids();
        this.editingObject.set({
            objectCaching: true,
            hasControls: true,
            lockMovementX: false,
            lockMovementY: false,
            borderColor: fabric.Object.prototype.borderColor,
            opacity: 1, // Ensure full opacity
            dirty: true
        });

        this.editingObject.setCoords();
        this.editingObject = null;
        this.editingAnchorData = null;
        this.mode = 'CREATING';
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
    }


    // Convert coordinates between systems
    // private convertPathRelativeToAbsolute(): IAnchorPoint[] {
    //     if (!this.editingObject?.anchorData) return [];
    //
    //     const objectLeft = this.editingObject.left || 0;
    //     const objectTop = this.editingObject.top || 0;
    //     const pathOffsetX = this.editingObject.pathOffset.x;
    //     const pathOffsetY = this.editingObject.pathOffset.y;
    //
    //     return this.editingObject.anchorData.map(point => ({
    //         anchor: new fabric.Point(
    //             point.anchor.x + objectLeft + pathOffsetX,
    //             point.anchor.y + objectTop + pathOffsetY
    //         ),
    //         handle1: new fabric.Point(
    //             point.handle1.x + objectLeft + pathOffsetX,
    //             point.handle1.y + objectTop + pathOffsetY
    //         ),
    //         handle2: new fabric.Point(
    //             point.handle2.x + objectLeft + pathOffsetX,
    //             point.handle2.y + objectTop + pathOffsetY
    //         )
    //     }));
    // }
    private convertPathRelativeToAbsolute(): IAnchorPoint[] {
        if (!this.editingObject?.anchorData) return [];

        const objectLeft = this.editingObject.left || 0;
        const objectTop = this.editingObject.top || 0;
        const pathOffsetX = this.editingObject.pathOffset.x;
        const pathOffsetY = this.editingObject.pathOffset.y;
        const angle = this.editingObject.angle || 0;

        return this.editingObject.anchorData.map(point => {
            // Convert path-relative points to object-relative points
            const objRelativeAnchor = new fabric.Point(
                point.anchor.x + pathOffsetX,
                point.anchor.y + pathOffsetY
            );
            const objRelativeHandle1 = new fabric.Point(
                point.handle1.x + pathOffsetX,
                point.handle1.y + pathOffsetY
            );
            const objRelativeHandle2 = new fabric.Point(
                point.handle2.x + pathOffsetX,
                point.handle2.y + pathOffsetY
            );

            // Apply rotation if the object is rotated
            let transformedAnchor = objRelativeAnchor;
            let transformedHandle1 = objRelativeHandle1;
            let transformedHandle2 = objRelativeHandle2;

            if (angle !== 0) {
                const cos = Math.cos(angle * Math.PI / 180);
                const sin = Math.sin(angle * Math.PI / 180);

                // Apply rotation matrix to each point
                transformedAnchor = new fabric.Point(
                    objRelativeAnchor.x * cos - objRelativeAnchor.y * sin,
                    objRelativeAnchor.x * sin + objRelativeAnchor.y * cos
                );
                transformedHandle1 = new fabric.Point(
                    objRelativeHandle1.x * cos - objRelativeHandle1.y * sin,
                    objRelativeHandle1.x * sin + objRelativeHandle1.y * cos
                );
                transformedHandle2 = new fabric.Point(
                    objRelativeHandle2.x * cos - objRelativeHandle2.y * sin,
                    objRelativeHandle2.x * sin + objRelativeHandle2.y * cos
                );
            }

            // Convert to absolute canvas coordinates
            return {
                anchor: new fabric.Point(
                    transformedAnchor.x + objectLeft,
                    transformedAnchor.y + objectTop
                ),
                handle1: new fabric.Point(
                    transformedHandle1.x + objectLeft,
                    transformedHandle1.y + objectTop
                ),
                handle2: new fabric.Point(
                    transformedHandle2.x + objectLeft,
                    transformedHandle2.y + objectTop
                )
            };
        });
    }

    public getEditingObjectId(): string | null {
        return this.editingObject?.id || null;
    }

    // Regenerate path from data
    private regeneratePathFromData(): void {
        if (!this.editingObject || !this.editingAnchorData) return;

        const pathString = this.generatePathString(this.editingAnchorData, this.editingObject.isPathClosed);
        const tempPath = new fabric.Path(pathString);

        this.editingObject.set({
            path: tempPath.path,
            pathOffset: new fabric.Point(tempPath.pathOffset.x, tempPath.pathOffset.y),
            left: tempPath.left,
            top: tempPath.top,
            width: tempPath.width,
            height: tempPath.height,
            dirty: true
        });

        this.editingObject.setCoords();
        this.canvas.requestRenderAll();
    }

    // Render edit handles
    private renderEditHandles(): void {
        if (!this.editingAnchorData) return;
        this.removeVisualAids();

        this.editingAnchorData.forEach((p, index) => {
            this.visualAids.push(
                new fabric.Line([p.anchor.x, p.anchor.y, p.handle1.x, p.handle1.y],
                    this.getHandleLineProps())
            );
            this.visualAids.push(
                new fabric.Line([p.anchor.x, p.anchor.y, p.handle2.x, p.handle2.y],
                    this.getHandleLineProps())
            );
            this.visualAids.push(this.createHandleControl(p.handle1, index, 'handle1'));
            this.visualAids.push(this.createHandleControl(p.handle2, index, 'handle2'));
            this.visualAids.push(this.createAnchorControl(p.anchor, index));
        });

        this.canvas.add(...this.visualAids);
        this.canvas.requestRenderAll();
    }

    // Delete anchor point
    private deleteAnchorPoint(indexToDelete: number): void {
        if (!this.editingObject || !this.editingAnchorData || this.editingAnchorData.length <= 2) return;

        this.editingAnchorData.splice(indexToDelete, 1);
        this.controller.executeCommand(UpdatePenPathCommand, this.editingObject, this.editingAnchorData).then(() => {
            if (this.editingObject) {
                this.editingAnchorData = this.convertPathRelativeToAbsolute();
                this.renderEditHandles();
            }
        });
    }

    // Generate SVG path string
    public generatePathString(data: IAnchorPoint[], isClosed: boolean = false): string {
        if (data.length === 0) return '';

        let pathString = `M ${data[0].anchor.x} ${data[0].anchor.y}`;

        for (let i = 0; i < data.length - 1; i++) {
            const p1 = data[i];
            const p2 = data[i + 1];
            pathString += ` C ${p1.handle2.x} ${p1.handle2.y}, ${p2.handle1.x} ${p2.handle1.y}, ${p2.anchor.x} ${p2.anchor.y}`;
        }

        if (isClosed && data.length > 1) {
            const last = data[data.length - 1];
            const first = data[0];

            // Check if handles are at anchor points (straight line closing)
            const lastHandleCollapsed = last.handle2.distanceFrom(last.anchor) < 1;
            const firstHandleCollapsed = first.handle1.distanceFrom(first.anchor) < 1;

            if (lastHandleCollapsed && firstHandleCollapsed) {
                // Straight line
                pathString += ` L ${first.anchor.x} ${first.anchor.y}`;
            } else {
                // Curved closing
                pathString += ` C ${last.handle2.x} ${last.handle2.y}, ${first.handle1.x} ${first.handle1.y}, ${first.anchor.x} ${first.anchor.y}`;
            }
            pathString += ' Z';
        }

        return pathString;
    }

    // Check if point is near first anchor
    private isNearFirstPoint(p: fabric.Point): boolean {
        return this.currentPathData.length > 1 && p.distanceFrom(this.currentPathData[0].anchor) < 10;
    }

    // Reset creation state
    private resetCreating(): void {
        this.removeVisualAids();
        this.currentPathData = [];
        this.isDragging = false;
        this.canvas.requestRenderAll();
    }

    // Remove visual aids
    private removeVisualAids(): void {
        this.canvas.remove(...this.visualAids);
        this.visualAids = [];
    }

    // Visual aid properties
    private getPreviewProps = (): fabric.IObjectOptions => ({
        selectable: false,
        evented: false,
        isPreviewObject: true,
        objectCaching: false
    });

    private getHandleLineProps = (): fabric.IObjectOptions => {
        const zoom = this.canvas.getZoom();
        return {
            ...this.getPreviewProps(),
            stroke: 'rgba(0, 191, 255, 0.7)',
            strokeWidth: 1 / zoom
        };
    };

    // Create visual controls with zoom-independent sizing
    private createAnchorControl = (p: fabric.Point, i: number) => {
        const zoom = this.canvas.getZoom();
        const size = 8 / zoom; // Scale inversely with zoom

        return new fabric.Rect({
            left: p.x,
            top: p.y,
            width: size,
            height: size,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 1 / zoom,
            originX: 'center',
            originY: 'center',
            evented: false,
            selectable: false,
            isPreviewObject: true,
        });
    };

    private createHandleControl = (p: fabric.Point, i: number, h: 'handle1' | 'handle2') => {
        const zoom = this.canvas.getZoom();
        const radius = 5 / zoom; // Scale inversely with zoom

        return new fabric.Circle({
            left: p.x,
            top: p.y,
            radius: radius,
            fill: 'cyan',
            stroke: 'black',
            strokeWidth: 1 / zoom,
            originX: 'center',
            originY: 'center',
            evented: false,
            selectable: false,
            isPreviewObject: true,
        });
    };

    // Finalize path creation
    private finalizePath(isClosed: boolean): void {
        if (this.currentPathData.length < 2) {
            this.resetCreating();
            return;
        }

        const state = this.controller.model.getState();
        const pathString = this.generatePathString(this.currentPathData, isClosed);

        const pathOptions: fabric.IPathOptions = {
            stroke: state.isDefaultStrokeEnabled ? state.defaultShapeStroke : 'transparent',
            strokeWidth: state.defaultShapeStrokeWidth,
            fill: isClosed && state.isDefaultFillEnabled ? state.defaultSolidFill : 'transparent',
            objectCaching: true,
            // Add these properties to improve rotation handling
            centeredRotation: true,
            centeredScaling: true,
            lockScalingFlip: true,
            lockSkewingX: true,
            lockSkewingY: true,
            noScaleCache: true,
            // Force Fabric.js to treat this as a simple object, not a complex path
            cacheProperties: ['fill', 'stroke', 'strokeWidth', 'angle'],

        };

        const path = new fabric.Path(pathString, pathOptions);

        const pathLeft = path.left || 0;
        const pathTop = path.top || 0;
        const pathOffsetX = path.pathOffset.x;
        const pathOffsetY = path.pathOffset.y;

        const relativeAnchorData = this.currentPathData.map(point => ({
            anchor: new fabric.Point(
                point.anchor.x - pathLeft - pathOffsetX,
                point.anchor.y - pathTop - pathOffsetY
            ),
            handle1: new fabric.Point(
                point.handle1.x - pathLeft - pathOffsetX,
                point.handle1.y - pathTop - pathOffsetY
            ),
            handle2: new fabric.Point(
                point.handle2.x - pathLeft - pathOffsetX,
                point.handle2.y - pathTop - pathOffsetY
            )
        }));

        path.set({
            id: uniqueId(),
            layerId: state.activeLayerId || undefined,
            isFillEnabled: isClosed && state.isDefaultFillEnabled,
            solidFill: state.defaultSolidFill,
            isGradientFillEnabled: isClosed && state.isDefaultGradientEnabled,
            gradientFill: state.defaultGradient,
            isStrokeEnabled: state.isDefaultStrokeEnabled,
            solidStroke: state.defaultShapeStroke,
            isPenObject: true,
            isPathClosed: isClosed,
            anchorData: relativeAnchorData
        });

        const dims = path._getNonTransformedDimensions();
        path.set({ width: dims.x, height: dims.y });
        path.setCoords();

        this.canvas.add(path);
        path.set({ evented: true });
        this.controller.saveStateToHistory();
        this.resetCreating();
    }

    // Update live path preview
    private updateLivePath(pointer?: fabric.Point): void {
        this.removeVisualAids();
        if (this.currentPathData.length === 0) return;

        const pathString = this.generatePathString(this.currentPathData);
        const livePath = new fabric.Path(pathString, {
            ...this.getPreviewProps(),
            stroke: 'black',
            fill: 'transparent'
        });
        this.visualAids.push(livePath);

        this.currentPathData.forEach((pointData) => {
            const anchorVisual = new fabric.Rect({
                left: pointData.anchor.x,
                top: pointData.anchor.y,
                width: 5,
                height: 5,
                fill: 'black',
                originX: 'center',
                originY: 'center',
                ...this.getPreviewProps()
            });
            this.visualAids.push(anchorVisual);
        });

        const lastPoint = this.currentPathData[this.currentPathData.length - 1];

        if (this.isDragging) {
            this.visualAids.push(
                new fabric.Line([lastPoint.anchor.x, lastPoint.anchor.y, lastPoint.handle1.x, lastPoint.handle1.y],
                    this.getHandleLineProps())
            );
            this.visualAids.push(
                new fabric.Line([lastPoint.anchor.x, lastPoint.anchor.y, lastPoint.handle2.x, lastPoint.handle2.y],
                    this.getHandleLineProps())
            );
            this.visualAids.push(this.createHandleControl(lastPoint.handle1, this.currentPathData.length - 1, 'handle1'));
            this.visualAids.push(this.createHandleControl(lastPoint.handle2, this.currentPathData.length - 1, 'handle2'));
        }

        if (pointer && !this.isDragging) {
            const rubberBand = new fabric.Line([lastPoint.anchor.x, lastPoint.anchor.y, pointer.x, pointer.y], {
                ...this.getHandleLineProps(),
                strokeDashArray: [5, 5]
            });
            this.visualAids.push(rubberBand);
        }

        this.canvas.add(...this.visualAids);
        this.canvas.requestRenderAll();
    }

    public isInEditMode(): boolean {
        return this.mode === 'EDITING';
    }

    public refreshEditHandles(): void {
        if (this.mode === 'EDITING' && this.editingObject) {
            this.renderEditHandles();
            this.canvas.requestRenderAll();
        }
    }

    /**
     * Get the effective vertex type for a point (with backwards compatibility)
     */
    private getVertexType(point: IAnchorPoint): VertexType {
        // Backwards compatibility: if no vertexType is set, infer from handle positions
        if (!point.vertexType) {
            const h1Dist = point.handle1.distanceFrom(point.anchor);
            const h2Dist = point.handle2.distanceFrom(point.anchor);

            // If both handles are collapsed, it's a corner
            if (h1Dist < 5 && h2Dist < 5) {
                return VertexType.CORNER;
            }

            // Check if handles are collinear (smooth or asymmetric)
            if (h1Dist > 5 && h2Dist > 5) {
                const angle1 = Math.atan2(point.handle1.y - point.anchor.y, point.handle1.x - point.anchor.x);
                const angle2 = Math.atan2(point.handle2.y - point.anchor.y, point.handle2.x - point.anchor.x);
                const angleDiff = Math.abs(angle1 - angle2);
                const normalizedDiff = Math.abs(angleDiff - Math.PI);

                if (normalizedDiff < 0.1) { // ~5.7 degrees tolerance
                    // Check if lengths are equal (smooth) or different (asymmetric)
                    const lengthDiff = Math.abs(h1Dist - h2Dist);
                    return lengthDiff < 5 ? VertexType.SMOOTH : VertexType.ASYMMETRIC;
                }
            }

            return VertexType.CORNER; // Default fallback
        }

        return point.vertexType;
    }

    // Enhanced updateEditingHandle method with vertex type support

    private updateEditingHandle(pointer: fabric.Point, isShiftDown: boolean): void {
        if (!this.draggedHandle || !this.editingAnchorData) return;

        const { pointIndex, handle } = this.draggedHandle;
        const pointData = this.editingAnchorData[pointIndex];

        // Get vertex type with backwards compatibility
        const vertexType = pointData.vertexType || VertexType.SMOOTH;

        if (handle === 'anchor') {
            // Moving the anchor point - move both handles with it
            const delta = pointer.subtract(pointData.anchor);
            pointData.anchor.setFromPoint(pointer);
            pointData.handle1.addEquals(delta);
            pointData.handle2.addEquals(delta);
        } else {
            // Handle dragging logic based on vertex type and modifiers
            const draggedHandleKey = handle as 'handle1' | 'handle2';
            const oppositeHandleKey = handle === 'handle1' ? 'handle2' : 'handle1';

            if (isShiftDown) {
                // Shift: Break symmetry - handle moves independently
                pointData[draggedHandleKey].setFromPoint(pointer);
                // Don't modify opposite handle when shift is held
            } else {
                // Normal drag behavior based on vertex type
                switch (vertexType) {
                    case VertexType.CORNER:
                        // Independent handle movement
                        pointData[draggedHandleKey].setFromPoint(pointer);
                        break;

                    case VertexType.SMOOTH:
                        // Symmetrical handle movement (your current behavior)
                        pointData[draggedHandleKey].setFromPoint(pointer);
                        const vector = pointData.anchor.subtract(pointer);
                        pointData[oppositeHandleKey].setFromPoint(pointData.anchor.add(vector));
                        break;

                    case VertexType.ASYMMETRIC:
                        // Collinear but independent lengths
                        pointData[draggedHandleKey].setFromPoint(pointer);

                        // Calculate direction and maintain collinearity
                        const dragVector = pointer.subtract(pointData.anchor);
                        const dragLength = dragVector.distanceFrom(new fabric.Point(0, 0));

                        if (dragLength > 0) {
                            const oppositeVector = pointData[oppositeHandleKey].subtract(pointData.anchor);
                            const oppositeLength = oppositeVector.distanceFrom(new fabric.Point(0, 0));

                            // Normalize and apply opposite direction with preserved length
                            const normalizedDrag = this.normalizeVector(dragVector);
                            pointData[oppositeHandleKey] = new fabric.Point(
                                pointData.anchor.x - normalizedDrag.x * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength),
                                pointData.anchor.y - normalizedDrag.y * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength)
                            );
                        }
                        break;
                }
            }
        }

        this.updateLivePreview();
        this.renderEditHandles();
    }

    private isHandleCollapsed(pointData: IAnchorPoint, handle: 'handle1' | 'handle2'): boolean {
        const distance = pointData[handle].distanceFrom(pointData.anchor);
        return distance < this.MIN_HANDLE_LENGTH;
    }

    private collapseHandle(pointData: IAnchorPoint, handle: 'handle1' | 'handle2'): void {
        // Collapse the handle to the anchor position
        pointData[handle].setFromPoint(pointData.anchor);
    }

    private extendHandle(pointData: IAnchorPoint, handle: 'handle1' | 'handle2'): void {
        const oppositeHandle = handle === 'handle1' ? 'handle2' : 'handle1';
        const oppositeVector = pointData[oppositeHandle].subtract(pointData.anchor);
        const oppositeLength = oppositeVector.distanceFrom(new fabric.Point(0, 0));

        if (oppositeLength > this.MIN_HANDLE_LENGTH) {
            // Extend in opposite direction of the other handle
            const normalizedOpposite = this.normalizeVector(oppositeVector);
            const extendLength = Math.max(30, oppositeLength * 0.5); // Default extend length
            pointData[handle] = new fabric.Point(
                pointData.anchor.x - normalizedOpposite.x * extendLength,
                pointData.anchor.y - normalizedOpposite.y * extendLength
            );
        } else {
            // If opposite handle is also collapsed, extend in a default direction
            const defaultLength = 30;
            const angle = handle === 'handle1' ? Math.PI : 0; // Left for handle1, right for handle2
            pointData[handle] = new fabric.Point(
                pointData.anchor.x + Math.cos(angle) * defaultLength,
                pointData.anchor.y + Math.sin(angle) * defaultLength
            );
        }
    }


    // New method for asymmetric handle behavior
    private updateAsymmetricHandle(
        pointData: IAnchorPoint,
        draggedHandle: 'handle1' | 'handle2',
        oppositeHandle: 'handle1' | 'handle2',
        pointer: fabric.Point
    ): void {
        // Update the dragged handle
        pointData[draggedHandle].setFromPoint(pointer);

        // Calculate the direction from anchor to dragged handle
        const dragVector = pointer.subtract(pointData.anchor);
        const dragLength = dragVector.distanceFrom(new fabric.Point(0, 0));

        if (dragLength > 0) {
            // Get the current length of the opposite handle
            const oppositeVector = pointData[oppositeHandle].subtract(pointData.anchor);
            const oppositeLength = oppositeVector.distanceFrom(new fabric.Point(0, 0));

            // Normalize the drag direction and apply it to the opposite handle with its current length
            const normalizedDrag = this.normalizeVector(dragVector);
            const oppositeDirection = new fabric.Point(-normalizedDrag.x, -normalizedDrag.y);

            pointData[oppositeHandle] = new fabric.Point(
                pointData.anchor.x + oppositeDirection.x * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength),
                pointData.anchor.y + oppositeDirection.y * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength)
            );
        }
    }

    // New method for shift-constrained straight line behavior
    private constrainHandleToStraightLine(
        pointData: IAnchorPoint,
        draggedHandle: 'handle1' | 'handle2',
        oppositeHandle: 'handle1' | 'handle2',
        pointer: fabric.Point
    ): void {
        const vector = pointer.subtract(pointData.anchor);
        const length = Math.max(this.MIN_HANDLE_LENGTH, vector.distanceFrom(new fabric.Point(0, 0)));
        const angle = Math.atan2(vector.y, vector.x);

        pointData[draggedHandle] = new fabric.Point(
            pointData.anchor.x + Math.cos(angle) * length,
            pointData.anchor.y + Math.sin(angle) * length
        );

        // Keep opposite handle straight and collinear
        const oppositeLength = pointData[oppositeHandle].distanceFrom(pointData.anchor);
        pointData[oppositeHandle] = new fabric.Point(
            pointData.anchor.x - Math.cos(angle) * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength),
            pointData.anchor.y - Math.sin(angle) * Math.max(this.MIN_HANDLE_LENGTH, oppositeLength)
        );
    }
}