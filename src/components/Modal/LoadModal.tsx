// Renders a modal dialog for loading a project from a JSON file or importing an image.
// It supports drag-and-drop functionality for a better user experience.
import React, { useState, useRef } from 'react';
import { AppController } from '../../core/AppController';
import { CloseModalsCommand, LoadFileCommand } from '../../patterns/command/implementations';
import { UploadCloud, File } from 'lucide-react';
import { ModalBase } from './ModalBase';

// The modal component for loading files.
// @param controller The main application controller.
export const LoadModal = ({ controller }: { controller: AppController }) => {
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Validates and processes the selected file.
    // @param file The file to load.
    const handleFile = (file: File | null) => {
        if (!file) return;

        const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif', 'application/json'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.json')) {
            setError('Invalid file type. Please select an SVG, PNG, JPG, GIF, or JSON file.');
            return;
        }

        setError(null);
        // PATTERN: Command - Executes the LoadFileCommand to handle different file types.
        controller.executeCommand(LoadFileCommand, file);
        handleClose();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleClose = () => {
        // PATTERN: Command
        controller.executeCommandWithoutHistory(CloseModalsCommand);
    }

    return (
        <ModalBase onClose={handleClose}>
            <h2 className="text-2xl font-bold mb-6 text-accent-secondary select-none">Load Project or Image</h2>

            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center ${dragging ? 'border-accent-secondary bg-background-tertiary' : 'border-border-secondary hover:border-accent-primary-hover'}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".json, .svg, .png, .jpg, .jpeg, .gif"
                    onChange={handleFileSelect}
                />
                <div className="flex flex-col items-center justify-center gap-4">
                    <UploadCloud size={48} className="text-text-muted" />
                    <p className="text-text-muted select-none">Drag & drop your file here</p>
                    <p className="text-text-muted text-sm select-none">or</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-accent-primary hover:bg-accent-primary-hover text-text-primary font-bold py-2 px-6 rounded-md flex items-center gap-2"
                    >
                        <File size={16} /> Select File
                    </button>
                </div>
            </div>

            {error && <p className="text-status-danger text-sm mt-4 text-center">{error}</p>}

            <p className="text-xs text-text-muted mt-4 text-center select-none">Supported files: JSON, SVG, PNG, JPG, GIF</p>

            <div className="mt-8 text-right">
                <button onClick={handleClose} className="bg-border-secondary hover:bg-background-tertiary text-text-primary font-bold py-2 px-4 rounded-md">
                    Cancel
                </button>
            </div>
        </ModalBase>
    );
};