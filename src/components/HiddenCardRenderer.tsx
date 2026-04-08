import React, { forwardRef } from 'react';
import { Employee } from '@/types/employee';
import { IDCardFront } from './IDCardFront';
import { IDCardBack } from './IDCardBack';

interface HiddenCardRendererProps {
    employee: any;
    id?: string;
}

export const HiddenCardRenderer = forwardRef<HTMLDivElement, HiddenCardRendererProps>(({ employee, id }, ref) => {
    if (!employee) return null;

    return (
        <div ref={ref} id={id} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <IDCardFront employee={employee} />
            <IDCardBack employee={employee} />
        </div>
    );
});