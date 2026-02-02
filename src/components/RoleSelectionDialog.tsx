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
                <AlertDialogHeader>
                    <AlertDialogTitle>Choose Your Dashboard</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have administrative privileges. Please choose which dashboard you would like to proceed to.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <AlertDialogCancel onClick={onClose} className="sm:mr-auto">
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        variant="secondary"
                        onClick={onUserRedirect}
                        className="w-full sm:w-auto"
                    >
                        User Dashboard
                    </Button>
                    <AlertDialogAction
                        onClick={onAdminRedirect}
                        className="w-full sm:w-auto"
                    >
                        Admin Dashboard
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default RoleSelectionDialog;