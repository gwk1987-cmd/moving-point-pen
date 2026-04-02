"use client";

import React, { useEffect, useRef } from 'react';
import '../app/jsxgraph.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';

// 强制在浏览器环境导入
let JXG: any;
if (typeof window !== 'undefined') {
  JXG = require('jsxgraph');
}

export interface Point {
  name: string;
  x: number;
  y: number;
}

export interface MovingPointConfig {
  name: string;
  path: string[]; // e.g., ["A", "B", "C"]
  speed: number;
}

interface GeometricBoardProps {
  points: Point[];
  movingPoints: MovingPointConfig[];
  extraElements?: (board: any, elements: any) => void;
  onBoardInit?: (board: any, elements: any) => void;
  transparent?: boolean; // 新增：透明背景开关
  showWatermark?: boolean; // 新增：水印开关
}

const GeometricBoard: React.FC<GeometricBoardProps> = ({ 
  points, 
  movingPoints, 
  extraElements, 
  onBoardInit,
  transparent = false,
  showWatermark = false
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const id = "jxgbox-" + Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    if (typeof window === 'undefined' || !boardRef.current) return;

    // 初始化坐标系
    const board = JXG.JSXGraph.initBoard(id, {
      boundingbox: [-2, 8, 10, -2],
      axis: true,
      grid: !transparent, // 透明模式下通常关闭网格以方便嵌入
      showCopyright: false,
      keepaspectratio: true,
      fillColor: transparent ? 'none' : '#ffffff',
    });

    // 如果是透明模式，强制设置容器和 canvas 背景
    if (transparent && board.containerObj) {
      board.containerObj.style.background = 'transparent';
    }

    // 绘制水印
    if (showWatermark) {
      board.create('text', [1, 7, '动点神笔 - 备课必备'], {
        fixed: true,
        fontSize: 16,
        color: '#aaaaaa',
        opacity: 0.3,
        cssClass: 'watermark-text',
        layer: 9 // 确保在顶层
      });
    }

    // 启用 KaTeX 解析
    board.jc.parse = (expr: string) => expr; // Placeholder for JSXGraph logic

    const elements: any = {
      points: {},
      paths: [],
      movingPoints: []
    };

    // 1. 绘制基础点
    points.forEach(p => {
      elements.points[p.name] = board.create('point', [p.x, p.y], {
        name: p.name,
        fixed: true,
        color: '#3b82f6',
        size: 3,
        label: { offset: [5, 5], strokeColor: '#3b82f6' }
      });
    });

    // 2. 处理动点路径逻辑
    movingPoints.forEach(mp => {
      const pathPoints = mp.path.map(name => elements.points[name]).filter(Boolean);
      if (pathPoints.length < 2) return;

      const curve = board.create('curve', [
        (t: number) => {
          const segmentCount = pathPoints.length - 1;
          const idx = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
          const ratio = (t * segmentCount) - idx;
          return pathPoints[idx].X() + (pathPoints[idx + 1].X() - pathPoints[idx].X()) * ratio;
        },
        (t: number) => {
          const segmentCount = pathPoints.length - 1;
          const idx = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
          const ratio = (t * segmentCount) - idx;
          return pathPoints[idx].Y() + (pathPoints[idx + 1].Y() - pathPoints[idx].Y()) * ratio;
        },
        0, 1
      ], { strokeColor: '#94a3b8', strokeWidth: 2, dash: 2 });

      const p = board.create('glider', [pathPoints[0].X(), pathPoints[0].Y(), curve], {
        name: mp.name,
        color: '#ef4444',
        size: 5,
        trace: true,
        traceAttributes: { strokeColor: '#f87171', strokeWidth: 1, dash: 3 }
      });

      elements.movingPoints.push(p);
    });

    // 3. 运行额外的几何描述（如三角形面积等）
    if (extraElements) {
      extraElements(board, elements);
    }

    // 4. 定时检查并渲染 KaTeX 文本
    // 因为 JSXGraph 动态更新文本，我们需要一个钩子来处理
    const renderKaTeX = () => {
      const texts = document.querySelectorAll('.katex-text');
      texts.forEach(el => {
        const latex = el.getAttribute('data-latex');
        if (latex) {
          try {
            // 每次更新都重新渲染以支持动态数值
            katex.render(latex, el as HTMLElement, { throwOnError: false, displayMode: false });
          } catch (e) {
            console.error(e);
          }
        }
      });
    };

    board.on('update', renderKaTeX);
    setTimeout(renderKaTeX, 100); // 初始渲染

    if (onBoardInit) {
      onBoardInit(board, elements);
    }

    return () => {
      JXG.JSXGraph.freeBoard(board);
    };
  }, [points, movingPoints, extraElements]);

  return (
    <div className="w-full h-[500px] relative">
      <div id={id} ref={boardRef} className="jxgbox" />
      <style jsx global>{`
        .jxgbox .jxgtext {
          font-family: 'Times New Roman', Times, serif !important;
        }
      `}</style>
    </div>
  );
};

export default GeometricBoard;
