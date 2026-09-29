import { Component, type ErrorInfo, type ReactNode } from 'react';

import { AppText, Button, Screen, Stack } from '../design-system';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[AppErrorBoundary]', error, info.componentStack);
    }
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <Screen>
          <Stack gap="md">
            <AppText variant="heading">일시적인 오류가 발생했습니다</AppText>
            <AppText variant="body">
              앱을 다시 시도해 주세요. 문제가 계속되면 로그아웃 후 다시 로그인해 주세요.
            </AppText>
            {__DEV__ ? (
              <AppText variant="caption" color="danger">{this.state.error.message}</AppText>
            ) : null}
            <Button label="다시 시도" onPress={this.reset} />
          </Stack>
        </Screen>
      );
    }

    return this.props.children;
  }
}
