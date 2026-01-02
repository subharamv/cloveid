import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { useAuth } from '../hooks/useAuth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
    setIsSidebarOpen: (isOpen: boolean) => void;
    activeTab?: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ setIsSidebarOpen, activeTab }) => {
    const { user, logout } = useAuth();

    const getLinkClass = (tab: string) => {
        return activeTab === tab
            ? "text-primary text-sm font-medium leading-normal"
            : "text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal";
    };

    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-gray-700 px-2.5 py-3 bg-white dark:bg-background-dark">
            <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                <button className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
                    <span className="material-symbols-outlined text-2xl">menu</span>
                </button>
                <img src={logo} alt="Logo" className="h-8 w-auto" />
            </div>
            <div className="hidden lg:flex flex-1 justify-center gap-8">
                <div className="flex items-center gap-9">
                    <Link className={getLinkClass('dashboard')} to="/dashboard">Dashboard</Link>
                    <Link className={getLinkClass('selection')} to="/selection">New Batch</Link>
                    <Link className={getLinkClass('manage-requests')} to="/manage-requests">Manage Employees</Link>
                    <DropdownMenu>
                        <DropdownMenuTrigger className={activeTab === 'settings' ? "text-primary text-sm font-medium leading-normal" : "text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal"}>
                            Settings
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>
                                <Link to="/vendor">Vendor Management</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Link to="/user-management">User Management</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Link to="/user-dashboard">User Dashboard</Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="flex items-center justify-end gap-4">
                <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <span className="material-symbols-outlined text-xl">notifications</span>
                </button>
                <div 
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" 
                    data-alt="User avatar image" 
                    style={{ backgroundImage: `url(${user?.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTuk1Iosn49fHWfKjAP9fBJw3pQzsM6YL5zr-Cxka0K6IIkmxhTiisNLHxHNnJ9KANzspNqOKesKX_0x9HyVIotvJDUojrFn2AWhrITYpZtN0xi9T7ugql-9wNJQnqPuWDUZnZIbtnSxLe2Onfl1FMn0BF4vM61YkMxGtaPP6Gq-SqEPQfugyzpPDy7QoNGts7_1Abd7NSO-7z37gh5XlZ1BW6zV02LVXWhiY9TQDiVZOFWYhWBBRvJEJZ7Ys0spYA1NDiqcHthFzB'})` }}
                ></div>
                <button onClick={logout} className="hidden lg:flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <span className="material-symbols-outlined text-xl">logout</span>
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;
