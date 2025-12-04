
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import idCardMockup from '@/assets/Hanging-ID-Card-Mockup-01.jpg';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [branch, setBranch] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoginView, setIsLoginView] = useState(true);

    const demoAccounts = [
        { role: 'Admin', email: 'admin@clove.com', password: 'Admin@123' },
        { role: 'HR', email: 'hr@clove.com', password: 'Hr@123' },
        { role: 'Employee', email: 'employee@clove.com', password: 'Employee@123' },
    ];

    const handleFillDemo = (demoEmail: string, demoPassword: string) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        setError('');
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        const matchedAccount = demoAccounts.find(
            (account) => account.email.toLowerCase() === email.trim().toLowerCase() && account.password === password
        );

        if (matchedAccount) {
            setError('');
            setIsSubmitting(false);
            if (matchedAccount.role === 'Employee') {
                navigate('/user-dashboard');
            } else {
                navigate('/dashboard');
            }
            return;
        }

        setError('Invalid credentials. Try one of the demo accounts below.');
        setIsSubmitting(false);
    };

    const handleRegister = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        // In a real app, you would handle registration logic here,
        // like sending data to a backend API.
        console.log('Registering with:', { name, employeeId, branch, email, password });
        setTimeout(() => {
            setIsSubmitting(false);
            // You might want to automatically log the user in or navigate to a confirmation page
            navigate('/user-dashboard');
        }, 1000);
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <div className="flex flex-1 justify-center">
                    <div className="layout-content-container flex w-full flex-1">
                        <div className="grid w-full grid-cols-1 md:grid-cols-2">
                            {/* Left Side - Branding */}
                            <div className="flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 md:p-10">
                                <div className="flex w-full max-w-md flex-col gap-6 rounded-lg bg-white dark:bg-background-dark md:bg-transparent md:dark:bg-transparent p-6 md:p-0">
                                    <div className="flex items-center gap-3">
                                        <img src={cloveLogo} alt="Clove" className="h-8" />
                                    </div>
                                    <div className="flex flex-col gap-2 text-left">
                                        <h2 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Welcome to the Company ID Portal</h2>
                                        <p className="text-[#617289] dark:text-gray-400 text-base font-normal leading-normal">Generate and manage your official company identification with ease and security. Please sign in or create an account to get started.</p>
                                    </div>
                                    <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg" style={{ backgroundImage: `url(${idCardMockup})` }}></div>
                                </div>
                            </div>
                            {/* Right Side - Auth Forms */}
                            <div className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900/50 p-6 md:p-10">
                                <div className="w-full max-w-md">
                                    <div className="flex px-4 py-3">
                                        <div className="flex h-10 flex-1 items-center justify-center rounded-lg bg-background-light dark:bg-background-dark p-1">
                                            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 ${isLoginView ? 'bg-white dark:bg-zinc-700 shadow-[0_0_4px_rgba(0,0,0,0.1)] text-[#111418] dark:text-white' : 'text-[#617289] dark:text-gray-400'} text-sm font-medium leading-normal`} onClick={() => setIsLoginView(true)}>
                                                <span className="truncate">Login</span>
                                                <input defaultChecked className="invisible w-0" name="auth-toggle" type="radio" value="Login" />
                                            </label>
                                            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 ${!isLoginView ? 'bg-white dark:bg-zinc-700 shadow-[0_0_4px_rgba(0,0,0,0.1)] text-[#111418] dark:text-white' : 'text-[#617289] dark:text-gray-400'} text-sm font-medium leading-normal`} onClick={() => setIsLoginView(false)}>
                                                <span className="truncate">Register</span>
                                                <input className="invisible w-0" name="auth-toggle" type="radio" value="Register" />
                                            </label>
                                        </div>
                                    </div>
                                    {isLoginView ? (
                                        <>
                                            <div className="px-4">
                                                <div className="rounded-2xl border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-900/60 p-4 shadow-sm">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-[#111418] dark:text-white">Demo Credentials</p>
                                                        <span className="text-xs font-medium text-primary">Tap to autofill</span>
                                                    </div>
                                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                                        {demoAccounts.map((account) => (
                                                            <button
                                                                key={account.role}
                                                                type="button"
                                                                onClick={() => handleFillDemo(account.email, account.password)}
                                                                className="w-full rounded-xl border border-transparent bg-background-light/60 dark:bg-zinc-800/60 px-4 py-3 text-left transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                            >
                                                                <p className="text-sm font-semibold text-[#111418] dark:text-white">{account.role}</p>
                                                                <p className="text-xs text-[#617289] dark:text-gray-400">{account.email}</p>
                                                                <p className="text-xs text-[#617289] dark:text-gray-400">{account.password}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <form className="flex flex-col" onSubmit={handleSubmit}>
                                                <h1 className="text-[#111418] dark:text-white tracking-light text-[32px] font-bold leading-tight px-4 text-left pb-3 pt-6">Sign In</h1>
                                                <div className="flex w-full flex-col gap-4 px-4 py-3">
                                                    <label className="flex flex-col min-w-40 flex-1">
                                                        <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Work Email</p>
                                                        <input
                                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                            placeholder="you@company.com"
                                                            type="email"
                                                            name="email"
                                                            autoComplete="email"
                                                            value={email}
                                                            onChange={(event) => setEmail(event.target.value)}
                                                            required
                                                        />
                                                    </label>
                                                    <label className="flex flex-col min-w-40 flex-1">
                                                        <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Password</p>
                                                        <div className="flex w-full flex-1 items-stretch rounded-lg">
                                                            <input
                                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] border-r-0 pr-2 text-base font-normal leading-normal"
                                                                placeholder="Enter your password"
                                                                type={showPassword ? 'text' : 'password'}
                                                                name="password"
                                                                autoComplete="current-password"
                                                                value={password}
                                                                onChange={(event) => setPassword(event.target.value)}
                                                                required
                                                            />
                                                            <div
                                                                className="text-[#617289] dark:text-gray-400 flex border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                            >
                                                                <span className="material-symbols-outlined text-2xl">
                                                                    {showPassword ? 'visibility_off' : 'visibility'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                                {error && (
                                                    <p className="px-4 text-sm font-medium text-red-500" role="alert">
                                                        {error}
                                                    </p>
                                                )}
                                                <div className="flex justify-between items-center px-4 py-3">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input className="form-checkbox h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-primary focus:ring-primary bg-background-light dark:bg-zinc-800" type="checkbox" />
                                                        <span className="text-[#111418] dark:text-gray-300 text-sm font-medium">Remember Me</span>
                                                    </label>
                                                    <a className="text-sm font-medium text-primary hover:underline" href="#">Forgot Password?</a>
                                                </div>
                                                <div className="px-4 py-3">
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmitting}
                                                        className="flex w-full items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] transition hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <span className="truncate">{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                                                    </button>
                                                </div>
                                            </form>
                                        </>
                                    ) : (
                                        <form className="flex flex-col" onSubmit={handleRegister}>
                                            <h1 className="text-[#111418] dark:text-white tracking-light text-[32px] font-bold leading-tight px-4 text-left pb-3 pt-6">Create Account</h1>
                                            <div className="flex w-full flex-col gap-4 px-4 py-3">
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Full Name</p>
                                                    <input
                                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                        placeholder="John Doe"
                                                        type="text"
                                                        name="name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Employee ID</p>
                                                    <input
                                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                        placeholder="CLOVE-123"
                                                        type="text"
                                                        name="employeeId"
                                                        value={employeeId}
                                                        onChange={(e) => setEmployeeId(e.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Branch</p>
                                                    <input
                                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                        placeholder="e.g., Headquarters"
                                                        type="text"
                                                        name="branch"
                                                        value={branch}
                                                        onChange={(e) => setBranch(e.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Work Email</p>
                                                    <input
                                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                        placeholder="you@company.com"
                                                        type="email"
                                                        name="email"
                                                        autoComplete="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Password</p>
                                                    <div className="flex w-full flex-1 items-stretch rounded-lg">
                                                        <input
                                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] border-r-0 pr-2 text-base font-normal leading-normal"
                                                            placeholder="Create a password"
                                                            type={showPassword ? 'text' : 'password'}
                                                            name="password"
                                                            autoComplete="new-password"
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            required
                                                        />
                                                        <div
                                                            className="text-[#617289] dark:text-gray-400 flex border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            <span className="material-symbols-outlined text-2xl">
                                                                {showPassword ? 'visibility_off' : 'visibility'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="px-4 py-3">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="flex w-full items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] transition hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <span className="truncate">{isSubmitting ? 'Registering...' : 'Register'}</span>
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;