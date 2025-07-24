// A utility function to generate a unique ID string.
export const uniqueId = (): string => `id_${Date.now().toString(36) + Math.random().toString(36).substr(2, 9)}`;