// FILE: src/components/Modal/NewCanvasModal.tsx
import React, { useState, useMemo } from 'react';
import { AppController } from '../../core/AppController';
import { CreateCanvasCommand } from '../../patterns/command/implementations';
import { IGradientOptions } from '../../types/types';
import { GradientPicker } from '../Panels/GradientPicker';
import { uniqueId } from '../../utils/uniqueId';
import { Link, Unlink } from 'lucide-react';
import { ModalBase } from './ModalBase';
import { useColorPicker } from '../../hooks/useColorPicker';
import { ColorPicker } from '../Panels/ColorPicker';

export const NewCanvasModal = ({ controller }: { controller: AppController }) => {
    const [projectName, setProjectName] = useState('new-ninjadogg-project');
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [isTransparent, setIsTransparent] = useState(false);
    const [isGradient, setIsGradient] = useState(false);
    const [bgColor, setBgColor] = useState('#ffffff');
    const [isLinked, setIsLinked] = useState(true);

    const { isOpen: isColorPickerOpen, openPicker, closePicker, pickerRef, triggerRef, position } = useColorPicker(() => {});

    const initialGradient = useMemo(() => ({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
        colorStops: [{ id: uniqueId(), offset: 0, color: '#4facfe' }, { id: uniqueId(), offset: 1, color: '#00f2fe' }]
    } as IGradientOptions), []);
    const [gradient, setGradient] = useState<IGradientOptions>(initialGradient);

    const aspectRatio = useMemo(() => {
        if (width > 0 && height > 0) return width / height;
        return 4 / 3;
    }, [width, height]);

    const handleWidthChange = (newWidth: number) => {
        setWidth(newWidth);
        if (isLinked && newWidth > 0) {
            setHeight(Math.round(newWidth / aspectRatio));
        }
    };

    const handleHeightChange = (newHeight: number) => {
        setHeight(newHeight);
        if (isLinked && newHeight > 0) {
            setWidth(Math.round(newHeight * aspectRatio));
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (width > 0 && height > 0) {
            controller.executeCommand(CreateCanvasCommand, projectName, { width, height }, {
                isTransparent,
                isGradient,
                bgColor,
                gradient
            });
        }
    };

    const handleGradientToggle = (enabled: boolean) => {
        setIsGradient(enabled);
        if (enabled) {
            setIsTransparent(false);
        }
    }

    return (
        <ModalBase widthClass="max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-accent-secondary select-none">Create New Canvas</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="projectName" className="block text-sm font-medium text-text-secondary mb-2 select-none">Project Name</label>
                    <input
                        type="text"
                        id="projectName"
                        name="projectName"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        className="w-full bg-background-tertiary border border-border-secondary rounded-md px-3 py-2 text-text-primary"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label htmlFor="width" className="block text-sm font-medium text-text-secondary mb-2 select-none">Width (px)</label>
                        <input type="number" id="width" name="width" value={width} onChange={e => handleWidthChange(parseInt(e.target.value, 10) || 0)} className="w-full bg-background-tertiary border border-border-secondary rounded-md px-3 py-2 text-text-primary" />
                    </div>
                    <button type="button" onClick={() => setIsLinked(!isLinked)} className="self-end p-2 mb-1 bg-background-tertiary hover:bg-accent-primary rounded-md" title={isLinked ? "Unlink Aspect Ratio" : "Link Aspect Ratio"}>
                        {isLinked ? <Link size={20} /> : <Unlink size={20} />}
                    </button>
                    <div className="flex-1">
                        <label htmlFor="height" className="block text-sm font-medium text-text-secondary mb-2 select-none">Height (px)</label>
                        <input type="number" id="height" name="height" value={height} onChange={e => handleHeightChange(parseInt(e.target.value, 10) || 0)} className="w-full bg-background-tertiary border border-border-secondary rounded-md px-3 py-2 text-text-primary" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" id="transparentBg" name="transparentBg" checked={isTransparent} onChange={(e) => { setIsTransparent(e.target.checked); if (e.target.checked) setIsGradient(false); }} className="h-4 w-4 rounded border-border-secondary bg-background-tertiary text-accent-primary focus:ring-accent-primary-hover" disabled={isGradient} />
                    <label htmlFor="transparentBg" className="block text-sm font-medium text-text-secondary select-none">Transparent Background</label>
                </div>

                <div className={`transition-opacity ${isTransparent ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`flex items-center justify-between transition-opacity ${isGradient ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <label htmlFor="bgColor" className="text-sm font-medium text-text-secondary select-none">Solid Color</label>
                        <div className="relative">
                            <button
                                ref={triggerRef}
                                type="button"
                                onClick={openPicker}
                                className="w-10 h-10 border border-border-secondary rounded"
                                style={{ backgroundColor: bgColor }}
                            />
                            {isColorPickerOpen && (
                                <ColorPicker
                                    ref={pickerRef}
                                    position={position}
                                    initialColor={bgColor}
                                    onChange={setBgColor}
                                    onClose={closePicker}
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                        <label className="text-sm font-medium text-text-secondary select-none">Gradient</label>
                        <button type="button" onClick={() => handleGradientToggle(!isGradient)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none ${isGradient ? 'bg-accent-primary' : 'bg-border-secondary'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${isGradient ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {isGradient && (
                        <div className="mt-4">
                            <GradientPicker gradient={gradient} onChange={setGradient} onCommit={setGradient} />
                        </div>
                    )}
                </div>
                <button type="submit" className="w-full bg-accent-primary hover:bg-accent-primary-hover text-text-primary font-bold py-3 px-4 rounded-md mt-4">
                    Create
                </button>
            </form>
        </ModalBase>
    );
};