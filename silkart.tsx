import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Trash2, RotateCcw, RotateCw } from 'lucide-react';

const SilkArtGenerator = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#4a90e2');
  const [symmetry, setSymmetry] = useState(8);
  const [lastPoint, setLastPoint] = useState(null);
  const [brushStyle, setBrushStyle] = useState('glow');
  const [lineWidth, setLineWidth] = useState(2);
  const [brushSpeed, setBrushSpeed] = useState(1);
  
  // Store for undo/redo functionality
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [currentStroke, setCurrentStroke] = useState([]);
  
  const initializeCanvas = (ctx = null) => {
    const canvas = canvasRef.current;
    const context = ctx || canvas.getContext('2d');
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = 'screen';
  };

  useEffect(() => {
    initializeCanvas();
  }, []);

  // Save the current canvas state
  const saveState = () => {
    const canvas = canvasRef.current;
    return canvas.toDataURL();
  };

  // Load a canvas state
  const loadState = (state) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = state;
    img.onload = () => {
      initializeCanvas(ctx);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'screen';
    };
  };

  const getBrushStyle = (ctx) => {
    switch (brushStyle) {
      case 'glow':
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = color;
        break;
      case 'neon':
        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        ctx.strokeStyle = '#ffffff';
        break;
      case 'ribbon':
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `${color}88`;
        break;
      default:
        ctx.shadowBlur = 15;
        ctx.strokeStyle = color;
    }
  };

  const drawSymmetricLines = (ctx, x, y, lastX, lastY) => {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    
    for (let i = 0; i < symmetry; i++) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((Math.PI * 2 * i) / symmetry);
      ctx.translate(-centerX, -centerY);
      
      const dx = x - centerX;
      const dy = y - centerY;
      const lastDx = lastX ? lastX - centerX : dx;
      const lastDy = lastY ? lastY - centerY : dy;
      
      ctx.beginPath();
      if (lastX) {
        ctx.moveTo(centerX + lastDx, centerY + lastDy);
      } else {
        ctx.moveTo(centerX + dx, centerY + dy);
      }
      ctx.lineTo(centerX + dx, centerY + dy);
      
      getBrushStyle(ctx);
      ctx.lineWidth = lineWidth * brushSpeed;
      ctx.stroke();
      
      if (brushStyle === 'glow' || brushStyle === 'neon') {
        ctx.lineWidth = lineWidth * 2 * brushSpeed;
        ctx.strokeStyle = `${color}44`;
        ctx.stroke();
      }
      
      ctx.restore();
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
    if (lastPoint) {
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      setBrushSpeed(Math.min(Math.max(speed / 10, 0.5), 2));
    }
    
    drawSymmetricLines(
      ctx,
      x,
      y,
      lastPoint ? lastPoint.x : x,
      lastPoint ? lastPoint.y : y
    );
    
    setLastPoint({ x, y });
    setCurrentStroke(prev => [...prev, { x, y, color, brushStyle, lineWidth, symmetry }]);
  };

  const handlePointerDown = (e) => {
    setIsDrawing(true);
    setLastPoint(null);
    setCurrentStroke([]);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e) => {
    if (isDrawing && currentStroke.length > 0) {
      const newHistory = history.slice(0, currentStep + 1);
      newHistory.push({
        state: saveState(),
        stroke: currentStroke
      });
      setHistory(newHistory);
      setCurrentStep(newHistory.length - 1);
    }
    
    setIsDrawing(false);
    setLastPoint(null);
    setCurrentStroke([]);
    e.target.releasePointerCapture(e.pointerId);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'screen';
    
    setHistory([]);
    setCurrentStep(-1);
  };

  const undoLastStroke = () => {
    if (currentStep > -1) {
      setCurrentStep(currentStep - 1);
      if (currentStep - 1 === -1) {
        clearCanvas();
      } else {
        loadState(history[currentStep - 1].state);
      }
    }
  };

  const redoStroke = () => {
    if (currentStep < history.length - 1) {
      setCurrentStep(currentStep + 1);
      loadState(history[currentStep + 1].state);
    }
  };

  const saveArtwork = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'silk-artwork.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8"
                title="Choose color"
              />
              <select
                value={symmetry}
                onChange={(e) => setSymmetry(Number(e.target.value))}
                className="p-2 border rounded"
              >
                <option value="4">4-fold</option>
                <option value="6">6-fold</option>
                <option value="8">8-fold</option>
                <option value="12">12-fold</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={brushStyle}
                onChange={(e) => setBrushStyle(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="glow">Glow</option>
                <option value="neon">Neon</option>
                <option value="ribbon">Ribbon</option>
              </select>
              <input
                type="range"
                min="1"
                max="5"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-24"
                title="Brush size"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={undoLastStroke}
                disabled={currentStep < 0}
                className={`p-2 text-white rounded ${
                  currentStep < 0 ? 'bg-gray-400' : 'bg-gray-500 hover:bg-gray-600'
                }`}
                title="Undo"
              >
                <RotateCcw size={20} />
              </button>
              <button
                onClick={redoStroke}
                disabled={currentStep >= history.length - 1}
                className={`p-2 text-white rounded ${
                  currentStep >= history.length - 1 ? 'bg-gray-400' : 'bg-gray-500 hover:bg-gray-600'
                }`}
                title="Redo"
              >
                <RotateCw size={20} />
              </button>
              <button
                onClick={clearCanvas}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                title="Clear canvas"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={saveArtwork}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                title="Save artwork"
              >
                <Download size={20} />
              </button>
            </div>
          </div>
          
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="border rounded bg-black w-full cursor-crosshair touch-none"
            style={{ touchAction: 'none' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SilkArtGenerator;
