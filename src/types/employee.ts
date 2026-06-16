export interface Employee {
  id?: number;
  fullName: string;
  employeeId: string;
  bloodGroup: string;
  branch: string;
  address?: string;
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

const REQUIRED_EMPLOYEE_FIELDS: { key: keyof Employee; label: string }[] = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'branch', label: 'Branch' },
];

export function getMissingEmployeeFields(employee: Employee): string[] {
  return REQUIRED_EMPLOYEE_FIELDS
    .filter(({ key }) => !String(employee[key] ?? '').trim())
    .map(({ label }) => label);
}

export function getRequiredFieldsToastMessage(employee: Employee): string | null {
  const missing = getMissingEmployeeFields(employee);
  if (missing.length === 0) return null;
  return `Please fill in: ${missing.join(', ')}`;
}
