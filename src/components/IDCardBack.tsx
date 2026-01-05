import React from 'react';
import { Employee } from '@/types/employee';
import { useBranding } from '@/hooks/useBranding';
import { useBranches } from '@/hooks/useBranches';
import logoDefault from '@/assets/logo svg.png';

interface IDCardBackProps {
  employee: Employee;
}

export const IDCardBack = React.forwardRef<HTMLDivElement, IDCardBackProps>(({ employee }, ref) => {
  const { branding } = useBranding();
  const { branches } = useBranches();
  
  const branchInfo = branches.find(b => b.name === employee.branch);

  const emergencyContactDisplay = employee.countryCode && employee.emergencyContact
    ? `${employee.countryCode} ${employee.emergencyContact}`
    : employee.emergencyContact || '—';

  const logoSrc = branding.logo_id_back || logoDefault;

  return (
    <div ref={ref} className="id-card-back card-container relative w-[230px] h-[365px]">
      {/* Logo */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px]">
        <img
          src={logoSrc}
          alt="Clove Technologies"
          className="w-full"
          crossOrigin="anonymous"
        />
      </div>

      {/* Employee Details Block */}
      <div className="absolute top-11 left-3 right-3 bottom-3 text-[11px] text-foreground flex flex-col gap-1.5">
        {/* Dynamic Block */}
        <div className="grid gap-1 mt-10">
          <div className="grid grid-cols-[92px_16px_1fr] items-center">
            <div className="font-bold">Emp ID</div>
            <div className="text-left px-1">:</div>
            <div>{employee.employeeId || '—'}</div>
          </div>
          <div className="grid grid-cols-[92px_16px_1fr] items-center">
            <div className="font-bold">Blood Group</div>
            <div className="text-left px-1">:</div>
            <div>{employee.bloodGroup || '—'}</div>
          </div>
          <div className="grid grid-cols-[92px_16px_1fr] items-center">
            <div className="font-bold">Emergency No</div>
            <div className="text-left px-1">:</div>
            <div>{emergencyContactDisplay}</div>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1.5"></div>

        {/* Fixed Address Block */}
        <div className="text-[8.8px]">IF FOUND PLEASE RETURN TO :</div>
        <div className="font-bold text-[9.8px]">Clove Technologies Pvt. Ltd.</div>
        
        {branchInfo ? (
          <div className="text-[8.8px] leading-tight whitespace-pre-line">
            {branchInfo.address}
          </div>
        ) : (
          <div className="text-[8.8px]">Address not configured for {employee.branch}</div>
        )}

        <div className="border-t border-dashed border-gray-200 my-1.5"></div>

        <div className="font-semibold text-[8.8px]">Tel : {branchInfo?.phone || branding.contact_phone || '—'}</div>
        <div className="font-semibold text-[8.8px]">{branchInfo?.email || branding.contact_email || '—'}</div>
        <div className="font-semibold text-[8.8px]">{branchInfo?.website || branding.contact_website || '—'}</div>

      </div>
    </div>
  );
});