import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Pen,
    Eraser,
    Square,
    Circle,
    Type,
    Trash2,
    Download,
    Upload,
    Undo,
    Redo,
    Palette,
    Minus,
    MousePointer,
    Users,
    Eye,
    EyeOff
} from 'lucide-react';

interface DrawingAction {
    id: string;
    type: 'draw' | 'erase' | 'shape' | 'text';
    tool: string;
    color: string;
    thickness: number;
    points?: { x: number; y: number }[];
    shape?: {
        type: 'rectangle' | 'circle' | 'line';
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    };
    text?: {
        content: string;
        x: number;
        y: number;
        fontSize: number;
    };
    timestamp: number;
    userId: string;
    userName: string;
}

interface CollaborativeWhiteboardProps {
    sessionId: string;
    userId: string;
    userName: string;
    userRole: 'teacher' | 'student';
    isVisible: boolean;
    onClose: () => void;
    onToggleBreakout?: () => void;
    isInBreakout?: boolean;
    workspaceId?: string;
    onWorkspaceSwitch?: (workspaceId: string) => void;
    availableWorkspaces?: Array<{ id: string; name: string; userId: string; active: boolean }>;
    onCollaboratorJoin?: (userId: string, userName: string) => void;
    onReceiveAction?: (action: DrawingAction) => void;
    onSendAction?: (action: DrawingAction) => void;
}

const CollaborativeWhiteboard: React.FC<CollaborativeWhiteboardProps> = ({
    sessionId,
    userId,
    userName,
    userRole,
    isVisible,
    onClose,
    onToggleBreakout,
    isInBreakout = false,
    workspaceId = 'main',
    onWorkspaceSwitch,
    availableWorkspaces = [],
    onCollaboratorJoin,
    onReceiveAction,
    onSendAction
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'select'>('pen');
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentThickness, setCurrentThickness] = useState(2);
    const [actions, setActions] = useState<DrawingAction[]>([]);
    const [redoStack, setRedoStack] = useState<DrawingAction[]>([]);
    const [showCursors, setShowCursors] = useState(true);
    const [collaborators, setCollaborators] = useState<Map<string, { name: string; cursor: { x: number; y: number } }>>(new Map());

    const colors = [
        '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
        '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
    ];

    const thicknesses = [1, 2, 4, 6, 8, 12];

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth - 20;
                canvas.height = container.clientHeight - 100;
                redrawCanvas();
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isVisible]);

    // Redraw canvas from actions
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Redraw all actions
        actions.forEach(action => {
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            switch (action.type) {
                case 'draw':
                    if (action.points && action.points.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(action.points[0].x, action.points[0].y);
                        action.points.forEach(point => {
                            ctx.lineTo(point.x, point.y);
                        });
                        ctx.stroke();
                    }
                    break;

                case 'erase':
                    if (action.points && action.points.length > 1) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.lineWidth = action.thickness * 2;
                        ctx.beginPath();
                        ctx.moveTo(action.points[0].x, action.points[0].y);
                        action.points.forEach(point => {
                            ctx.lineTo(point.x, point.y);
                        });
                        ctx.stroke();
                        ctx.restore();
                    }
                    break;

                case 'shape':
                    if (action.shape) {
                        const { startX, startY, endX, endY, type } = action.shape;
                        ctx.beginPath();

                        switch (type) {
                            case 'rectangle':
                                ctx.strokeRect(startX, startY, endX - startX, endY - startY);
                                break;
                            case 'circle':
                                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                                ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                                ctx.stroke();
                                break;
                            case 'line':
                                ctx.moveTo(startX, startY);
                                ctx.lineTo(endX, endY);
                                ctx.stroke();
                                break;
                        }
                    }
                    break;

                case 'text':
                    if (action.text) {
                        ctx.fillStyle = action.color;
                        ctx.font = `${action.text.fontSize}px Arial`;
                        ctx.fillText(action.text.content, action.text.x, action.text.y);
                    }
                    break;
            }
        });

        // Draw collaborator cursors
        if (showCursors) {
            collaborators.forEach((collaborator, id) => {
                if (id !== userId) {
                    const { cursor, name } = collaborator;
                    ctx.save();
                    ctx.fillStyle = '#FF6B6B';
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;

                    // Draw cursor arrow
                    ctx.beginPath();
                    ctx.moveTo(cursor.x, cursor.y);
                    ctx.lineTo(cursor.x + 15, cursor.y + 10);
                    ctx.lineTo(cursor.x + 10, cursor.y + 15);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Draw name label
                    ctx.fillStyle = '#333333';
                    ctx.font = '12px Arial';
                    ctx.fillText(name, cursor.x + 20, cursor.y + 5);
                    ctx.restore();
                }
            });
        }
    }, [actions, collaborators, showCursors, userId]);

    // Redraw when actions change
    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    // Handle drawing
    const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentTool === 'select' || currentTool === 'text') return;

        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            const newAction: DrawingAction = {
                id: `${Date.now()}-${Math.random()}`,
                type: currentTool === 'pen' ? 'draw' : 'erase',
                tool: currentTool,
                color: currentColor,
                thickness: currentThickness,
                points: [{ x, y }],
                timestamp: Date.now(),
                userId,
                userName
            };

            setActions(prev => [...prev, newAction]);
            setRedoStack([]);
            onSendAction?.(newAction);
        }
    }, [currentTool, currentColor, currentThickness, userId, userName, onSendAction]);

    const continueDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || (currentTool !== 'pen' && currentTool !== 'eraser')) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setActions(prev => {
            const lastAction = prev[prev.length - 1];
            if (lastAction && lastAction.userId === userId) {
                const updatedAction = {
                    ...lastAction,
                    points: [...(lastAction.points || []), { x, y }]
                };
                onSendAction?.(updatedAction);
                return [...prev.slice(0, -1), updatedAction];
            }
            return prev;
        });

        // Update cursor position for collaborators
        setCollaborators(prev => {
            const updated = new Map(prev);
            updated.set(userId, { name: userName, cursor: { x, y } });
            return updated;
        });
    }, [isDrawing, currentTool, userId, userName, onSendAction]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    // Handle mouse move for cursor tracking
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDrawing) {
            continueDrawing(e);
        } else {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setCollaborators(prev => {
                const updated = new Map(prev);
                updated.set(userId, { name: userName, cursor: { x, y } });
                return updated;
            });
        }
    }, [isDrawing, continueDrawing, userId, userName]);

    // Undo/Redo functionality
    const handleUndo = useCallback(() => {
        if (actions.length > 0) {
            const lastAction = actions[actions.length - 1];
            setActions(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, lastAction]);
        }
    }, [actions]);

    const handleRedo = useCallback(() => {
        if (redoStack.length > 0) {
            const actionToRedo = redoStack[redoStack.length - 1];
            setActions(prev => [...prev, actionToRedo]);
            setRedoStack(prev => prev.slice(0, -1));
        }
    }, [redoStack]);

    // Clear canvas
    const handleClear = useCallback(() => {
        setActions([]);
        setRedoStack([]);
    }, []);

    // Export canvas
    const handleExport = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }, [sessionId]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <CardTitle className="flex items-center space-x-2">
                                <Pen className="h-5 w-5" />
                                <span>Collaborative Whiteboard</span>
                            </CardTitle>

                            {isInBreakout && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    Breakout Room
                                </Badge>
                            )}

                            <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span className="text-sm text-gray-600">
                                    {collaborators.size} active
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {userRole === 'teacher' && onToggleBreakout && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onToggleBreakout}
                                    className="text-blue-600 border-blue-300"
                                >
                                    {isInBreakout ? 'Return to Main' : 'Enter Breakout'}
                                </Button>
                            )}

                            {availableWorkspaces.length > 1 && onWorkspaceSwitch && (
                                <select
                                    value={workspaceId}
                                    onChange={(e) => onWorkspaceSwitch(e.target.value)}
                                    className="px-3 py-1 border rounded text-sm"
                                >
                                    {availableWorkspaces.map(workspace => (
                                        <option key={workspace.id} value={workspace.id}>
                                            {workspace.name} {workspace.active ? '(Active)' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <Button variant="outline" size="sm" onClick={onClose}>
                                ×
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        {/* Drawing Tools */}
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center bg-gray-100 rounded p-1">
                                {[
                                    { tool: 'select', icon: MousePointer, label: 'Select' },
                                    { tool: 'pen', icon: Pen, label: 'Pen' },
                                    { tool: 'eraser', icon: Eraser, label: 'Eraser' },
                                    { tool: 'rectangle', icon: Square, label: 'Rectangle' },
                                    { tool: 'circle', icon: Circle, label: 'Circle' },
                                    { tool: 'line', icon: Minus, label: 'Line' },
                                    { tool: 'text', icon: Type, label: 'Text' }
                                ].map(({ tool, icon: Icon, label }) => (
                                    <Button
                                        key={tool}
                                        variant={currentTool === tool ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setCurrentTool(tool as any)}
                                        title={label}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </Button>
                                ))}
                            </div>

                            <Separator orientation="vertical" className="h-8" />

                            {/* Colors */}
                            <div className="flex items-center space-x-1">
                                <Palette className="h-4 w-4 text-gray-600" />
                                {colors.map(color => (
                                    <button
                                        key={color}
                                        className={`w-6 h-6 rounded border-2 ${currentColor === color ? 'border-gray-600' : 'border-gray-300'}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setCurrentColor(color)}
                                    />
                                ))}
                            </div>

                            <Separator orientation="vertical" className="h-8" />

                            {/* Thickness */}
                            <div className="flex items-center space-x-1">
                                {thicknesses.map(thickness => (
                                    <Button
                                        key={thickness}
                                        variant={currentThickness === thickness ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentThickness(thickness)}
                                        className="w-8 h-8 p-0"
                                    >
                                        <div
                                            className="rounded-full bg-current"
                                            style={{ width: thickness, height: thickness }}
                                        />
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCursors(!showCursors)}
                                title="Toggle cursors"
                            >
                                {showCursors ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleUndo}
                                disabled={actions.length === 0}
                                title="Undo"
                            >
                                <Undo className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRedo}
                                disabled={redoStack.length === 0}
                                title="Redo"
                            >
                                <Redo className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClear}
                                title="Clear"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                title="Export"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-4">
                    <div className="w-full h-full border border-gray-300 rounded bg-white relative overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={handleMouseMove}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="cursor-crosshair absolute inset-0"
                            style={{
                                cursor: currentTool === 'eraser' ? 'grab' :
                                       currentTool === 'text' ? 'text' :
                                       currentTool === 'select' ? 'default' : 'crosshair'
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CollaborativeWhiteboard;
export type { DrawingAction };