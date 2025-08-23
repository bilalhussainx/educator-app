/*
 * =================================================================
 * FOLDER: src/components/
 * FILE:   ProtectedRoute.tsx (NEW FILE)
 * =================================================================
 * DESCRIPTION: This is a wrapper component that protects routes from
 * being accessed by users who are not logged in.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';

type ProtectedRouteProps = {
    token: string | null;
    children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, children }) => {
    if (!token) {
        // If there's no token, redirect the user to the login page.
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;