export interface Meter {
  id: number;
  code: string | null;
  name: string;
  location: string;
  status: "active" | "offline" | "maintenance";
  minPowerKw: number | null;
  maxPowerKw: number | null;
  type: "transformer" | "equipment";
  feederCode: string | null;
  bus: string | null;
  ratedKw: number | null;
  parentMeterId: number | null;
}

export interface Reading {
  id?: number;
  meterId: number;
  voltage: number;
  current: number;
  powerKw: number;
  energyKwh: number;
  thd: number | null;
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
  severity: "warning" | "critical" | "normal";
  value: number;
  acknowledged: boolean;
  createdAt: string;
}