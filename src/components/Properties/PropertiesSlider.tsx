// The main sliding panel component that contains the `PropertiesContent`.
import React from 'react';
import { AppController } from '../../core/AppController';
import { ICanvasState } from '../../types/types';
import { PropertiesContent } from './PropertiesContent';

interface PropertiesSliderProps {
    isExpanded: boolean;
    controller: AppController;
    modelState: ICanvasState;
}

export const PropertiesSlider = ({ isExpanded, controller, modelState }: PropertiesSliderProps) => {
    return (
        <div className={`
            bg-background-primary h-full
            transition-[width] duration-300 ease-in-out
            overflow-hidden
            ${isExpanded ? 'w-56' : 'w-0'}
        `}>
            <div className="w-56 h-full">
                <PropertiesContent controller={controller} modelState={modelState} />
            </div>
        </div>
    );
};