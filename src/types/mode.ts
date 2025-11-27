export type Mode = 'LAB' | 'PROD';

export interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
}
