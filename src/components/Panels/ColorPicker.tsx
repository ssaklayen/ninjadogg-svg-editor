// src/components/Panels/ColorPicker.tsx
/**
 * A reusable pop-up component for color selection.
 * It renders outside of its parent's DOM tree using a React Portal to avoid clipping issues.
 * Provides a saturation/value map, a hue slider, and input fields for precise color control.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { hexToRgb, hsvToRgb, rgbToHsv, rgbToHex, HSV, RGB } from '../../utils/colorUtils';
import Portal from '../shared/Portal';

interface ColorPickerProps {
    initialColor: string;
    onChange: (color: string) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

const SWATCHES = [
    '#FFFFFF', '#C2C2C2', '#858585', '#474747', '#000000',
    '#FF5656', '#FFAD56', '#FBE661', '#96FB61', '#61FB85',
    '#61FBFB', '#6196FB', '#9661FB', '#F561FB', '#FB61A3',
];

export const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
    ({ initialColor, onChange, onClose, position }, ref) => {
        const [hsv, setHsv] = useState<HSV>({ h: 0, s: 100, v: 100 });
        const [rgb, setRgb] = useState<RGB>({ r: 255, g: 0, b: 0 });
        const [hex, setHex] = useState(initialColor);

        const saturationRef = useRef<HTMLDivElement>(null);
        const isDraggingSaturation = useRef(false);

        useEffect(() => {
            const initialRgb = hexToRgb(initialColor);
            if (initialRgb) {
                setRgb(initialRgb);
                setHsv(rgbToHsv(initialRgb));
                setHex(initialColor);
            }
        }, [initialColor]);

        const handleHsvChange = useCallback((newHsv: Partial<HSV>) => {
            const updatedHsv = { ...hsv, ...newHsv };
            setHsv(updatedHsv);
            const newRgb = hsvToRgb(updatedHsv);
            setRgb(newRgb);
            const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            setHex(newHex);
            onChange(newHex);
        }, [hsv, onChange]);

        const handleSaturationMouse = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
            if (!saturationRef.current) return;
            const rect = saturationRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            const s = (x / rect.width) * 100;
            const v = 100 - (y / rect.height) * 100;
            handleHsvChange({ s, v });
        };

        const handleSaturationMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
            isDraggingSaturation.current = true;
            handleSaturationMouse(e);
        };

        useEffect(() => {
            const handleMouseUp = () => { isDraggingSaturation.current = false; };
            const handleMouseMove = (e: MouseEvent) => {
                if (isDraggingSaturation.current) {
                    handleSaturationMouse(e);
                }
            };
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mousemove', handleMouseMove);
            return () => {
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }, [handleSaturationMouse]);


        const hueBackgroundColor = useMemo(() => {
            const { r, g, b } = hsvToRgb({ h: hsv.h, s: 100, v: 100 });
            return `rgb(${r}, ${g}, ${b})`;
        }, [hsv.h]);

        const handleSwatchClick = (color: string) => {
            onChange(color);
            onClose();
        };

        const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newHex = e.target.value;
            setHex(newHex);
            const newRgb = hexToRgb(newHex);
            if (newRgb) {
                setRgb(newRgb);
                const newHsv = rgbToHsv(newRgb);
                setHsv(newHsv);
                onChange(newHex);
            }
        }

        return (
            <Portal>
                <div
                    ref={ref}
                    style={{ position: 'absolute', top: `${position.top}px`, left: `${position.left}px` }}
                    className="w-64 bg-background-primary border border-border-primary rounded-lg shadow-2xl z-50 p-3 flex flex-col gap-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        ref={saturationRef}
                        onMouseDown={handleSaturationMouseDown}
                        className="relative w-full h-40 rounded-md cursor-crosshair"
                        style={{ backgroundColor: hueBackgroundColor }}
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white to-transparent" />
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black to-transparent" />
                        <div
                            className="absolute w-4 h-4 border-2 border-white rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${hsv.s}%`,
                                top: `${100 - hsv.v}%`,
                                backgroundColor: hex,
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <input
                            type="range"
                            min="0"
                            max="359.99"
                            step="0.01"
                            value={hsv.h}
                            onChange={(e) => handleHsvChange({ h: parseFloat(e.target.value) })}
                            className="hue-slider"
                        />
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-md border border-border-secondary" style={{ backgroundColor: hex }} />
                            <div className="flex flex-col text-xs font-mono">
                                <div className="flex items-center">
                                    <label className="w-8 text-text-muted">HEX</label>
                                    <input
                                        type="text"
                                        value={hex}
                                        onChange={handleHexChange}
                                        className="w-24 bg-background-tertiary text-text-primary p-1 rounded"
                                    />
                                </div>
                                <div className="flex items-center mt-1">
                                    <label className="w-8 text-text-muted">RGB</label>
                                    <input disabled value={`${rgb.r}, ${rgb.g}, ${rgb.b}`} className="w-24 bg-background-tertiary text-text-muted p-1 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                        {SWATCHES.map((swatch) => (
                            <button
                                key={swatch}
                                onClick={() => handleSwatchClick(swatch)}
                                className="w-full aspect-square rounded-md border border-border-secondary/50 hover:scale-110 transition-transform"
                                style={{ backgroundColor: swatch }}
                            />
                        ))}
                    </div>
                </div>
            </Portal>
        );
    }
);