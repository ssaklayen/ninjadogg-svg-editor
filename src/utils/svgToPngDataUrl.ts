// A utility function to convert an SVG URL to a PNG data URL.
export const svgToPngDataUrl = (svgUrl: string, size: number = 32): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, size, size);
            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = (err) => {
            reject(err);
        };

        img.src = svgUrl;
    });
};