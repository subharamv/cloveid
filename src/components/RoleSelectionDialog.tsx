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
                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100 text-slate-700"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
                <AlertDialogHeader>
                    <AlertDialogTitle>Choose Your Dashboard</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have administrative privileges. Please choose which dashboard you would like to proceed to.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <Button
                            variant="secondary"
                            onClick={onUserRedirect}
                            className="w-full sm:w-auto"
                        >
                            User Dashboard
                        </Button>
                        <Button
                            onClick={onAdminRedirect}
                            className="w-full sm:w-auto"
                        >
                            Admin Dashboard
                        </Button>
                    </div>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default RoleSelectionDialog;