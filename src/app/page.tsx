"use client";

import { useState, useCallback, useEffect } from "react";
import GeometricBoard, { Point, MovingPointConfig } from "@/components/GeometricBoard";
import 'katex/dist/katex.min.css';

export default function Home() {
  const [board, setBoard] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [problemText, setProblemText] = useState("在矩形ABCD中，AB=6cm，BC=4cm。点P从点A出发，沿折线AB -> BC向点C运动，运动速度为每秒1cm。当点P运动时，观察三角形APD的面积随时间t变化的动态过程。");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<{points: Point[], movingPoints: MovingPointConfig[]} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);

  // 1. 成本控制与限额逻辑
  const checkDailyLimit = () => {
    if (typeof window === 'undefined') return 0;
    const today = new Date().toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem('parse_quota') || '{}');
    if (data.date !== today) return 0;
    return data.count || 0;
  };

  const updateDailyLimit = (count: number) => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('parse_quota', JSON.stringify({ date: today, count }));
  };

  const getCachedResult = (text: string) => {
    const cache = JSON.parse(localStorage.getItem('parse_cache') || '{}');
    return cache[text.trim()];
  };

  const setCachedResult = (text: string, result: any) => {
    const cache = JSON.parse(localStorage.getItem('parse_cache') || '{}');
    cache[text.trim()] = result;
    localStorage.setItem('parse_cache', JSON.stringify(cache));
  };

  // 2. 状态：几何点与动点
  const [points, setPoints] = useState<Point[]>([
    { name: "A", x: 0, y: 0 },
    { name: "B", x: 6, y: 0 },
    { name: "C", x: 6, y: 4 },
    { name: "D", x: 0, y: 4 }
  ]);

  const [movingPoints, setMovingPoints] = useState<MovingPointConfig[]>([
    { name: "P", path: ["A", "B", "C"], speed: 1 }
  ]);

  // 3. 处理额外几何元素（如三角形面积）
  const handleExtraElements = useCallback((boardInstance: any, boardElements: any) => {
    const { points: pts, movingPoints: mpts } = boardElements;
    const A = pts["A"];
    const D = pts["D"];
    const P = mpts[0];

    if (A && D && P) {
      // 动态多边形 (△APD)
      boardInstance.create('polygon', [A, P, D], {
        fillColor: '#f87171',
        fillOpacity: 0.2,
        borders: { strokeColor: '#ef4444', dash: 2 }
      });

      // LaTeX 动态渲染: S_{\triangle APD}
      boardInstance.create('text', [0.5, 6, () => {
        const area = boardInstance.create('polygon', [A, P, D]).Area().toFixed(2);
        return `<span class="katex-text" data-latex="S_{\\triangle APD} = ${area} \\text{ cm}^2"></span>`;
      }], { 
        fontSize: 18, 
        color: '#ef4444'
      });
      
      // 显示时间 t
      boardInstance.create('text', [0.5, 5.2, () => {
          // 假设起始点 A 是 0,0 且匀速运动
          const dist = Math.abs(P.X() - A.X()) + Math.abs(P.Y() - A.Y());
          return `<span class="katex-text" data-latex="t = ${dist.toFixed(1)} \\text{ s}"></span>`;
      }], { fontSize: 16, color: '#4b5563' });
    }
  }, []);

  const handleBoardInit = (boardInstance: any, boardElements: any) => {
    setBoard(boardInstance);
    setElements(boardElements);
  };

  const startAnimation = () => {
    if (elements && elements.movingPoints[0]) {
      elements.movingPoints[0].startAnimation(1, 40);
    }
  };

  const handleExport = async () => {
    if (!board) return;
    const canvas = document.getElementById(board.containerObj.id)?.querySelector('canvas');
    if (!canvas) {
      alert("未找到画布，请先初始化场景");
      return;
    }

    setIsRecording(true);
    
    // 如果是透明背景，使用 VP9 编码以支持 Alpha 通道
    const mimeType = isTransparent ? 'video/webm;codecs=vp9' : 'video/webm';
    const stream = (canvas as any).captureStream(30);
    
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (e) {
      console.warn("不支持 VP9 透明录制，回退到标准 WebM", e);
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    }

    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `动点演示_${isTransparent ? '透明_' : ''}${new Date().getTime()}.webm`;
      a.click();
      setIsRecording(false);
    };

    recorder.start();
    startAnimation();
    
    setTimeout(() => {
      recorder.stop();
    }, 10000); // 录制 10 秒以覆盖全过程
  };

  // 4. AI 解析流程
  const handleAiParse = async () => {
    const text = problemText.trim();
    if (!text) return;

    const cached = getCachedResult(text);
    if (cached) {
      setPendingData(cached);
      setShowConfirm(true);
      return;
    }

    const count = checkDailyLimit();
    if (count >= 5) {
      alert("今日 AI 解析额度已用完（5/5），请明天再试。");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      let result = null;
      // 模拟针对中考压轴题的解析结果
      if (text.includes("矩形") && text.includes("6") && text.includes("4")) {
        result = {
          points: [
            { name: "A", x: 0, y: 0 },
            { name: "B", x: 6, y: 0 },
            { name: "C", x: 6, y: 4 },
            { name: "D", x: 0, y: 4 }
          ],
          movingPoints: [
            { name: "P", path: ["A", "B", "C"], speed: 1 }
          ]
        };
      }

      if (result) {
        setCachedResult(text, result);
        updateDailyLimit(count + 1);
        setPendingData(result);
        setShowConfirm(true);
      } else {
        alert("抱歉，目前仅支持矩形场景的解析逻辑。");
      }
      setIsLoading(false);
    }, 1500);
  };

  const confirmScenario = () => {
    if (pendingData) {
      setPoints(pendingData.points);
      setMovingPoints(pendingData.movingPoints);
      setShowConfirm(false);
      setPendingData(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 text-gray-800">
      <h1 className="text-4xl font-extrabold mb-8 text-blue-600 font-serif">动点神笔</h1>
      
      <div className="w-full max-w-7xl flex gap-8">
        {/* 左侧控制区 */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">1. 输入题目内容</h2>
              <span className="text-xs text-blue-500 font-mono bg-blue-50 px-2 py-1 rounded">
                今日额度: {5 - checkDailyLimit()}/5
              </span>
            </div>
            <textarea
              className="w-full h-32 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="请粘贴初中数学动点题目..."
            />
            <button
              onClick={handleAiParse}
              disabled={isLoading || showConfirm}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isLoading || showConfirm ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
            >
              {isLoading ? "AI 正在解析解析中..." : "AI 一键解析"}
            </button>
          </div>

          {showConfirm && pendingData && (
            <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 space-y-4 shadow-inner">
              <h2 className="text-lg font-bold text-blue-800">核对 AI 解析参数</h2>
              <div className="text-sm text-blue-700 space-y-2 bg-white/50 p-3 rounded-lg">
                <p>📍 <strong>定点:</strong> {pendingData.points.map(p => p.name).join(', ')}</p>
                <p>🏃 <strong>动点:</strong> {pendingData.movingPoints[0].name} (路径: {pendingData.movingPoints[0].path.join(' → ')})</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmScenario}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm"
                >
                  确认并同意协议
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
              <p className="text-[10px] text-blue-400 italic text-center">
                * 点击确认即代表您已同意 <a href="/legal/Disclaimer.md" className="underline">《免责声明》</a>，AI 解析仅供参考。
              </p>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-4">
            <h2 className="text-xl font-semibold">2. 动画控制与导出</h2>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button
                  onClick={startAnimation}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
                >
                  开始演示
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold"
                >
                  重置
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-700">透明背景导出</span>
                    <span className="px-1.5 py-0.5 bg-blue-500 text-[10px] text-white rounded font-bold uppercase">Pro</span>
                  </div>
                  <span className="text-[10px] text-blue-400 mt-1">方便嵌入精美 PPT 课件</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isTransparent}
                    onChange={(e) => setIsTransparent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <button
                onClick={handleExport}
                disabled={isRecording}
                className={`w-full py-4 border-2 border-dashed rounded-xl font-bold transition-all ${
                  isRecording 
                    ? 'border-red-400 text-red-400 animate-pulse cursor-not-allowed' 
                    : 'border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600'
                }`}
              >
                {isRecording ? "🔴 正在录制并生成视频..." : `🎬 录制并导出${isTransparent ? '透明' : ''}视频 (WebM)`}
              </button>
            </div>
          </div>
        </div>

        {/* 右侧展示区 */}
        <div className={`flex-[2] p-8 rounded-3xl shadow-2xl border border-gray-100 transition-all duration-700 relative overflow-hidden ${isTransparent ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")] bg-gray-200 shadow-inner' : 'bg-white'}`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-blue-50/10 pointer-events-none"></div>
          <GeometricBoard 
            points={points} 
            movingPoints={movingPoints} 
            extraElements={handleExtraElements}
            onBoardInit={handleBoardInit} 
            transparent={isTransparent}
          />
        </div>
      </div>

      {/* Footer Legal Links */}
      <footer className="mt-12 text-[10px] text-gray-400 space-x-4">
        <a href="/legal/UserAgreement.md" className="hover:text-blue-500">用户协议</a>
        <span>|</span>
        <a href="/legal/PrivacyPolicy.md" className="hover:text-blue-500">隐私政策</a>
        <span>|</span>
        <a href="/legal/Disclaimer.md" className="hover:text-blue-500">免责声明</a>
      </footer>
    </main>
  );
}
