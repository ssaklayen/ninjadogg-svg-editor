// src/components/Modal/SaveProjectModal.tsx
import React, { useState } from 'react';
import { AppController } from '../../core/AppController';
import { SaveProjectCommand, CloseModalsCommand } from '../../patterns/command/implementations';
import { ModalBase } from './ModalBase';

/**
 * The modal component for saving the project.
 * @param controller The main application controller.
 */
export const SaveProjectModal = ({ controller }: { controller: AppController }) => {
    const [filename, setFilename] = useState(() => controller.model.getState().projectName);

    /**
     * Executes the save command with the specified filename.
     */
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (filename.trim()) {
            // PATTERN: Command - Executes the command to save the project.
            controller.executeCommandWithoutHistory(SaveProjectCommand, filename.trim());
            handleClose();
        }
    };

    /**
     * Closes the modal without saving.
     */
    const handleClose = () => {
        // PATTERN: Command
        controller.executeCommandWithoutHistory(CloseModalsCommand);
    }

    return (
        <ModalBase onClose={handleClose} widthClass="max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-accent-secondary">Save Project</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label htmlFor="filename" className="block text-sm font-medium text-text-secondary mb-2">Filename</label>
                    <input
                        type="text"
                        id="filename"
                        name="filename"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        className="w-full bg-background-tertiary border border-border-secondary rounded-md px-3 py-2 text-text-primary"
                        autoFocus
                    />
                    <p className="text-xs text-text-muted mt-2">The `.json` extension will be added automatically.</p>
                </div>
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={handleClose} className="bg-border-secondary hover:bg-background-tertiary text-text-primary font-bold py-2 px-4 rounded-md">
                        Cancel
                    </button>
                    <button type="submit" className="bg-accent-primary hover:bg-accent-primary-hover text-text-primary font-bold py-2 px-4 rounded-md">
                        Save Project
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};