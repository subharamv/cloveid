import React from 'react';
import { Employee, BLOOD_GROUPS, COUNTRY_CODES } from '@/types/employee';
import { useBranches } from '@/hooks/useBranches';
import { User, IdCard, Droplets, MapPin, Phone } from 'lucide-react';
import { ImageAdjustments } from '@/components/ImageAdjustments';

interface EmployeeFormProps {
  employee: Employee;
  onEmployeeChange: (employee: Employee) => void;
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    shadow: number;
  };
  onFiltersChange?: (filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    shadow: number;
  }) => void;
  hasImage?: boolean;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onEmployeeChange, filters, onFiltersChange, hasImage }) => {
  const { branches } = useBranches();
  const handleInputChange = (field: keyof Employee, value: string) => {
    if (field === 'employeeId') {
      value = value.replace(/\s+/g, '');
      const cleanValue = value.replace(/^CLOVE-?/, '');
      if (/^\d+$/.test(cleanValue) && cleanValue.length > 0) {
        value = `CLOVE-${cleanValue}`;
      }
    }
    if (field === 'emergencyContact') {
      value = value.replace(/\D/g, '').slice(0, 15);
    }
    if (field === 'fullName') {
      value = value.toUpperCase();
    }
    onEmployeeChange({ ...employee, [field]: value });
  };

  const handleBlur = (field: keyof Employee) => {
    if (field === 'employeeId') {
      const normalized = normalizeEmpId(employee.employeeId);
      onEmployeeChange({ ...employee, employeeId: normalized });
    }
  };

  const normalizeEmpId = (value: string): string => {
    if (!value) return '';
    const trimmed = value.trim();
    if (/^clove[-_]/i.test(trimmed)) return trimmed.replace(/^clove[-_]/i, 'CLOVE-');
    if (/^\d+$/.test(trimmed)) return `CLOVE-${trimmed}`;
    if (/^CLOVE\d+$/i.test(trimmed)) return trimmed.replace(/^clove/i, 'CLOVE-');
    const digits = trimmed.match(/\d+/);
    if (digits) return `CLOVE-${digits[0]}`;
    return trimmed;
  };

  const fields = [
    {
      label: 'Full Name',
      icon: User,
      field: 'fullName' as keyof Employee,
      placeholder: 'SHAIK AMEER BHASHA',
      uppercase: true,
    },
    {
      label: 'Employee ID',
      icon: IdCard,
      field: 'employeeId' as keyof Employee,
      placeholder: 'CLOVE-1027',
      onBlur: true,
    },
  ];

  return (
    <div className="space-y-5">
      {fields.map(({ label, icon: Icon, field, placeholder, onBlur }) => (
        <div key={field} className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Icon size={14} className="text-orange-500" />
            {label}
          </label>
          <input
            type="text"
            value={String(employee[field] || '')}
            onChange={(e) => handleInputChange(field, e.target.value)}
            onBlur={onBlur ? () => handleBlur(field) : undefined}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all uppercase"
          />
        </div>
      ))}

      {/* Blood Group */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Droplets size={14} className="text-orange-500" />
          Blood Group
        </label>
        <select
          value={employee.bloodGroup}
          onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
        >
          <option value="">Select blood group</option>
          {BLOOD_GROUPS.map((group) => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </div>

      {/* Branch */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <MapPin size={14} className="text-orange-500" />
          Branch
        </label>
        <div className="flex flex-wrap gap-2">
          {branches.map((branch) => {
            const selected = employee.branch === branch.name;
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => handleInputChange('branch', branch.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selected
                    ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white border-orange-500 shadow-sm shadow-orange-200 dark:shadow-orange-900/30'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {branch.name}
              </button>
            );
          })}
          {branches.length === 0 && (
            <p className="text-xs text-red-500">No branches configured. Add them in settings.</p>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Phone size={14} className="text-orange-500" />
          Emergency Contact
        </label>
        <div className="flex gap-2">
          <select
            value={employee.countryCode}
            onChange={(e) => handleInputChange('countryCode', e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
          >
            {COUNTRY_CODES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={employee.emergencyContact}
            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
            maxLength={10}
            placeholder="9876543210"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Image Adjustments */}
      {filters && onFiltersChange && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Image Adjustments</p>
          <ImageAdjustments
            brightness={filters.brightness}
            contrast={filters.contrast}
            saturation={filters.saturation}
            shadow={filters.shadow}
            onBrightnessChange={(val) => onFiltersChange({ ...filters, brightness: val })}
            onContrastChange={(val) => onFiltersChange({ ...filters, contrast: val })}
            onSaturationChange={(val) => onFiltersChange({ ...filters, saturation: val })}
            onShadowChange={(val) => onFiltersChange({ ...filters, shadow: val })}
            onAutoEnhance={() => onFiltersChange({ brightness: 1.1, contrast: 1.15, saturation: 1.1, shadow: 0 })}
            onResetFilters={() => onFiltersChange({ brightness: 1, contrast: 1, saturation: 1, shadow: 0 })}
            hasImage={!!hasImage}
          />
        </div>
      )}
    </div>
  );
};
