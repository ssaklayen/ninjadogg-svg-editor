/**
 * Renders a modal dialog to warn the user about unsaved changes before
 * proceeding with a potentially destructive action (e.g., loading a new file).
 */
import React from 'react';
import { AppController } from '../../core/AppController';
import { Save, AlertTriangle, X } from 'lucide-react';
import { CloseUnsavedChangesModalCommand, DiscardChangesAndProceedCommand, OpenSaveModalCommand } from '../../patterns/command/implementations';
import { ModalBase } from './ModalBase';

/**
 * The modal component for handling unsaved changes.
 * @param controller The main application controller.
 */
export const UnsavedChangesModal = ({ controller }: { controller: AppController }) => {

    /**
     * Opens the save modal while keeping the pending action stored in the model.
     */
    const handleSave = () => {
        // PATTERN: Command
        controller.executeCommandWithoutHistory(CloseUnsavedChangesModalCommand, false); // Keep pending action
        controller.executeCommandWithoutHistory(OpenSaveModalCommand);
    }

    /**
     * Discards changes and executes the pending action stored in the model.
     */
    const handleDiscard = () => {
        // PATTERN: Command
        controller.executeCommandWithoutHistory(DiscardChangesAndProceedCommand);
    }

    /**
     * Cancels the operation and clears the pending action from the model.
     */
    const handleCancel = () => {
        // PATTERN: Command
        controller.executeCommandWithoutHistory(CloseUnsavedChangesModalCommand, true); // Clear pending action
    }

    return (
        <ModalBase onClose={handleCancel} widthClass="max-w-md">
            <div className="flex items-start">
                <div className="mr-4 text-status-warning">
                    <AlertTriangle size={32} />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold mb-2 select-none">Unsaved Changes</h2>
                    <p className="text-text-secondary mb-6 select-none">You have unsaved changes. Do you want to save your project before proceeding?</p>
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-4">
                <button
                    onClick={handleCancel}
                    className="bg-border-secondary hover:bg-background-tertiary text-text-primary font-bold py-2 px-4 rounded-md flex items-center gap-2"
                >
                    <X size={16} /> Cancel
                </button>
                <button
                    onClick={handleDiscard}
                    className="bg-status-danger hover:bg-status-danger-hover text-text-primary font-bold py-2 px-4 rounded-md"
                >
                    Discard Changes
                </button>
                <button
                    onClick={handleSave}
                    className="bg-accent-primary hover:bg-accent-primary-hover text-text-primary font-bold py-2 px-4 rounded-md flex items-center gap-2"
                >
                    <Save size={16} /> Save Project
                </button>
            </div>
        </ModalBase>
    );
};