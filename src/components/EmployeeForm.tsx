import React, { useState, useRef } from 'react';
import { Employee, BLOOD_GROUPS, COUNTRY_CODES } from '@/types/employee';
import { useBranches } from '@/hooks/useBranches';
import { User, IdCard, Droplets, MapPin, Phone, CloudUpload, Camera } from 'lucide-react';
import { ImageAdjustments } from '@/components/ImageAdjustments';
import CameraCapture from '@/components/CameraCapture';

interface EmployeeFormProps {
  employee: Employee;
  onEmployeeChange: (employee: Employee) => void;
  onPhotoSelect: (file: File) => void;
  photoUrl?: string | null;
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

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee, onEmployeeChange, onPhotoSelect, photoUrl,
  filters, onFiltersChange, hasImage,
}) => {
  const { branches } = useBranches();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files[0];
    if (file) onPhotoSelect(file);
  };

  const handleCameraCapture = (dataUrl: string) => {
    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        onPhotoSelect(file);
      });
    setIsCameraOpen(false);
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Camera size={14} className="text-orange-500" />
          Profile Image
        </label>
        <div className="flex items-center justify-center w-full">
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              isDraggingPhoto
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            {photoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity">
                    Click to change
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <CloudUpload size={36} className="text-slate-500 dark:text-slate-400 mb-2" />
                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">JPG or PNG (MAX. 2MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) onPhotoSelect(e.target.files[0]);
              }}
            />
          </label>
        </div>
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
          >
            <Camera size={16} />
            Take Photo
          </button>
        </div>
      </div>

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

      {isCameraOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
};
