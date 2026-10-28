import { Component, Suspense, lazy, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useProgress } from '@react-three/drei';
import { Heart, House, RefreshCw } from 'lucide-react';
import { useGame } from './game/store';
import { audio } from './game/audio';
import { birthday } from './config/birthday';
import { Interface } from './ui/Interface';

const Scene = lazy(() => import('./scene/Scene'));
class WebGLBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Birthday Room renderer:', error, info.componentStack);
  }
  render() {
    return this.state.error ? <RenderFallback /> : this.props.children;
  }
}
function RenderFallback() {
  return (
    <div className="render-fallback paper" role="alert">
      <House size={40} strokeWidth={1} />
      <h1>小屋需要一点图形支持</h1>
      <p>这个浏览器暂时无法打开 WebGL。请开启浏览器的硬件加速，或使用新版 Safari、Chrome、Edge 再来看看。</p>
      <button className="primary-button" onClick={() => location.reload()}>
        再试一次 <RefreshCw size={16} />
      </button>
    </div>
  );
}
function Loading() {
  const ready = useGame((s) => s.ready),
    { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (ready && !active) {
      const timer = setTimeout(() => setVisible(false), 450);
      return () => clearTimeout(timer);
    }
  }, [ready, active]);
  if (!visible) return null;
  return (
    <div className={`loading-curtain ${ready ? 'loaded' : ''}`} aria-live="polite">
      <div className="loading-home">
        <House size={42} strokeWidth={1} />
        <Heart size={12} fill="currentColor" />
      </div>
      <p>正在为你点亮小屋</p>
      <div className="loading-track">
        <span style={{ width: `${ready ? 100 : Math.max(12, progress)}%` }} />
      </div>
      <small>{ready ? '一切都准备好了' : `小小的惊喜，正在就位 ${Math.round(progress)}%`}</small>
    </div>
  );
}
export default function App() {
  const [contextLost, setContextLost] = useState(false);
  useEffect(() => {
    audio.setEnabled(useGame.getState().music);
    const unsubscribe = useGame.subscribe((s, old) => {
      if (s.music !== old.music) audio.setEnabled(s.music);
      if (s.phase !== old.phase) {
        audio.setSoft(s.phase === 'opening' || s.phase === 'wish');
        audio.setCandle(s.phase === 'wish');
        if (s.phase === 'greeting') audio.effect('final');
      }
    });
    const visibility = () => {
      if (document.hidden) audio.suspend();
      else audio.resume();
    };
    const lost = () => setContextLost(true);
    const activate = () => {
      void audio.start(birthday.backgroundMusic);
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('room:webgl-lost', lost);
    document.addEventListener('pointerdown', activate, { once: true });
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('room:webgl-lost', lost);
      document.removeEventListener('pointerdown', activate);
    };
  }, []);
  return (
    <main className="birthday-app">
      <div className="scene-container" data-testid="scene">
        <WebGLBoundary>
          <Suspense fallback={null}>{!contextLost && <Scene />}</Suspense>
        </WebGLBoundary>
      </div>
      <div className="paper-grain" aria-hidden="true" />
      <Interface />
      {contextLost ? <RenderFallback /> : <Loading />}
    </main>
  );
}
