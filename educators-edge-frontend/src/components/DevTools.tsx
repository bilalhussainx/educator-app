/*
 * =================================================================
 * FOLDER: src/components/
 * FILE:   DevTools.tsx (NEW FILE)
 * =================================================================
 */
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { User } from '../types/index.ts';

const DevTools: React.FC = () => {
    const [decodedToken, setDecodedToken] = useState<User | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const decoded: { user: User } = jwtDecode(token);
                setDecodedToken(decoded.user);
            } catch (e) {
                console.error("Error decoding token in DevTools", e);
                setDecodedToken(null);
            }
        }
    }, []);

    const handleForceClear = () => {
        console.log("Forcing clear of localStorage and reloading...");
        localStorage.clear();
        window.location.reload();
    };

    return (
        <div className="mt-12 p-4 bg-yellow-100 border-2 border-dashed border-yellow-500 rounded-lg text-left text-sm text-gray-800">
            <h3 className="font-bold text-lg mb-2 text-yellow-800">Developer Tools</h3>
            <div className="mb-4">
                <p className="font-semibold">Decoded User from Stored Token:</p>
                {decodedToken ? (
                    <pre className="bg-gray-800 text-white p-2 rounded-md overflow-x-auto text-xs">
                        {JSON.stringify(decodedToken, null, 2)}
                    </pre>
                ) : (
                    <p>No valid token found in localStorage.</p>
                )}
            </div>
            <button
                onClick={handleForceClear}
                className="py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700"
            >
                Force Clear Storage & Reload
            </button>
        </div>
    );
};

export default DevTools;