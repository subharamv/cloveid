import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NewBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewBatchModal: React.FC<NewBatchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSingleCard = () => {
    navigate('/single-card');
    onClose();
  };

  const handleBulkCard = () => {
    navigate('/bulk-card-import');
    onClose();
  };

  const handleManageRequests = () => {
    navigate('/manage-requests');
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Start a new creation</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              How many ID cards do you want to create?
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleSingleCard}
              className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">Create a Single Card</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">For new hires, replacements, or individual updates</p>
              </div>
            </button>

            <button
              onClick={handleBulkCard}
              className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">Create Multiple Cards</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Use a data file (CSV) to generate cards in bulk</p>
              </div>
            </button>

            <button
              onClick={handleManageRequests}
              className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">Manage Employee Requests</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Review, approve, or reject ID card requests</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewBatchModal;
