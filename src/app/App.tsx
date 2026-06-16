import { AppShell } from '../components/layout/AppShell';
import { HomePage } from '../pages/HomePage';
import { useMqttBootstrap } from '../hooks/useMqttBootstrap';

export const App = () => {
  useMqttBootstrap();

  return (
    <AppShell>
      <HomePage />
    </AppShell>
  );
};
