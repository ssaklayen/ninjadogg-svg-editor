import React, { useState, useRef, useEffect } from 'react';
import { IGradientOptions } from '../../types/types';
import { GradientPicker } from '../Panels/GradientPicker';
import { useColorPicker } from '../../hooks/useColorPicker';
import { ColorPicker } from '../Panels/ColorPicker';

interface FillPanelProps {
    isFillEnabled: boolean;
    onFillToggle: (enabled: boolean) => void;
    fillType: 'solid' | 'gradient';
    onFillTypeChange: (type: 'solid' | 'gradient') => void;
    solidColor: string | undefined;
    onSolidColorChange: (color: string) => void;
    gradient: IGradientOptions | null;
    onGradientChange: (gradient: IGradientOptions) => void;
    onGradientCommit: (gradient: IGradientOptions) => void;
    onCommit?: () => void;
}

export const FillPanel = (props: FillPanelProps) => {
    const { isFillEnabled, onFillToggle, fillType, onFillTypeChange, solidColor, onSolidColorChange, gradient, onGradientChange, onGradientCommit, onCommit } = props;
    const { isOpen, openPicker, closePicker, pickerRef, triggerRef, position } = useColorPicker(() => {
        if (onCommit) onCommit();
    });
    const [isEditingHex, setIsEditingHex] = useState(false);
    const [editingHexValue, setEditingHexValue] = useState((solidColor ?? '#000000').substring(1).toUpperCase());
    const hexInputRef = useRef<HTMLInputElement>(null);

    const displayColor = solidColor ?? '#000000';
    const isMixedValue = solidColor === undefined;

    useEffect(() => {
        if (!isEditingHex) {
            setEditingHexValue(displayColor.substring(1).toUpperCase());
        }
    }, [solidColor, isEditingHex, displayColor]);

    useEffect(() => {
        if (isEditingHex && hexInputRef.current) {
            hexInputRef.current.focus();
            hexInputRef.current.select();
        }
    }, [isEditingHex]);

    const handleHexDoubleClick = () => {
        setEditingHexValue(displayColor.substring(1).toUpperCase());
        setIsEditingHex(true);
    };

    const handleHexBlur = () => {
        setIsEditingHex(false);
    };

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = e.target.value.replace(/[^0-9A-F]/gi, '').toUpperCase().slice(0, 6);
        setEditingHexValue(sanitizedValue);
    };

    const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const finalHex = editingHexValue.padStart(6, '0');
            onSolidColorChange(`#${finalHex}`);
            if (onCommit) {
                onCommit();
            }
            hexInputRef.current?.blur();
        } else if (e.key === 'Escape') {
            hexInputRef.current?.blur();
        }
    }

    return (
        <div className="flex flex-col gap-3 border-b border-background-secondary pb-4">
            <div className="flex items-center justify-between">
                <label className="font-semibold text-text-muted select-none">Fill</label>
                <button
                    onClick={() => onFillToggle(!isFillEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 ${isFillEnabled ? 'bg-accent-primary' : 'bg-border-secondary'}`}>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isFillEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            {isFillEnabled && (
                <div className="pl-1 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button onClick={() => onFillTypeChange('solid')} className={`p-1.5 rounded-l-md ${fillType === 'solid' ? 'bg-accent-primary text-text-primary' : 'bg-background-tertiary hover:bg-border-secondary'}`}>Solid</button>
                        <button onClick={() => onFillTypeChange('gradient')} className={`p-1.5 rounded-r-md ${fillType === 'gradient' ? 'bg-accent-primary text-text-primary' : 'bg-background-tertiary hover:bg-border-secondary'}`}>Gradient</button>
                    </div>
                    {fillType === 'solid' ? (
                        <div className="flex items-center justify-between">
                            <label className="text-text-secondary select-none">Color</label>
                            <div className="flex items-center gap-2">
                                <button
                                    ref={triggerRef}
                                    onClick={openPicker}
                                    className="w-10 h-6 p-0 border border-border-secondary rounded-md bg-transparent cursor-pointer"
                                    style={{ background: isMixedValue ? 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' : displayColor }}
                                />
                                {isOpen && (
                                    <ColorPicker
                                        ref={pickerRef}
                                        position={position}
                                        initialColor={displayColor}
                                        onChange={onSolidColorChange}
                                        onClose={closePicker}
                                    />
                                )}
                                <div className="relative" onDoubleClick={handleHexDoubleClick}>
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted select-none text-xs">#</span>
                                    <input
                                        ref={hexInputRef}
                                        type="text"
                                        value={isEditingHex ? editingHexValue : (isMixedValue ? '' : displayColor.substring(1).toUpperCase())}
                                        placeholder={isMixedValue ? 'Multi' : ''}
                                        onBlur={handleHexBlur}
                                        onChange={handleHexChange}
                                        onKeyDown={handleHexKeyDown}
                                        readOnly={!isEditingHex}
                                        className={`w-20 bg-background-secondary rounded p-1 text-text-primary text-center text-xs font-mono placeholder:text-text-muted ${!isEditingHex ? 'select-none cursor-default' : ''}`}
                                        maxLength={6}
                                        tabIndex={!isEditingHex ? -1 : 0}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        gradient && <GradientPicker gradient={gradient} onChange={onGradientChange} onCommit={onGradientCommit} />
                    )}
                </div>
            )}
        </div>
    );
};