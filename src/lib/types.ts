export type WorkSession = {
  id: string;
  start: string;
  end?: string;
  note?: string;
};

export type DrivingSession = {
  id: string;
  workSessionId: string;
  vehicle: string;
  start: string;
  end?: string;
  startKm: number;
  endKm?: number;
  note?: string;
};

export type FuelEntry = {
  id: string;
  drivingSessionId: string;
  vehicle: string;
  date: string;
  km: number;
  litres: number;
};

export type DeclaredHours = {
  id: string;
  date: string;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  note: string;
};

export type DayOff = {
  id: string;
  date: string;
  type: 'public-holiday' | 'paid-leave';
  label: string;
};

export type Settings = {
  overtimeStartingMinutes: number;
  paidLeaveN1: number;
  paidLeaveN: number;
  dailyTargetMinutes: number;
  weeklyTargetMinutes: number;
  monthlyTargetMinutes: number;
  yearlyTargetMinutes: number;
  vehicles: string[];
  notion: {
    vehicles: string;
    workSessions: string;
    drivingSessions: string;
    fuelEntries: string;
    declaredHours: string;
    daysOff: string;
    servicesLMJV: string;
    servicesWednesday: string;
    servicesSaturdayVacation: string;
    schoolVacations: string;
  };
};
