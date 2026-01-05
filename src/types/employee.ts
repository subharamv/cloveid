export interface Employee {
  id?: number;
  fullName: string;
  employeeId: string;
  bloodGroup: string;
  branch: string;
  emergencyContact: string;
  countryCode: string;
  photo?: File | string | null;
  photo_url?: string | null;
  zip_url?: string | null;
  status?: string;
}

export interface PhotoTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface CardDimensions {
  width: number;  // in inches
  height: number; // in inches
  photoWidth: number;
  photoHeight: number;
}

export const CARD_DIMENSIONS: CardDimensions = {
  width: 2.125,
  height: 3.375,
  photoWidth: 2.125,
  photoHeight: 2.392,
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BRANCHES = ['HYD', 'VIZAG'];


export const DEPARTMENTS = [
  'Administration',
  'Arch Illus',
  'Architectural',
  'Built Design 2D',
  'Built Design 3D',
  'CAD',
  'Client Management',
  'Data Acquisition',
  'Finance',
  'GIS',
  'Human Resources',
  'IT Support',
  'Marketing',
  'Solution Engineering Hub',
  'Unit Head'
];

export const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: '+91' },
  { code: '+1', flag: '🇺🇸', label: '+1' },
  { code: '+44', flag: '🇬🇧', label: '+44' },
];
