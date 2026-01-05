import React from 'react';
import { Employee, BLOOD_GROUPS, COUNTRY_CODES } from '@/types/employee';
import { useBranches } from '@/hooks/useBranches';

interface EmployeeFormProps {
  employee: Employee;
  onEmployeeChange: (employee: Employee) => void;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onEmployeeChange }) => {
  const { branches } = useBranches();
  const handleInputChange = (field: keyof Employee, value: string) => {
    if (field === 'employeeId') {
      // Remove spaces and auto-prefix CLOVE- if user enters only numbers
      value = value.replace(/\s+/g, '');
      const cleanValue = value.replace(/^CLOVE-?/, '');
      if (/^\d+$/.test(cleanValue) && cleanValue.length > 0) {
        value = `CLOVE-${cleanValue}`;
      }
    }

    if (field === 'emergencyContact') {
      // Allow only numbers for emergency contact
      value = value.replace(/\D/g, '').slice(0, 15);
    }

    if (field === 'fullName') {
      // Convert to uppercase
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
    if (/^clove[-_]/i.test(trimmed)) {
      return trimmed.replace(/^clove[-_]/i, 'CLOVE-');
    }
    if (/^\d+$/.test(trimmed)) {
      return `CLOVE-${trimmed}`;
    }
    if (/^CLOVE\d+$/i.test(trimmed)) {
      return trimmed.replace(/^clove/i, 'CLOVE-');
    }
    const digits = trimmed.match(/\d+/);
    if (digits) {
      return `CLOVE-${digits[0]}`;
    }
    return trimmed;
  };

  return (
    <>
      <div className="space-y-2.5">
        <label className="block text-muted-foreground text-sm">Full name</label>
        <input
          type="text"
          value={employee.fullName}
          onChange={(e) => handleInputChange('fullName', e.target.value)}
          placeholder="SHAIK AMEER BHASHA"
          className="w-full p-2.5 border border-input-border rounded-lg bg-white text-foreground text-sm uppercase"
        />
      </div>

      <div className="space-y-2.5 mt-2.5">
        <label className="block text-muted-foreground text-sm">Employee ID</label>
        <input
          type="text"
          value={employee.employeeId}
          onChange={(e) => handleInputChange('employeeId', e.target.value)}
          onBlur={() => handleBlur('employeeId')}
          placeholder="1027 or CLOVE-1027"
          className="w-full p-2.5 border border-input-border rounded-lg bg-white text-foreground text-sm"
        />
      </div>

      <div className="space-y-2.5 mt-2.5">
        <label className="block text-muted-foreground text-sm">Blood group</label>
        <select
          value={employee.bloodGroup}
          onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
          className="w-full p-2.5 border border-input-border rounded-lg bg-white text-foreground text-sm"
        >
          <option value="">Select</option>
          {BLOOD_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5 mt-2.5">
        <label className="block text-muted-foreground text-sm">Branch (select one)</label>
        <div className="radio-group">
          {branches.map((branch) => (
            <label key={branch.id} className="radio-option">
              <input
                type="radio"
                name="branch"
                value={branch.name}
                checked={employee.branch === branch.name}
                onChange={(e) => handleInputChange('branch', e.target.value)}
              />
              {branch.name}
            </label>
          ))}
          {branches.length === 0 && (
            <p className="text-xs text-red-500">No branches configured. Please add them in settings.</p>
          )}
        </div>
      </div>

      <div className="space-y-2.5 mt-2.5">
        <label className="block text-muted-foreground text-sm">Emergency contact</label>
        <div className="flex gap-2 items-center">
          <select
            value={employee.countryCode}
            onChange={(e) => handleInputChange('countryCode', e.target.value)}
            className="country-select p-2.5 border border-input-border rounded-lg bg-white text-foreground"
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
            className="flex-1 p-2.5 border border-input-border rounded-lg bg-white text-foreground text-sm"
          />
        </div>
      </div>
    </>
  );
};