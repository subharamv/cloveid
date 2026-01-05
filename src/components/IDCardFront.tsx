import React from 'react';
import { Employee } from '@/types/employee';
import { useBranding } from '@/hooks/useBranding';
import cloveLogoDefault from '@/assets/CLOVE LOGO BLACK.png';

interface IDCardFrontProps {
    employee: Employee;
    photoBoxRef?: React.RefObject<HTMLDivElement>;
    canvasRef?: React.RefObject<HTMLCanvasElement>;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
}

export const IDCardFront = React.forwardRef<HTMLDivElement, IDCardFrontProps>(({
    employee,
    photoBoxRef,
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp
}, ref) => {
    const { branding } = useBranding();
    const logoSrc = branding.logo_id_front || cloveLogoDefault;

    return (
        <div ref={ref} className="id-card-front card-container relative w-[230px] h-[365px] bg-white">
            {/* Logo */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-[100px] mt-2">
                <img
                    src={logoSrc}
                    alt="Clove Technologies"
                    className="w-full"
                    crossOrigin="anonymous"
                />
            </div>

            {/* Employee Name */}
            <div className="absolute top-10 left-3 right-3 bottom-2 text-center font-bold text-[15px] text-foreground uppercase mt-5">
                {employee.fullName || 'FULL NAME'}
            </div>

            {/* Photo Box */}
            <div
                ref={photoBoxRef}
                className="absolute top-[89px] left-0 right-0 bottom-0 bg-gray-100 rounded-lg overflow-hidden"
                style={{
                    touchAction: 'none',
                    width: '230px',
                    height: '276px'
                }}
            >
                {canvasRef ? (
                    <canvas
                        ref={canvasRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            imageRendering: 'crisp-edges',
                            touchAction: 'none'
                        }}
                    />
                ) : (
                    (employee.photo_url || (employee.photo && typeof employee.photo === 'string')) && (
                        <img
                            src={(employee.photo_url || employee.photo) as string}
                            alt={employee.fullName}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                        />
                    )
                )}
            </div>
        </div>
    );
});