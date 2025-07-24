// The strategy for drawing complex paths with Bezier curves using a pen tool.
import { fabric } from 'fabric';
import { Tool } from '../Tool';
import { AppController } from '../../../core/AppController';
import { UpdateCanvasStateCommand } from '../../command/implementations';
import { uniqueId } from '../../../utils/uniqueId';

type AnchorPoint = {
    anchor: fabric.Point;
    handle1: fabric.Point;
    handle2: fabric.Point;
};

// PATTERN: Strategy (Concrete) - Implements the vector pen tool behavior.
export class PenTool extends Tool {
    private isDragging: boolean = false;
    private lastMousePosition: fabric.Point | null = null;
    private visualAids: fabric.Object[] = [];
    private currentPath: AnchorPoint[] | null = null;

    constructor(controller: AppController) {
        super(controller);
    }

    public activate(): void {
        super.activate();
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.hoverCursor = 'crosshair';
        document.addEventListener('keydown', this.handleKeyDown);
    }

    public deactivate(): void {
        super.deactivate();
        if (this.currentPath) {
            this.finalizePath(false);
        }
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        if (!this.currentPath) return;

        if (e.key === 'Escape' || e.key === 'Enter') {
            e.preventDefault();
            this.finalizePath(false);
        }
    };

    public onDblClick(o: fabric.IEvent<MouseEvent>): void {
        if (this.currentPath && this.currentPath.length > 0) {
            this.finalizePath(false);
        } else {
            super.onDblClick(o);
        }
    }

    public onMouseDown(o: fabric.IEvent<MouseEvent>): void {
        if (!o.e) return;

        if (!this.currentPath) {
            this.currentPath = [];
        }

        const pointerCoords = this.canvas.getPointer(o.e);
        const pointer = this.controller.snapPointToGrid(new fabric.Point(pointerCoords.x, pointerCoords.y));
        this.lastMousePosition = pointer;
        const isShiftDown = o.e.shiftKey;

        if (this.currentPath.length > 1 && this.isNearFirstPoint(pointer)) {
            this.finalizePath(true, isShiftDown);
            return;
        }

        this.isDragging = true;
        this.state.origin = pointer.clone();

        const newPoint: AnchorPoint = { anchor: pointer, handle1: pointer.clone(), handle2: pointer.clone() };
        if (isShiftDown && this.currentPath.length > 0) {
            const prevPoint = this.currentPath[this.currentPath.length - 1];
            prevPoint.handle2 = prevPoint.anchor.clone();
            newPoint.handle1 = pointer.clone();
        }
        this.currentPath.push(newPoint);
        this.updateAndRender(pointer);
    }

    public onMouseMove(o: fabric.IEvent<MouseEvent>): void {
        if (!this.currentPath || !o.e) return;

        const pointerCoords = this.canvas.getPointer(o.e);
        const pointer = this.controller.snapPointToGrid(new fabric.Point(pointerCoords.x, pointerCoords.y));
        this.lastMousePosition = pointer;

        if (this.isDragging && this.state.origin) {
            const currentPoint = this.currentPath[this.currentPath.length - 1];
            if (!o.e.shiftKey) {
                const origin = this.state.origin;
                const dragVector = pointer.subtract(origin);
                currentPoint.handle2 = this.controller.snapPointToGrid(origin.add(dragVector));
                currentPoint.handle1 = this.controller.snapPointToGrid(origin.subtract(dragVector));
            } else {
                currentPoint.handle1 = currentPoint.anchor.clone();
                currentPoint.handle2 = currentPoint.anchor.clone();
            }
        }
        this.updateAndRender(pointer);
    }

    public onMouseUp(o: fabric.IEvent<MouseEvent>): void {
        if (!this.currentPath) return;
        this.isDragging = false;
        this.state.origin = null;
        this.updateAndRender(this.lastMousePosition);
    }

    private generatePathString(): string {
        if (!this.currentPath || this.currentPath.length === 0) return '';

        const pathCommands = this.currentPath.map((p, i) => {
            if (i === 0) return `M ${p.anchor.x} ${p.anchor.y}`;
            const prev = this.currentPath![i - 1];
            return `C ${prev.handle2.x} ${prev.handle2.y}, ${p.handle1.x} ${p.handle1.y}, ${p.anchor.x} ${p.anchor.y}`;
        });

        return pathCommands.join(' ');
    }

    private updateAndRender(mousePos?: fabric.Point | null) {
        if (!this.currentPath) return;

        this.visualAids.forEach(obj => this.canvas.remove(obj));
        this.visualAids = [];

        const pathString = this.generatePathString();
        if (pathString) this.visualAids.push(new fabric.Path(pathString, { stroke: 'black', strokeWidth: 2, fill: '', ...this.getPreviewProps() }));

        if (mousePos && this.currentPath.length > 0) {
            const lastPoint = this.currentPath[this.currentPath.length - 1];
            this.visualAids.push(new fabric.Line([lastPoint.anchor.x, lastPoint.anchor.y, mousePos.x, mousePos.y], { stroke: 'rgba(0, 191, 255, 0.7)', strokeWidth: 2, ...this.getPreviewProps() }));
        }

        this.currentPath.forEach((p) => {
            this.visualAids.push(this.createAnchorControl(p.anchor));
        });
        this.visualAids.forEach(obj => this.canvas.add(obj));
        this.canvas.renderAll();
    }

    // Creates the final Fabric.js path object from the anchor points.
    private finalizePath(isClosed: boolean, isShiftDown?: boolean) {
        if (!this.currentPath || this.currentPath.length < 2) {
            this.reset();
            return;
        }

        if (isClosed && !isShiftDown) {
            const pLast = this.currentPath[this.currentPath.length - 1];
            const pFirst = this.currentPath[0];
            if (this.currentPath.length > 1) {
                const pSecondToLast = this.currentPath[this.currentPath.length-2];
                if(pLast.handle1.eq(pLast.anchor)) pLast.handle1 = pLast.anchor.add(pLast.anchor.subtract(pSecondToLast.handle2));
            }
            pFirst.handle1 = pFirst.anchor.add(pFirst.anchor.subtract(pFirst.handle2));
        }

        let finalPathString = this.generatePathString();
        if (isClosed && this.currentPath.length > 1) {
            const pLast = this.currentPath[this.currentPath.length - 1];
            const pFirst = this.currentPath[0];
            finalPathString += ` C ${pLast.handle2.x} ${pLast.handle2.y}, ${pFirst.handle1.x} ${pFirst.handle1.y}, ${pFirst.anchor.x} ${pFirst.anchor.y} Z`;
        }

        const state = this.controller.model.getState();
        const path = new fabric.Path(finalPathString, {
            stroke: state.defaultShapeStroke,
            strokeWidth: state.defaultShapeStrokeWidth,
            fill: isClosed && state.isDefaultFillEnabled ? state.defaultSolidFill : 'transparent',
            selectable: false,
            evented: true,
            id: uniqueId(),
            layerId: state.activeLayerId || undefined,
            isFillEnabled: isClosed && state.isDefaultFillEnabled,
            solidFill: state.defaultSolidFill,
            isGradientFillEnabled: isClosed && state.isDefaultGradientEnabled,
            gradientFill: state.defaultGradient,
            isStrokeEnabled: state.isDefaultStrokeEnabled,
            solidStroke: state.defaultShapeStroke,
            objectCaching: false,
        } as any);

        this.canvas.add(path);

        this.controller.executeCommandWithoutHistory(UpdateCanvasStateCommand);
        this.controller.saveStateToHistory();
        this.reset();
    }

    private reset() {
        this.visualAids.forEach(obj => this.canvas.remove(obj));
        this.visualAids = [];
        this.currentPath = null;
        this.isDragging = false;
        this.state.origin = null;
        this.canvas.renderAll();
    }

    private isNearFirstPoint(p: fabric.Point): boolean {
        return this.currentPath !== null && this.currentPath.length > 1 && p.distanceFrom(this.currentPath[0].anchor) < 10;
    }

    private getPreviewProps = (): fabric.IObjectOptions => ({ selectable: false, evented: false, isPreviewObject: true, objectCaching: false, excludeFromExport: true });

    private createAnchorControl(point: fabric.Point): fabric.Rect {
        return new fabric.Rect({ left: point.x, top: point.y, width: 8, height: 8, fill: 'white', stroke: 'black', strokeWidth: 1, originX: 'center', originY: 'center', ...this.getPreviewProps() });
    }
}