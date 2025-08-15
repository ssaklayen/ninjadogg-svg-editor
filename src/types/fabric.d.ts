// Add these properties to the fabric.Object interface in fabric.d.ts
// This shows what needs to be added to your existing fabric.d.ts file

import 'fabric';
import { IAnchorPoint, IGradientOptions } from './types';

declare module 'fabric' {
    namespace fabric {
        interface IObjectOptions {
            isPreviewObject?: boolean;
            isArtboard?: boolean;
            isPenHandle?: boolean;
            handleData?: { pointIndex: number; handle: 'anchor' | 'handle1' | 'handle2' };
        }

        interface Object {
            id?: string;
            layerId?: string;
            isGridLine?: boolean;
            isArtboard?: boolean;
            isLayerBackground?: boolean;
            isPreviewObject?: boolean;
            customPathData?: any;
            isGhostPreview?: boolean;

            isFillEnabled?: boolean;
            solidFill?: string;
            isGradientFillEnabled?: boolean;
            gradientFill?: IGradientOptions | null;

            isStrokeEnabled?: boolean;
            solidStroke?: string;

            isPenHandle?: boolean;
            handleData?: { pointIndex: number; handle: 'anchor' | 'handle1' | 'handle2' };

            isPenObject?: boolean;
            isPathClosed?: boolean;
            anchorData?: IAnchorPoint[];

            stopEventPropagation?: boolean;

            // Temporary property for transformation tracking
            _originalPathOffset?: Point;

            // ADD THIS: Property for storing original angle when grid is on
            _originalAngle?: number;

            fill: string | Pattern | Gradient;
            stroke: string | Pattern | Gradient;

            _originalTransform?: {
                angle: number;
                scaleX: number;
                scaleY: number;
                skewX: number;
                skewY: number;
            };

            // ADD THIS: Method signature - returns true for mtr, string for other corners, false for no corner
            _findTargetCorner?(pointer: Point): string | boolean;

            // ADD THIS: oCoords property
            oCoords?: Record<string, Point>;
        }

        interface Path {
            // Properties are inherited from fabric.Object
            pathOffset: Point;  // ADD THIS: Path offset is always present on Path objects
        }

        interface Canvas {
            isDragging?: boolean;
        }

        interface IEvent<E extends Event = Event> {
            selected?: Object[];
        }

        interface Group {
            _restoreObjectsState(): void;
            getObjects(): Object[];
        }

        interface IUtil {
            calcBoundsOfPoints(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number };
            transformPoint(point: Point, transform: number[]): Point;
            invertTransform(transform: number[]): number[];
        }

        // Export util as a const with IUtil interface
        const util: IUtil;

        // Define Matrix type
        type Matrix = number[];
    }
}