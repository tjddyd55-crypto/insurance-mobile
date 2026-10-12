import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { AppUpdatePrompt } from './AppUpdatePrompt';
import {
  createRuntimeAppUpdateCoordinator,
  watchPlayDownload,
} from './createRuntimeCoordinator';
import type { AppUpdateCoordinator, UpdatePrompt } from './coordinator';

type BoundaryProps = { children: ReactNode };
type BoundaryState = { failed: boolean };

/** 업데이트 UI 오류가 루트 트리를 내리지 않게 이 기능만 숨긴다. */
class AppUpdateErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}

function AppUpdateRuntime() {
  const coordinatorRef = useRef<AppUpdateCoordinator | null>(null);
  if (coordinatorRef.current === null) {
    coordinatorRef.current = createRuntimeAppUpdateCoordinator();
  }
  const [prompt, setPrompt] = useState<UpdatePrompt | null>(null);

  useEffect(() => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) {
      return;
    }
    let active = true;
    const unsubscribe = coordinator.subscribe((snapshot) => {
      if (active) {
        setPrompt(snapshot.prompt);
      }
    });
    const stopListening = watchPlayDownload(() => coordinator.notifyPlayDownloaded());
    void coordinator.start('launch');
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void coordinator.start('foreground');
      }
    });
    return () => {
      active = false;
      unsubscribe();
      stopListening();
      appState.remove();
    };
  }, []);

  const confirm = () => {
    void coordinatorRef.current?.accept();
  };
  const dismiss = () => {
    void coordinatorRef.current?.dismiss();
  };

  return <AppUpdatePrompt prompt={prompt} onConfirm={confirm} onDismiss={dismiss} />;
}

/** 루트 렌더를 기다리지 않는다. 검사와 프롬프트는 첫 페인트 이후 효과에서만 시작한다. */
export function AppUpdateHost() {
  return (
    <AppUpdateErrorBoundary>
      <AppUpdateRuntime />
    </AppUpdateErrorBoundary>
  );
}
