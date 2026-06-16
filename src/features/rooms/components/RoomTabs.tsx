import { motion } from 'framer-motion';
import { BedDouble, CarFront, Fence, LayoutGrid, Sofa, Utensils } from 'lucide-react';
import type { Room, RoomIcon } from '../../../types/device';

const iconMap: Record<RoomIcon, typeof Sofa> = {
  sofa: Sofa,
  utensils: Utensils,
  bed: BedDouble,
  car: CarFront,
  gate: Fence,
  grid: LayoutGrid,
};

interface RoomTabsProps {
  rooms: Room[];
  activeRoomId: string;
  activeCounts: Record<string, number>;
  onSelect: (roomId: string) => void;
}

export const RoomTabs = ({ rooms, activeRoomId, activeCounts, onSelect }: RoomTabsProps) => (
  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
    {rooms.map((room) => {
      const Icon = iconMap[room.icon];
      const isActive = room.id === activeRoomId;
      const count = activeCounts[room.id] ?? 0;

      return (
        <button
          key={room.id}
          type="button"
          onClick={() => onSelect(room.id)}
          className={`relative flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
            isActive
              ? 'text-white'
              : 'text-slate-500 hover:text-brand-600 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="activeRoomTab"
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-500 shadow-soft"
            />
          )}
          <Icon className="h-4 w-4" />
          <span className="whitespace-nowrap">{room.name}</span>
          {count > 0 && (
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                isActive ? 'bg-white/25 text-white' : 'bg-brand-100 text-brand-600 dark:bg-white/10 dark:text-brand-100'
              }`}
            >
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
