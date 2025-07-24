// A toolbar button with a flyout gallery for selecting and loading stamp images.
import React, { useRef } from 'react';
import { Stamp, ChevronDown, Upload } from 'lucide-react';
import { AppController } from '../../core/AppController';
import { SetActiveToolCommand, SetActiveStampCommand, AddCustomStampCommand } from '../../patterns/command/implementations';
import { ICanvasState } from '../../types/types';
import { useFlyout } from '../../hooks/useFlyout';

interface StampToolButtonProps {
    controller: AppController;
    modelState: ICanvasState;
}

export const StampToolButton = ({ controller, modelState }: StampToolButtonProps) => {
    const { activeTool, activeStampSrc, stampGallery } = modelState;
    const { isOpen, setIsOpen, dropdownRef, getButtonProps } = useFlyout();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isStampToolActive = activeTool === 'stamp';

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // PATTERN: Command - Executes a command to add a custom stamp from a user file.
            controller.executeCommandWithoutHistory(AddCustomStampCommand, file);
        }
        setIsOpen(false);
    };

    const handleShortClick = () => {
        // PATTERN: Command - Executes a command to activate the stamp tool.
        controller.executeCommand(SetActiveToolCommand, 'stamp');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                {...getButtonProps(handleShortClick)}
                className={`p-3 rounded-lg w-full flex justify-center items-center relative ${isStampToolActive ? 'bg-accent-primary text-text-primary' : 'hover:bg-background-tertiary text-text-muted'}`}
                title="Stamp Tool"
            >
                <Stamp />
                <ChevronDown size={12} className="absolute bottom-1 right-1 text-text-primary opacity-75" />
            </button>

            {isOpen && (
                <div className="absolute left-full top-0 ml-2 w-72 bg-background-secondary border border-border-primary rounded-lg shadow-lg z-30 p-2">
                    <div className="grid grid-cols-5 gap-2">
                        {stampGallery.map(src => (
                            <button
                                key={src}
                                onClick={() => controller.executeCommandWithoutHistory(SetActiveStampCommand, src)}
                                className={`p-1.5 rounded-md flex justify-center items-center ${activeStampSrc === src ? 'bg-accent-primary' : 'bg-background-tertiary hover:bg-border-secondary'}`}
                                title={`Stamp`}
                            >
                                <img src={src} alt="Stamp" className="w-8 h-8 object-contain" />
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-border-primary my-2"></div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-md bg-accent-primary hover:bg-accent-primary-hover text-text-primary font-semibold text-sm"
                    >
                        <Upload size={16}/>
                        Custom Load
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/svg+xml,image/png"
                        onChange={handleFileChange}
                    />
                </div>
            )}
        </div>
    );
};