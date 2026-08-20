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
  alarmSetpointKva: number | null;
  alertSetpointKva: number | null;
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
  powerFactor: number | null;
  frequencyHz: number | null;
  apparentPowerKva: number | null;
  voltageR: number | null;
  voltageY: number | null;
  voltageB: number | null;
  currentR: number | null;
  currentY: number | null;
  currentB: number | null;
  powerKwR: number | null;
  powerKwY: number | null;
  powerKwB: number | null;
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