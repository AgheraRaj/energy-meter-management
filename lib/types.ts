export interface Meter {
  id: number;
  name: string;
  location: string;
  status: "active" | "offline" | "maintenance";
  minPowerKw: number | null;
  maxPowerKw: number | null;
}

export interface Reading {
  meterId: number;
  voltage: number;
  current: number;
  powerKw: number;
  energyKwh: number;
  recordedAt: string;
}

export interface MeterWithReading extends Meter {
  latestReading: Reading | null;
}

export interface AlertWithMeter {
  id: number;
  meterId: number;
  meter: { name: string };
  message: string;
  severity: "warning" | "critical";
  value: number;
  acknowledged: boolean;
  createdAt: string;
}