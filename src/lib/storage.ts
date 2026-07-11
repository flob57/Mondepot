import type { DayOff, DeclaredHours, DrivingSession, FuelEntry, Settings, WorkSession } from './types';

const KEYS = {
  work: 'depotdash-v1-work',
  driving: 'depotdash-v1-driving',
  fuel: 'depotdash-v1-fuel',
  declared: 'depotdash-v1-declared',
  daysOff: 'depotdash-v1-days-off',
  settings: 'depotdash-v1-settings',
};

export const defaultSettings: Settings = {
  overtimeStartingMinutes: 0,
  paidLeaveN1: 25.5,
  paidLeaveN: 2.5,
  dailyTargetMinutes: 450,
  weeklyTargetMinutes: 2250,
  monthlyTargetMinutes: 10350,
  yearlyTargetMinutes: 117000,
  vehicles: [
    'AX-603-EJ', 'BG-309-BJ', 'BH-431-KH', 'BH-732-KH', 'BT-265-AF',
    'BW-648-SW', 'GQ-655-WY', 'GV-989-MH', 'HB-009-AN', 'HB-342-AM', 'HB-640-AM'
  ],
  notion: {
    vehicles: '', workSessions: '', drivingSessions: '', fuelEntries: '', declaredHours: '', daysOff: '',
    servicesLMJV: '', servicesWednesday: '', servicesSaturdayVacation: '', schoolVacations: ''
  },
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getWork: () => read<WorkSession[]>(KEYS.work, []),
  setWork: (value: WorkSession[]) => write(KEYS.work, value),
  getDriving: () => read<DrivingSession[]>(KEYS.driving, []),
  setDriving: (value: DrivingSession[]) => write(KEYS.driving, value),
  getFuel: () => read<FuelEntry[]>(KEYS.fuel, []),
  setFuel: (value: FuelEntry[]) => write(KEYS.fuel, value),
  getDeclared: () => read<DeclaredHours[]>(KEYS.declared, []),
  setDeclared: (value: DeclaredHours[]) => write(KEYS.declared, value),
  getDaysOff: () => read<DayOff[]>(KEYS.daysOff, []),
  setDaysOff: (value: DayOff[]) => write(KEYS.daysOff, value),
  getSettings: () => ({ ...defaultSettings, ...read<Partial<Settings>>(KEYS.settings, {}) } as Settings),
  setSettings: (value: Settings) => write(KEYS.settings, value),
  clearAll: () => Object.values(KEYS).forEach((key) => localStorage.removeItem(key)),
};
