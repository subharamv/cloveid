import React from 'react';
import { Employee } from '@/types/employee';
import logo from '@/assets/logo svg.png';

interface IDCardBackProps {
  employee: Employee;
}

export const IDCardBack = React.forwardRef<HTMLDivElement, IDCardBackProps>(({ employee }, ref) => {
  const emergencyContactDisplay = employee.countryCode && employee.emergencyContact
    ? `${employee.countryCode} ${employee.emergencyContact}`
    : employee.emergencyContact || '—';

  return (
    <div ref={ref} className="id-card-back card-container relative w-[230px] h-[365px]">
      {/* Logo */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px]">
        <img
          src={logo}
          alt="Clove Technologies"
          className="w-full"
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
        {employee.branch === 'HYD' ? (
          <>
            <div className="text-[8.8px]">V.V.G Park View, H.No. 1-63/50,</div>
            <div className="text-[8.8px]">Plot No. 50, Kavuri Hills, Jubilee Hills</div>
            <div className="text-[8.8px]">Hyderabad-500033, TG, India</div>
          </>
        ) : (
          <>
            <div className="text-[8.8px]">Plot No.9, Hill No 2 APIIC IT & SEZ</div>
            <div className="text-[8.8px]">Rushikonda Madhurawada</div>
            <div className="text-[8.8px]">Visakhapatnam-530045, AP, India</div>
          </>
        )}

        <div className="border-t border-dashed border-gray-200 my-1.5"></div>

        <div className="font-semibold text-[8.8px]">{employee.branch === 'HYD' ? 'Tel : +91 89779 29563' : 'Tel : +91 87905 95566'}</div>
        <div className="font-semibold text-[8.8px]">hr@clovetech.com</div>
        <div className="font-semibold text-[8.8px]">www.clovetech.com</div>

      </div>
    </div>
  );
});