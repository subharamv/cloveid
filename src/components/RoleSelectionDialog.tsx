import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Shield, User, X } from 'lucide-react';

interface RoleSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdminRedirect: () => void;
    onUserRedirect: () => void;
}

const RoleSelectionDialog: React.FC<RoleSelectionDialogProps> = ({ isOpen, onClose, onAdminRedirect, onUserRedirect }) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="max-w-md">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                >
                    <X size={18} />
                </button>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">Choose Your Dashboard</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        You have access to multiple dashboards. Please choose which one you would like to proceed to.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:flex-col sm:justify-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={onUserRedirect}
                        className="w-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                        <User size={16} className="mr-2" />
                        Employee Dashboard
                    </Button>
                    <Button
                        onClick={onAdminRedirect}
                        className="w-full hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                        <Shield size={16} className="mr-2" />
                        Admin Dashboard
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default RoleSelectionDialog;