
import React from 'react';

const TrackStatus = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">Track Your ID Card Status</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Enter your application ID to see the current status of your ID card.</p>
            </div>
            <div className="mt-8 w-full max-w-md">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-full shadow-md">
                    <input
                        type="text"
                        placeholder="Enter Application ID"
                        className="w-full px-6 py-4 text-gray-700 dark:text-gray-300 bg-transparent focus:outline-none"
                    />
                    <button className="px-6 py-4 text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none">
                        Track
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrackStatus;