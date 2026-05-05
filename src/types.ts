
export interface StentReport {
  id: string;
  ownerId: string;
  sample: string;
  stentMaterial: string;
  stentRodArea: number;
  calcArea: number;
  encapArea: number;
  encapRatioVsCalc: number;
  encapRatioVsStent: number;
  calcDistMean: number;
  calcDistMax: number;
  calcDistMin: number;
  createdAt: string;
  status: 'draft' | 'final';
}

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
