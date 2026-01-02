import React from 'react';
import { Download, FileText, RefreshCcw, Printer, Image, Archive, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Employee } from '@/types/employee';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionButtonsProps {
  employee: Employee;
  onPrint: () => void;
  onDownloadPNG: () => void;
  onDownloadPDF: () => void;
  onDownloadZip: () => void;
  onReset: () => void;
  isPhotoUploaded: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  employee,
  onPrint,
  onDownloadPNG,
  onDownloadPDF,
  onDownloadZip,
  onReset,
  isPhotoUploaded,
  setIsSidebarOpen
}) => {
  const handleDownload = (type: 'png' | 'pdf' | 'zip') => {
    if (!employee.fullName || !employee.employeeId) {
      toast.error('Please fill in employee name and ID before downloading.');
      return;
    }

    switch (type) {
      case 'png':
        onDownloadPNG();
        break;
      case 'pdf':
        onDownloadPDF();
        break;
      case 'zip':
        onDownloadZip();
        break;
    }
  };

  const handleReset = () => {
    onReset();
    toast.success('All fields have been reset.');
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-dark-grey mb-6">Actions</h2>

      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={onPrint}
          className="bg-primary hover:bg-primary/90 text-white w-full"
          disabled={!isPhotoUploaded}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 text-white w-full"
              disabled={!isPhotoUploaded || !employee.fullName || !employee.employeeId}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleDownload('png')} className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              PNG Files (High Quality)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('pdf')} className="flex items-center gap-2">
              <FileType className="w-4 h-4" />
              PDF Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('zip')} className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              ZIP Archive (All Formats)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onClick={handleReset}
          variant="secondary"
          className="text-destructive hover:text-destructive w-full"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="mt-6 text-xs text-muted-foreground space-y-1">
        <p><strong>Download Information:</strong></p>
        <p>• PNG: High quality images for both sides</p>
        <p>• PDF: Print-ready document with both cards</p>
        <p>• ZIP: Contains all formats for backup</p>
      </div>
    </Card>
  );
};