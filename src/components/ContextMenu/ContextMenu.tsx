/**
 * Renders a context menu (right-click menu) that provides core actions
 * like copy, cut, and paste. Its visibility and position are controlled by the model state.
 */
import React from 'react';
import { ICanvasState } from '../../types/types';
import { AppController } from '../../core/AppController';
import { CopyCommand, CutCommand, PasteCommand, ShowContextMenuCommand } from '../../patterns/command/implementations';
import { ICommand } from '../../patterns/command/ICommand';

interface ContextMenuProps {
    controller: AppController;
    modelState: ICanvasState;
}

/**
 * The context menu component.
 * @param controller - The main application controller.
 * @param modelState - The current state of the canvas from the model.
 */
export const ContextMenu = ({ controller, modelState }: ContextMenuProps) => {
    const { contextMenuState, clipboard } = modelState;
    if (!contextMenuState.visible) return null;

    const menuStyle: React.CSSProperties = {
        position: 'absolute',
        top: `${contextMenuState.y}px`,
        left: `${contextMenuState.x}px`,
        zIndex: 100,
    };

    const isPasteDisabled = !clipboard || clipboard.objects.length === 0;

    /**
     * Executes a given command and then hides the context menu.
     * @param Command - The command class to be executed.
     * @param useHistory - Whether the command should be added to the undo/redo history.
     */
    const handleAction = (Command: new (controller: AppController) => ICommand, useHistory: boolean) => {
        // PATTERN: Command
        // The context menu dispatches command objects to the controller for execution.
        if (useHistory) {
            controller.executeCommand(Command as any);
        } else {
            controller.executeCommandWithoutHistory(Command as any);
        }
        controller.executeCommandWithoutHistory(ShowContextMenuCommand, { visible: false, x: 0, y: 0, type: 'object' });
    }

    const buttonClass = "w-full text-left px-3 py-1.5 hover:bg-accent-primary rounded-sm flex justify-between items-center gap-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent";

    return (
        <div
            style={menuStyle}
            className="bg-background-secondary border border-border-secondary rounded-md shadow-lg p-1 text-text-primary text-sm"
            // Stop propagation to prevent the window's mousedown listener from closing the menu immediately.
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button
                onClick={() => handleAction(CopyCommand, false)}
                className={buttonClass}
            >
                <span>Copy {contextMenuState.type === 'layer' ? 'Layer' : 'Object(s)'}</span>
                <span className="text-text-muted text-xs">Ctrl+C</span>
            </button>
            <button
                onClick={() => handleAction(CutCommand, true)}
                className={buttonClass}
            >
                <span>Cut {contextMenuState.type === 'layer' ? 'Layer' : 'Object(s)'}</span>
                <span className="text-text-muted text-xs">Ctrl+X</span>
            </button>
            <button
                onClick={() => handleAction(PasteCommand, true)}
                disabled={isPasteDisabled}
                className={buttonClass}
            >
                <span>Paste</span>
                <span className="text-text-muted text-xs">Ctrl+V</span>
            </button>
        </div>
    );
};