import React, { useRef, useEffect, useState } from 'react';

// Define the structure of a line for type safety
export interface Line {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
}

interface WhiteboardPanelProps {
    lines: Line[];
    isTeacher: boolean;
    onDraw: (line: Line) => void;
}

export const WhiteboardPanel: React.FC<WhiteboardPanelProps> = ({ lines, isTeacher, onDraw }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const drawLine = (ctx: CanvasRenderingContext2D, line: Line) => {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
    };
    
    // This effect redraws the entire canvas whenever the `lines` array changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas.getBoundingClientRect();
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        lines.forEach(line => drawLine(ctx, line));
    }, [lines]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isTeacher) return;
        const pos = getMousePos(e);
        setIsDrawing(true);
        lastPos.current = pos;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isTeacher || !isDrawing) return;
        const pos = getMousePos(e);
        const newLine: Line = {
            x1: lastPos.current.x,
            y1: lastPos.current.y,
            x2: pos.x,
            y2: pos.y,
            color: '#FFFFFF' // Or make this dynamic
        };
        onDraw(newLine); // Send the new line segment to the parent
        lastPos.current = pos;
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    };

    return (
        <div className="w-full h-full bg-slate-800 border-t-2 border-slate-600 p-2 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex-shrink-0">Shared Whiteboard</h3>
            <div className="flex-grow w-full h-full overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full bg-slate-700 rounded-md ${isTeacher ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
        </div>
    );
};
// import React, { useRef, useEffect, useState } from 'react';

// // Define the structure of a line for type safety
// interface Line {
//     x1: number;
//     y1: number;
//     x2: number;
//     y2: number;
// }

// interface WhiteboardPanelProps {
//     lines: Line[];
//     isTeacher: boolean;
//     onDraw: (line: Line) => void;
// }

// export const WhiteboardPanel: React.FC<WhiteboardPanelProps> = ({ lines, isTeacher, onDraw }) => {
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const [isDrawing, setIsDrawing] = useState(false);
//     const [startPos, setStartPos] = useState({ x: 0, y: 0 });

//     // This effect redraws the entire canvas whenever the `lines` array changes
//     useEffect(() => {
//         const canvas = canvasRef.current;
//         if (!canvas) return;
//         const ctx = canvas.getContext('2d');
//         if (!ctx) return;

//         // Ensure canvas is sized correctly
//         const { width, height } = canvas.getBoundingClientRect();
//         if (canvas.width !== width || canvas.height !== height) {
//             canvas.width = width;
//             canvas.height = height;
//         }

//         // Clear the canvas
//         ctx.clearRect(0, 0, canvas.width, canvas.height);

//         // Redraw all lines
//         ctx.strokeStyle = '#FFFFFF';
//         ctx.lineWidth = 2;
//         ctx.lineCap = 'round';
//         lines.forEach(line => {
//             ctx.beginPath();
//             ctx.moveTo(line.x1, line.y1);
//             ctx.lineTo(line.x2, line.y2);
//             ctx.stroke();
//         });
//     }, [lines]);

//     const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
//         const rect = canvasRef.current!.getBoundingClientRect();
//         return {
//             x: e.clientX - rect.left,
//             y: e.clientY - rect.top,
//         };
//     };

//     const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
//         if (!isTeacher) return;
//         const pos = getMousePos(e);
//         setIsDrawing(true);
//         setStartPos(pos);
//     };

//     const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
//         if (!isTeacher || !isDrawing) return;
//         const pos = getMousePos(e);
//         const ctx = canvasRef.current!.getContext('2d')!;
        
//         // Draw line for immediate feedback
//         ctx.beginPath();
//         ctx.moveTo(startPos.x, startPos.y);
//         ctx.lineTo(pos.x, pos.y);
//         ctx.stroke();

//         // For smoother drawing, we could send intermediate points, but this is simpler.
//         // We'll just update the start position to the new position for the next segment.
//         setStartPos(pos);
//     };

//     const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
//         if (!isTeacher) return;
//         setIsDrawing(false);
//         // The onDraw event is what sends the final line to the server.
//         // For simplicity, this implementation sends lines on mouse move. 
//         // A more robust version might only send on mouse up.
//     };

//     return (
//         <div className="w-full h-full bg-slate-800 border-t-2 border-slate-600">
//             <canvas
//                 ref={canvasRef}
//                 className={`w-full h-full ${isTeacher ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
//                 onMouseDown={handleMouseDown}
//                 onMouseMove={handleMouseMove}
//                 onMouseUp={handleMouseUp}
//                 onMouseLeave={() => setIsDrawing(false)} // Stop drawing if mouse leaves canvas
//             />
//         </div>
//     );
// };