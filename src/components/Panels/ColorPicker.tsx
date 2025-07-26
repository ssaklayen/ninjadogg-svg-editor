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
        const [isEditingHex, setIsEditingHex] = useState(false);
        const [editingHexValue, setEditingHexValue] = useState(initialColor.substring(1).toUpperCase());

        const saturationRef = useRef<HTMLDivElement>(null);
        const hexInputRef = useRef<HTMLInputElement>(null);
        const isDraggingSaturation = useRef(false);

        const updateColor = (newHex: string, source: 'picker' | 'hex' | 'rgb') => {
            const newRgb = hexToRgb(newHex);
            if (newRgb) {
                const newHsv = rgbToHsv(newRgb);
                setHex(newHex);
                setRgb(newRgb);
                setHsv(newHsv);
                if (source !== 'hex') {
                    setEditingHexValue(newHex.substring(1).toUpperCase());
                }
                onChange(newHex);
            }
        };

        useEffect(() => {
            updateColor(initialColor, 'picker');
        }, [initialColor]);

        const handleHsvChange = useCallback((newHsv: Partial<HSV>) => {
            const updatedHsv = { ...hsv, ...newHsv };
            const newRgb = hsvToRgb(updatedHsv);
            const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            updateColor(newHex, 'picker');
        }, [hsv, onChange]);

        const handleRgbChange = (channel: 'r' | 'g' | 'b', value: string) => {
            let numValue = parseInt(value, 10);
            if (isNaN(numValue)) numValue = 0;
            if (numValue < 0) numValue = 0;
            if (numValue > 255) numValue = 255;

            const newRgb = { ...rgb, [channel]: numValue };
            const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            updateColor(newHex, 'rgb');
        };

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

        useEffect(() => {
            if (isEditingHex && hexInputRef.current) {
                hexInputRef.current.focus();
                hexInputRef.current.select();
            }
        }, [isEditingHex]);

        const handleHexDoubleClick = () => {
            setEditingHexValue(hex.substring(1).toUpperCase());
            setIsEditingHex(true);
        };

        const handleHexBlur = () => {
            setIsEditingHex(false);
            setEditingHexValue(hex.substring(1).toUpperCase());
        };

        const handleHexValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const sanitizedValue = e.target.value.replace(/[^0-9A-F]/gi, '').toUpperCase().slice(0, 6);
            setEditingHexValue(sanitizedValue);
        };

        const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                const finalHex = editingHexValue.padStart(6, '0');
                updateColor(`#${finalHex}`, 'hex');
                hexInputRef.current?.blur();
            } else if (e.key === 'Escape') {
                hexInputRef.current?.blur();
            }
        }

        const hueBackgroundColor = useMemo(() => {
            const { r, g, b } = hsvToRgb({ h: hsv.h, s: 100, v: 100 });
            return `rgb(${r}, ${g}, ${b})`;
        }, [hsv.h]);

        const handleSwatchClick = (color: string) => {
            updateColor(color, 'picker');
        };

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
                            <div className="flex flex-col gap-1.5 text-xs font-mono w-full">
                                <div className="flex items-center justify-between" onDoubleClick={handleHexDoubleClick}>
                                    <label className="text-text-muted select-none">HEX</label>
                                    <div className="relative">
                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-text-muted select-none">#</span>
                                        <input
                                            ref={hexInputRef}
                                            type="text"
                                            value={isEditingHex ? editingHexValue : hex.substring(1).toUpperCase()}
                                            onBlur={handleHexBlur}
                                            onChange={handleHexValueChange}
                                            onKeyDown={handleHexKeyDown}
                                            readOnly={!isEditingHex}
                                            className={`w-24 bg-background-tertiary rounded p-1 text-text-primary text-center ${!isEditingHex ? 'select-none cursor-default' : ''}`}
                                            maxLength={6}
                                            tabIndex={!isEditingHex ? -1 : 0}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-text-muted select-none">RGB</label>
                                    <div className="flex items-center gap-1">
                                        {[ 'r', 'g', 'b' ].map((channel) => (
                                            <input
                                                key={channel}
                                                type="number"
                                                min="0"
                                                max="255"
                                                value={rgb[channel as keyof RGB]}
                                                onChange={(e) => handleRgbChange(channel as keyof RGB, e.target.value)}
                                                className="w-[3.2rem] bg-background-tertiary text-text-primary p-1 rounded text-center"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border-secondary">
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