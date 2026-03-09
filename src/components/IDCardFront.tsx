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
    isLoadingImage?: boolean;
}

export const IDCardFront = React.forwardRef<HTMLDivElement, IDCardFrontProps>(({
    employee,
    photoBoxRef,
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isLoadingImage
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
                className="absolute top-[89px] left-0 right-0 bottom-0 bg-gray-100 rounded-lg overflow-hidden relative"
                style={{
                    touchAction: 'none',
                    width: '230px',
                    height: '276px'
                }}
            >
                {isLoadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 z-10">
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-12 h-12">
                                <svg
                                    className="absolute inset-0 w-full h-full animate-spin text-blue-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            </div>
                            <p className="text-white text-xs font-medium">Processing...</p>
                        </div>
                    </div>
                )}
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