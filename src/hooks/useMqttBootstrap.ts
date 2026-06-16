import { useEffect } from 'react';
import { useHomeAutomationStore } from '../store/useHomeAutomationStore';

let activeMounts = 0;

export const useMqttBootstrap = () => {
  const connect = useHomeAutomationStore((state) => state.connect);
  const disconnect = useHomeAutomationStore((state) => state.disconnect);

  useEffect(() => {
    activeMounts += 1;
    connect();
    return () => {
      activeMounts -= 1;
      setTimeout(() => {
        if (activeMounts === 0) disconnect();
      }, 0);
    };
  }, [connect, disconnect]);
};
