// FILE: src\components\Layers\LayersPanel.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Trash2, Edit2, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { ILayer, PreviewBackground } from '../../types/types';
import { AppController } from '../../core/AppController';
import { fabric } from 'fabric';
import {
    ReorderLayersCommand, ToggleLayerVisibilityCommand,
    DeleteLayerCommand, ChangeLayerOpacityCommand, RenameLayerCommand, SetActiveLayerCommand, ToggleLayerLockCommand, ToggleLayerPreviewBackgroundCommand
} from '../../patterns/command/implementations';
import { debounce } from '../../utils/debounce';

const patternCache: { [key: string]: fabric.Pattern } = {};

const getCheckerboardPattern = (
    key: 'dark' | 'light',
    colors: { light: string, dark: string }
): Promise<fabric.Pattern | null> => {
    if (patternCache[key]) {
        return Promise.resolve(patternCache[key]);
    }

    return new Promise((resolve) => {
        const patternSize = 8;
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternCanvas.height = patternSize;
        const ctx = patternCanvas.getContext('2d');
        if (!ctx) {
            resolve(null);
            return;
        }

        ctx.fillStyle = colors.dark;
        ctx.fillRect(0, 0, patternSize, patternSize);
        ctx.fillStyle = colors.light;
        ctx.fillRect(0, 0, patternSize / 2, patternSize / 2);
        ctx.fillRect(patternSize / 2, patternSize / 2, patternSize / 2, patternSize / 2);

        fabric.Image.fromURL(patternCanvas.toDataURL(), (img) => {
            const pattern = new fabric.Pattern({
                source: img.getElement() as HTMLImageElement,
                repeat: 'repeat'
            });
            patternCache[key] = pattern;
            resolve(pattern);
        });
    });
};

const renderLayerPreview = async (
    layer: ILayer,
    previewCanvas: fabric.StaticCanvas,
    layerObjects: fabric.Object[]
) => {
    if (!previewCanvas) return;

    previewCanvas.clear();

    const renderWithBackground = (backgroundColor: fabric.Pattern | string | null) => {
        previewCanvas.setBackgroundColor(backgroundColor || '#4a5568', () => {
            if (layerObjects.length === 0) {
                previewCanvas.renderAll();
                return;
            }

            const clonePromises = layerObjects.map(obj => new Promise<fabric.Object>(resolve => {
                obj.clone((cloned: fabric.Object) => resolve(cloned));
            }));

            Promise.all(clonePromises).then(clonedObjects => {
                if (clonedObjects.length === 0) {
                    previewCanvas.renderAll();
                    return;
                }

                const group = new fabric.Group(clonedObjects);
                group.opacity = layer.opacity;

                const bBox = group.getBoundingRect();
                if (bBox.width === 0 || bBox.height === 0) {
                    previewCanvas.renderAll();
                    return;
                }

                const padding = 8;
                const scaleX = (previewCanvas.getWidth() - padding) / bBox.width;
                const scaleY = (previewCanvas.getHeight() - padding) / bBox.height;
                const scale = Math.min(scaleX, scaleY);

                group.scale(scale);
                group.setPositionByOrigin(
                    new fabric.Point(previewCanvas.getWidth() / 2, previewCanvas.getHeight() / 2),
                    'center',
                    'center'
                );

                previewCanvas.add(group);
                previewCanvas.renderAll();
            });
        });
    };

    const backgroundType: PreviewBackground = layer.previewBackground || 'dark';
    let backgroundColor: fabric.Pattern | string | null = null;

    switch (backgroundType) {
        case 'flat-dark':
            backgroundColor = '#3a4150';
            break;
        case 'flat-white':
            backgroundColor = '#ffffff';
            break;
        case 'light':
            backgroundColor = await getCheckerboardPattern('light', { light: '#ffffff', dark: '#f0f0f0' });
            break;
        case 'dark':
        default:
            backgroundColor = await getCheckerboardPattern('dark', { light: '#4a5568', dark: '#3a4150' });
            break;
    }

    renderWithBackground(backgroundColor);
};

interface LayersPanelProps {
    layers: ILayer[];
    activeLayerId: string | null;
    controller: AppController;
}

export const LayersPanel = ({ layers, activeLayerId, controller }: LayersPanelProps) => {
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ index: number; position: 'top' | 'bottom' } | null>(null);
    const previewCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const fabricCanvasInstances = useRef<Map<string, fabric.StaticCanvas>>(new Map());
    const layersRef = useRef(layers);

    useEffect(() => {
        layersRef.current = layers;
    }, [layers]);

    useEffect(() => {
        const instances = fabricCanvasInstances.current;
        return () => {
            instances.forEach(canvas => canvas.dispose());
            instances.clear();
        };
    }, []);

    useEffect(() => {
        const mainCanvas = controller.fabricCanvas;
        if (!mainCanvas) return;

        const updatePreviews = (layerIdsToUpdate: string[]) => {
            if (layerIdsToUpdate.length === 0) return;

            const objectsByLayer = mainCanvas.getObjects().reduce((acc, obj) => {
                if (obj.layerId && !obj.isGridLine && !obj.isPreviewObject) {
                    (acc[obj.layerId] = acc[obj.layerId] || []).push(obj);
                }
                return acc;
            }, {} as { [key: string]: fabric.Object[] });

            const uniqueLayerIds = Array.from(new Set(layerIdsToUpdate));

            uniqueLayerIds.forEach(layerId => {
                const layer = layersRef.current.find(l => l.id === layerId);
                const index = layersRef.current.findIndex(l => l.id === layerId);
                const canvasEl = previewCanvasRefs.current[index];
                const layerObjects = objectsByLayer[layerId] || [];

                if (layer && canvasEl) {
                    let previewCanvas = fabricCanvasInstances.current.get(layer.id);
                    if (!previewCanvas) {
                        previewCanvas = new fabric.StaticCanvas(canvasEl);
                        fabricCanvasInstances.current.set(layer.id, previewCanvas);
                    }
                    renderLayerPreview(layer, previewCanvas, layerObjects);
                }
            });
        };

        const debouncedUpdate = debounce(updatePreviews, 50);

        const allLayerIds = layersRef.current.map(l => l.id);
        if (allLayerIds.length > 0) {
            updatePreviews(allLayerIds);
        }

        const handleModification = (e: fabric.IEvent) => {
            if (!e.target) return;
            const target = e.target;
            const layerIds = new Set<string>();

            if (target.type === 'activeSelection') {
                (target as fabric.ActiveSelection).getObjects().forEach(obj => {
                    if (obj.layerId) layerIds.add(obj.layerId);
                });
            } else {
                if (target.layerId) layerIds.add(target.layerId);
            }

            if (layerIds.size > 0) {
                debouncedUpdate(Array.from(layerIds));
            }
        };

        mainCanvas.on('object:added', handleModification);
        mainCanvas.on('object:modified', handleModification);
        mainCanvas.on('object:removed', handleModification);

        return () => {
            if (mainCanvas) {
                mainCanvas.off('object:added', handleModification);
                mainCanvas.off('object:modified', handleModification);
                mainCanvas.off('object:removed', handleModification);
            }
        };
    }, [controller.fabricCanvas, layers]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.toString());
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';

        if (!dropIndicator || dropIndicator.index !== index || dropIndicator.position !== position) {
            setDropIndicator({ index, position });
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropIndicator(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (draggedIndex === null || !dropIndicator) {
            setDraggedIndex(null);
            setDropIndicator(null);
            return;
        }

        const { index: dropIndex, position } = dropIndicator;
        const reorderedLayers = [...layers];
        const [draggedItem] = reorderedLayers.splice(draggedIndex, 1);

        let targetIndex = dropIndex;
        if (position === 'bottom') {
            targetIndex = dropIndex + 1;
        }

        if (draggedIndex < targetIndex) {
            targetIndex--;
        }

        reorderedLayers.splice(targetIndex, 0, draggedItem);
        controller.executeCommand(ReorderLayersCommand, reorderedLayers);

        setDraggedIndex(null);
        setDropIndicator(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDropIndicator(null);
    };

    const handleRename = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>, layer: ILayer) => {
        const newName = e.currentTarget.value.trim();
        if (newName && newName !== layer.name) {
            controller.executeCommand(RenameLayerCommand, layer.id, newName);
        }
        setEditingLayerId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, layer: ILayer) => {
        if (e.key === 'Enter') handleRename(e, layer);
        else if (e.key === 'Escape') setEditingLayerId(null);
    };

    return (
        <div className="flex flex-col text-sm h-full">
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-1" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                {layers.map((layer: ILayer, index: number) => (
                    <div
                        key={layer.id}
                        className="relative"
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                    >
                        {dropIndicator && dropIndicator.index === index && dropIndicator.position === 'top' && (
                            <div className="absolute -top-1 left-0 right-0 h-1.5 bg-accent-secondary z-10 rounded-full" />
                        )}
                        <div
                            onClick={() => controller.executeCommandWithoutHistory(SetActiveLayerCommand, layer.id)}
                            className={`p-2 rounded-md mb-1.5 flex flex-col gap-2 border-2 transition-all duration-150
                                ${activeLayerId === layer.id ? 'border-accent-primary bg-background-tertiary' : 'border-transparent bg-background-secondary hover:bg-background-tertiary/70'}
                                ${draggedIndex === index ? 'shadow-2xl scale-105' : 'opacity-100'}`}
                        >
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                className="flex items-center gap-2 cursor-grab"
                            >
                                <button onClick={(e) => { e.stopPropagation(); setEditingLayerId(layer.id);}} className="text-text-muted hover:text-text-primary"><Edit2 size={14}/></button>
                                {editingLayerId === layer.id ? (
                                    <input
                                        type="text"
                                        defaultValue={layer.name}
                                        onBlur={(e) => handleRename(e, layer)}
                                        onKeyDown={(e) => handleKeyDown(e, layer)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full bg-border-secondary text-text-primary p-1 rounded text-xs"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="truncate text-sm font-semibold" title={layer.name}>
                                        {layer.name}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <canvas
                                    ref={el => previewCanvasRefs.current[index] = el}
                                    width="200"
                                    height="100"
                                    className="flex-1 h-auto bg-border-secondary rounded border border-border-secondary/50"
                                    style={{ imageRendering: 'crisp-edges' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        controller.executeCommandWithoutHistory(ToggleLayerPreviewBackgroundCommand, layer.id);
                                    }}
                                />
                                <div className="flex flex-col items-center gap-1.5 text-text-muted" onMouseDown={(e) => e.stopPropagation()}>
                                    <button onClick={() => controller.executeCommand(ToggleLayerVisibilityCommand, layer.id)} className="hover:text-text-primary p-1">
                                        {layer.isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                                    </button>
                                    <button onClick={() => controller.executeCommand(ToggleLayerLockCommand, layer.id)} className="hover:text-text-primary p-1">
                                        {layer.isLocked ? <LockKeyhole size={16}/> : <UnlockKeyhole size={16}/>}
                                    </button>
                                    <button onClick={() => controller.executeCommand(DeleteLayerCommand, layer.id)} disabled={layers.length <= 1}
                                            className="disabled:opacity-30 hover:text-text-primary p-1"><Trash2 size={16}/></button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs" onMouseDown={(e) => e.stopPropagation()}>
                                <span className="text-text-muted">Opacity</span>
                                <input
                                    className="w-full h-1.5 bg-border-secondary rounded-lg appearance-none cursor-pointer accent-accent-primary-hover"
                                    type="range"
                                    min="0" max="1"
                                    step="0.01"
                                    value={layer.opacity}
                                    onChange={(e) => controller.executeCommandWithoutHistory(ChangeLayerOpacityCommand, layer.id, parseFloat(e.target.value))}
                                    onMouseUp={() => controller.saveStateToHistory()}
                                />
                                <span className="w-7 text-right text-text-secondary font-mono text-xs">{Math.round(layer.opacity * 100)}</span>
                            </div>
                        </div>
                        {dropIndicator && dropIndicator.index === index && dropIndicator.position === 'bottom' && (
                            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-accent-secondary z-10 rounded-full" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};