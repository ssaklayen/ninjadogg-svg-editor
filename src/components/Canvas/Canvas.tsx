/**
 * A simple presentational component that renders the HTML <canvas> element.
 * It receives a ref that is passed to the AppController to initialize Fabric.js.
 */
import React from 'react';
import {CanvasSize} from '../../types/types';

interface CanvasProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    canvasSize: CanvasSize;
}

/**
 * The core canvas component where all drawing occurs.
 * @param canvasRef - A ref to the underlying HTML canvas element.
 * @param canvasSize - The dimensions of the canvas.
 */
export const Canvas = ({canvasRef, canvasSize}: CanvasProps) => (
    <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height}/>
);