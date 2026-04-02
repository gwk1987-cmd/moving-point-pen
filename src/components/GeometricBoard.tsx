"use client";

import React, { useEffect, useRef, useState } from 'react';
import '../app/jsxgraph.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';

export interface Point {
  name: string;
  x: number;
  y: number;
}

export interface MovingPointConfig {
  name: string;
  path: string[];
  speed: number;
}

interface GeometricBoardProps {
  points: Point[];
  movingPoints: MovingPointConfig[];
  extraElements?: (board: any, elements: any) => void;
  onBoardInit?: (board: any, elements: any) => void;
  transparent?: boolean;
  showWatermark?: boolean;
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
  const [boardId] = useState(() => "jxgbox-" + Math.random().toString(36).substring(2, 11));
  const boardInstanceRef = useRef<any>(null);

  useEffect(() => {
    // 关键修复：确保代码仅在浏览器端执行
    if (typeof window === 'undefined' || !boardRef.current) return;

    // 解决 Next.js 中 JSXGraph 的导入与全局变量问题
    const JXG = require('jsxgraph');
    if (!JXG) return;
    
    // 强制挂载到全局，防止库内部引用报错
    if (typeof window !== 'undefined') {
      (window as any).JXG = JXG;
    }
    
    // 初始化看板
    const board = JXG.JSXGraph.initBoard(boardId, {
      boundingbox: [-2, 8, 10, -2],
      axis: true,
      grid: !transparent,
      showCopyright: false,
      keepaspectratio: true,
      fillColor: transparent ? 'none' : '#ffffff',
    });

    boardInstanceRef.current = board;

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
        layer: 9
      });
    }

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

    // 3. 运行额外的几何描述
    if (extraElements) {
      extraElements(board, elements);
    }

    // 4. 定时检查并渲染 KaTeX 文本
    const renderKaTeX = () => {
      const texts = document.querySelectorAll('.katex-text');
      texts.forEach(el => {
        const latex = el.getAttribute('data-latex');
        if (latex) {
          try {
            katex.render(latex, el as HTMLElement, { throwOnError: false, displayMode: false });
          } catch (e) {
            console.error(e);
          }
        }
      });
    };

    board.on('update', renderKaTeX);
    setTimeout(renderKaTeX, 100);

    if (onBoardInit) {
      onBoardInit(board, elements);
    }

    return () => {
      if (JXG && JXG.JSXGraph) {
        JXG.JSXGraph.freeBoard(board);
      }
    };
  }, [points, movingPoints, extraElements, boardId, onBoardInit, showWatermark, transparent]);

  return (
    <div className="w-full h-full relative min-h-[500px]">
      <div id={boardId} ref={boardRef} className="jxgbox w-full h-full" />
    </div>
  );
};

export default GeometricBoard;
