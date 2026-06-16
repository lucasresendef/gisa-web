import { lazy, Suspense, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, LightbulbOff, Mic, Power, Fence } from 'lucide-react';
import { devices, devicesByRoom, gatePassword, rooms } from '../config/homeConfig';
import { DeviceCard } from '../features/devices/components/DeviceCard';
import { RoomTabs } from '../features/rooms/components/RoomTabs';
import { WeatherChip } from '../features/weather/components/WeatherChip';
import { useHomeAutomationStore } from '../store/useHomeAutomationStore';
import { useWeather } from '../hooks/useWeather';
import { matchSmallTalk, parseVoiceCommand, type VoiceFeedback } from '../config/voiceCommands';
import type { Device, DeviceState } from '../types/device';

const VoiceAssistant = lazy(() =>
  import('../features/voice/components/VoiceAssistant').then((m) => ({ default: m.VoiceAssistant })),
);
const GatePasswordDialog = lazy(() =>
  import('../features/devices/components/GatePasswordDialog').then((m) => ({
    default: m.GatePasswordDialog,
  })),
);

const greeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const gridVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export const HomePage = () => {
  const deviceStates = useHomeAutomationStore((state) => state.deviceStates);
  const toggleDevice = useHomeAutomationStore((state) => state.toggleDevice);
  const pulseGate = useHomeAutomationStore((state) => state.pulseGate);
  const { weather, status: weatherStatus } = useWeather();
  const [activeRoomId, setActiveRoomId] = useState(rooms[0].id);
  const [pendingGate, setPendingGate] = useState<Device | null>(null);
  const [gateMounted, setGateMounted] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceMounted, setVoiceMounted] = useState(false);

  const stateOf = (id: string): DeviceState => deviceStates[id] ?? 'offline';

  const openGateDialog = (device: Device) => {
    setGateMounted(true);
    setPendingGate(device);
  };

  const openVoiceAssistant = () => {
    setVoiceMounted(true);
    setVoiceOpen(true);
  };

  const requestActivate = (device: Device) => {
    if (device.kind === 'gate') {
      openGateDialog(device);
    } else {
      toggleDevice(device.command);
    }
  };

  const confirmGate = (device: Device) => {
    pulseGate(device.command);
    setPendingGate(null);
  };

  const lights = useMemo(() => devices.filter((d) => d.kind === 'relay'), []);
  const gates = useMemo(() => devices.filter((d) => d.kind === 'gate'), []);
  const lightsOn = lights.filter((d) => stateOf(d.id) === 'on');

  const activeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const room of rooms) {
      const scope = room.id === 'all' ? devices : devicesByRoom(room.id);
      counts[room.id] = scope.filter((d) => (deviceStates[d.id] ?? 'offline') === 'on').length;
    }
    return counts;
  }, [deviceStates]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const isAllRoom = activeRoom.id === 'all';
  const isGatesRoom = activeRoom.id === 'gates';
  const roomDevices = isAllRoom ? devices : devicesByRoom(activeRoom.id);

  const setAll = (on: boolean, scope = roomDevices) => {
    scope
      .filter((d) => d.kind === 'relay')
      .filter((d) => (on ? stateOf(d.id) === 'off' : stateOf(d.id) === 'on'))
      .forEach((d) => toggleDevice(d.command));
  };

  const handleVoiceTranscript = (transcript: string): VoiceFeedback => {
    const intent = parseVoiceCommand(transcript);

    if (!intent) {
      const reply = matchSmallTalk(transcript);
      if (reply) return { status: 'info', message: reply };
      return {
        status: 'error',
        message: 'Não entendi. Tente algo como "Ligar a luz da Sara" ou "Abrir o portão 1".',
      };
    }

    if (intent.target === 'all') {
      const turnOn = intent.action !== 'off';
      setAll(turnOn, devices);
      return {
        status: 'success',
        message: turnOn ? 'Pronto, liguei todas as luzes.' : 'Pronto, apaguei todas as luzes.',
      };
    }

    const device = devices.find((d) => d.id === intent.deviceId);
    if (!device) return { status: 'error', message: 'Não encontrei esse dispositivo.' };

    if (device.kind === 'gate') {
      openGateDialog(device);
      return { status: 'gate', message: `Claro! Confirme a senha para ${device.label}.` };
    }

    const current = stateOf(device.id);

    if (intent.action === 'off') {
      if (current === 'on') {
        toggleDevice(device.command);
        return { status: 'success', message: `Desliguei a ${device.label}.` };
      }
      return { status: 'info', message: `A ${device.label} já está desligada.` };
    }

    if (intent.action === 'toggle') {
      toggleDevice(device.command);
      return { status: 'success', message: `Alternei a ${device.label}.` };
    }

    if (current !== 'on') {
      toggleDevice(device.command);
      return { status: 'success', message: `Liguei a ${device.label}.` };
    }
    return { status: 'info', message: `A ${device.label} já está ligada.` };
  };

  const stats = [
    { label: 'Luzes', value: lights.length, icon: Lightbulb },
    { label: 'Ligadas agora', value: lightsOn.length, icon: Power, accent: true },
    { label: 'Portões', value: gates.length, icon: Fence },
  ];

  const renderGrid = (list: Device[]) => (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {list.map((device) => (
        <motion.div key={device.id} variants={itemVariants}>
          <DeviceCard device={device} state={stateOf(device.id)} onActivate={requestActivate} />
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <div className="space-y-7">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/80 via-brand-50/70 to-brand-100/60 p-6 shadow-card backdrop-blur dark:border-white/10 dark:from-white/[0.06] dark:via-brand-500/10 dark:to-transparent sm:p-7"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-sm font-medium text-brand-600 dark:text-brand-200">{greeting()}</p>
              <WeatherChip weather={weather} status={weatherStatus} />
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-3xl">
              Sua casa em um toque
            </h1>
            <div className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              <AnimatePresence mode="wait">
                <motion.p
                  key={weather?.phrase ?? weatherStatus}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  {weather
                    ? weather.phrase
                    : lightsOn.length > 0
                      ? `${lightsOn.length} ${lightsOn.length === 1 ? 'luz acesa' : 'luzes acesas'} no momento.`
                      : 'Bem-vindo de volta — sua casa está pronta. 🏡'}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={openVoiceAssistant}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft transition"
            >
              <Mic className="h-4 w-4" />
              Falar com a Gisa
            </motion.button>

            <AnimatePresence>
              {lightsOn.length > 0 && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setAll(false, lights)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <LightbulbOff className="h-4 w-4" />
                  Apagar todas as luzes
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border p-3.5 sm:p-4 ${
                stat.accent
                  ? 'border-brand-300/60 bg-white/80 dark:border-brand-400/30 dark:bg-white/[0.06]'
                  : 'border-white/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]'
              }`}
            >
              <stat.icon
                className={`mb-2 h-4 w-4 ${stat.accent ? 'text-brand-500' : 'text-slate-400 dark:text-slate-500'}`}
              />
              <p className="font-display text-2xl font-extrabold leading-none text-slate-800 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <RoomTabs
        rooms={rooms}
        activeRoomId={activeRoomId}
        activeCounts={activeCounts}
        onSelect={setActiveRoomId}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-white">{activeRoom.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{activeRoom.caption}</p>
        </div>

        {!isGatesRoom && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAll(true)}
              className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-brand-100 dark:hover:bg-white/10"
            >
              Ligar tudo
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              Desligar tudo
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeRoom.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={isAllRoom ? 'space-y-8' : undefined}
        >
          {isAllRoom
            ? rooms
                .filter((room) => room.id !== 'all')
                .map((room) => {
                  const list = devicesByRoom(room.id);
                  if (!list.length) return null;
                  return (
                    <section key={room.id} className="space-y-3.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {room.name}
                        </h3>
                        <span className="h-px flex-1 bg-slate-200/70 dark:bg-white/10" />
                      </div>
                      {renderGrid(list)}
                    </section>
                  );
                })
            : renderGrid(roomDevices)}
        </motion.div>
      </AnimatePresence>

      {voiceMounted && (
        <Suspense fallback={null}>
          <VoiceAssistant
            open={voiceOpen}
            onClose={() => setVoiceOpen(false)}
            onProcess={handleVoiceTranscript}
          />
        </Suspense>
      )}

      {gateMounted && (
        <Suspense fallback={null}>
          <GatePasswordDialog
            gate={pendingGate}
            password={gatePassword}
            onCancel={() => setPendingGate(null)}
            onConfirm={confirmGate}
          />
        </Suspense>
      )}
    </div>
  );
};
