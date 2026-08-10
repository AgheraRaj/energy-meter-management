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