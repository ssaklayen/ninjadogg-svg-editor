// Renders a modal dialog that allows the user to export the canvas
// to various image formats (SVG, PNG, JPEG, GIF).
import React, { useState } from 'react';
import { AppController } from '../../core/AppController';
import { CloseModalsCommand, ExportCommand } from '../../patterns/command/implementations';
import { Image, FileType, Film, GitBranch } from 'lucide-react';
import { ModalBase } from './ModalBase';

// The modal component for exporting the canvas.
// @param controller The main application controller.
export const ExportModal = ({ controller }: { controller: AppController }) => {
    const [filename, setFilename] = useState(() => controller.model.getState().projectName);

    // Executes the export command with the specified format and filename.
    const handleExport = (format: 'svg' | 'png' | 'jpeg' | 'gif') => {
        if (!filename.trim()) return;
        // PATTERN: Command
        controller.executeCommandWithoutHistory(ExportCommand, format, filename.trim());
        controller.executeCommandWithoutHistory(CloseModalsCommand);
    };

    // Closes the modal without exporting.
    const handleClose = () => {
        // PATTERN: Command
        controller.executeCommandWithoutHistory(CloseModalsCommand);
    }

    return (
        <ModalBase onClose={handleClose}>
            <h2 className="text-2xl font-bold mb-6 text-accent-secondary">Export Canvas</h2>

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
                <p className="text-xs text-text-muted mt-2">The file extension will be added automatically.</p>
            </div>

            <p className="text-text-muted mb-4">Choose a format to export your creation.</p>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleExport('svg')} className="flex items-center gap-4 p-4 bg-background-tertiary hover:bg-accent-primary rounded-md">
                    <FileType size={32} />
                    <div>
                        <p className="font-bold text-left">SVG</p>
                        <p className="text-xs text-text-muted text-left">Scalable Vector</p>
                    </div>
                </button>
                <button onClick={() => handleExport('png')} className="flex items-center gap-4 p-4 bg-background-tertiary hover:bg-accent-primary rounded-md">
                    <Image size={32} />
                    <div>
                        <p className="font-bold text-left">PNG</p>
                        <p className="text-xs text-text-muted text-left">Transparent Image</p>
                    </div>
                </button>
                <button onClick={() => handleExport('gif')} className="flex items-center gap-4 p-4 bg-background-tertiary hover:bg-accent-primary rounded-md">
                    <Film size={32} />
                    <div>
                        <p className="font-bold text-left">GIF</p>
                        <p className="text-xs text-text-muted text-left">Image Sequence</p>
                    </div>
                </button>
                <button onClick={() => handleExport('jpeg')} className="flex items-center gap-4 p-4 bg-background-tertiary hover:bg-accent-primary rounded-md">
                    <GitBranch size={32} />
                    <div>
                        <p className="font-bold text-left">JPG</p>
                        <p className="text-xs text-text-muted text-left">Compressed Image</p>
                    </div>
                </button>
            </div>
            <div className="mt-8 text-right">
                <button onClick={handleClose} className="bg-border-secondary hover:bg-background-tertiary text-text-primary font-bold py-2 px-4 rounded-md">
                    Cancel
                </button>
            </div>
        </ModalBase>
    );
};