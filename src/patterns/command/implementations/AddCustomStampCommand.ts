// Command to add a custom stamp from a user-provided file.
import { ICommand } from "../ICommand";
import { AppController } from "../../../core/AppController";

// PATTERN: Command - Encapsulates the action of adding a custom stamp.
export class AddCustomStampCommand implements ICommand {
    constructor(private controller: AppController, private file: File) {}

    public async execute(): Promise<void> {
        if (!this.file || !this.file.type.startsWith('image/')) {
            console.error("Invalid file type for custom stamp.");
            return;
        }

        const readAsDataURL = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        };

        try {
            const dataUrl = await readAsDataURL(this.file);
            const currentState = this.controller.model.getState();
            const newGallery = [...currentState.stampGallery, dataUrl];

            this.controller.model.setState({
                stampGallery: newGallery,
                activeStampSrc: dataUrl,
            });

        } catch (error) {
            console.error("Error loading custom stamp:", error);
        }
    }
}