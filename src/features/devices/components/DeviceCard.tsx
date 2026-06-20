import { motion } from 'framer-motion';
import { DoorOpen, Lamp, Lightbulb, Power, Warehouse } from 'lucide-react';
import type { Device, DeviceIcon, DeviceState } from '../../../types/device';
import { StatePill } from '../../../components/common/StatePill';
import { ToggleSwitch } from '../../../components/common/ToggleSwitch';

const iconMap: Record<DeviceIcon, typeof Lightbulb> = {
  lightbulb: Lightbulb,
  lamp: Lamp,
  door: DoorOpen,
  warehouse: Warehouse,
};

interface DeviceCardProps {
  device: Device;
  state: DeviceState;
  onActivate: (device: Device) => void;
  disabled?: boolean;
  travelManaged?: boolean;
  travelCurrent?: boolean;
}

export const DeviceCard = ({
  device,
  state,
  onActivate,
  disabled = false,
  travelManaged = false,
  travelCurrent = false,
}: DeviceCardProps) => {
  const Icon = iconMap[device.icon];
  const isGate = device.kind === 'gate';
  const isOn = state === 'on';
  const isLoading = state === 'loading';
  const active = isOn || isLoading;

  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -4 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={() => onActivate(device)}
      aria-label={`${isGate ? 'Acionar' : 'Alternar'} ${device.label}`}
      className={`group relative w-full overflow-hidden rounded-3xl border p-4 text-left backdrop-blur transition-colors duration-300 ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${
        active
          ? 'border-brand-300/70 bg-gradient-to-br from-white via-brand-50 to-brand-100 shadow-glow dark:border-brand-400/40 dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent'
          : 'border-white/70 bg-white/70 shadow-soft hover:border-brand-200 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20'
      }`}
    >
      {isOn && (
        <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-300/40 blur-2xl dark:bg-brand-400/30" />
      )}

      <div className="relative mb-5 flex items-start justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-300 ${
            isOn
              ? 'bg-gradient-to-br from-brand-400 to-brand-500 text-white shadow-soft'
              : 'bg-brand-50 text-brand-500 dark:bg-white/10 dark:text-brand-200'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        {isGate ? (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              active
                ? 'bg-brand-500 text-white'
                : 'bg-brand-50 text-brand-500 group-hover:bg-brand-100 dark:bg-white/10 dark:text-brand-200'
            }`}
          >
            <Power className="h-4 w-4" />
          </span>
        ) : (
          <ToggleSwitch on={isOn} loading={isLoading} />
        )}
      </div>

      <div className="relative">
        <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{device.label}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <StatePill state={state} variant={isGate ? 'gate' : 'relay'} />
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {isGate ? 'Toque para acionar' : `Canal ${device.command}`}
          </span>
        </div>
        {travelManaged && (
          <div
            className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              travelCurrent
                ? 'bg-sky-500 text-white'
                : 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100'
            }`}
          >
            {travelCurrent ? 'Ativa no modo viagem' : 'Reservada ao modo viagem'}
          </div>
        )}
      </div>
    </motion.button>
  );
};
