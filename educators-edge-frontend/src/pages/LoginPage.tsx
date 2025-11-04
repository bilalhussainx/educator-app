/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   LoginPage.tsx (UPDATED for CoreZenith)
 * =================================================================
 * DESCRIPTION: The login gateway for returning CoreZenith users.
 * It maintains the immersive, dual-pane design consistent with the
 * registration page, reinforcing the brand experience.
 */
import React, { useState } from 'react';
import apiClient from '../services/apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Import shared types for props and user model
import type { LoginPageProps, User } from '../types/index.ts';

// Import shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Re-usable logo component
const CoreZenithLogo = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const LoginPage: React.FC<LoginPageProps> = ({ setToken, setUser }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/auth/login', formData);
      const data = response.data;
      
      const token = data.token;
      setToken(token);
      localStorage.setItem('authToken', token);
      
      const decodedPayload: { user: User } = jwtDecode(token);
      setUser(decodedPayload.user);
      
      navigate('/dashboard');
      
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-stretch justify-center min-h-screen w-full bg-[#0a091a]">
      {/* Left Pane: Brand Identity */}
      <div className="hidden lg:flex w-1/2 flex-col items-start justify-center p-12 bg-indigo-950/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <CoreZenithLogo />
        <h1 className="mt-6 text-5xl font-bold text-white tracking-tighter">CoreZenith</h1>
        <p className="mt-4 text-xl text-gray-300">Your Ascent in Code.</p>
        <p className="mt-auto text-sm text-gray-500">© {new Date().getFullYear()} CoreZenith Inc. All Rights Reserved.</p>
      </div>

      {/* Right Pane: Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 text-white">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
                <CardDescription className="text-gray-400 pt-2">Log in to continue your ascent.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="ada@example.com" required value={formData.email} onChange={handleChange} className="bg-black/20 border-gray-600 focus:border-cyan-400" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} className="bg-black/20 border-gray-600 focus:border-cyan-400" />
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-base" disabled={isLoading}>
                        {isLoading ? 'Authenticating...' : 'Continue Ascent'}
                    </Button>

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white/5 text-gray-400">Or continue with</span>
                      </div>
                    </div>

                    {/* Google Sign In Button */}
                    <Button
                      type="button"
                      onClick={() => window.location.href = 'http://localhost:10000/api/auth/google'}
                      className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium border border-gray-300"
                      variant="outline"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign in with Google
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline">
                        Register
                    </Link>
                </div>
                <div className="mt-3 text-center text-sm text-gray-400">
                    <Link to="/portfolio" className="font-semibold text-green-400 hover:text-green-300 underline-offset-4 hover:underline inline-flex items-center gap-2">
                        <span>🎨</span>
                        <span>View 3D Developer Portfolio</span>
                    </Link>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   LoginPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import type { LoginPageProps, User } from '../types';
// import { jwtDecode } from 'jwt-decode';
// import { Link, useNavigate } from 'react-router-dom';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// const LoginPage: React.FC<LoginPageProps> = ({ setToken, setUser }) => {
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const navigate = useNavigate();

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await fetch('http://localhost:5000/api/auth/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Something went wrong');
      
//       const token = data.token;
//       setToken(token);
//       localStorage.setItem('authToken', token);
      
//       const decodedUser: { user: User } = jwtDecode(token);
//       setUser(decodedUser.user);
      
//       navigate('/dashboard');
      
//     } catch (err) {
//       if (err instanceof Error) setError(err.message);
//       else setError('An unknown error occurred.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <Card className="w-full max-w-sm">
//       <CardHeader>
//         <CardTitle className="text-2xl">Login</CardTitle>
//         <CardDescription>Enter your email below to login to your account.</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="space-y-2">
//             <Label htmlFor="email">Email</Label>
//             <Input id="email" name="email" type="email" placeholder="m@example.com" required value={formData.email} onChange={handleChange} />
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="password">Password</Label>
//             <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} />
//           </div>
//           {error && <p className="text-sm text-destructive">{error}</p>}
//           <Button type="submit" className="w-full" disabled={isLoading}>
//             {isLoading ? 'Logging in...' : 'Log In'}
//           </Button>
//         </form>
//         <div className="mt-4 text-center text-sm">
//           Don't have an account?{' '}
//           <Link to="/register" className="underline">
//             Register
//           </Link>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default LoginPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   LoginPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import type { LoginPageProps, User } from '../types';
// import { jwtDecode } from 'jwt-decode';
// import { Link, useNavigate } from 'react-router-dom';

// const LoginPage: React.FC<LoginPageProps> = ({ setToken, setUser }) => {
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const navigate = useNavigate(); // Hook for programmatic navigation.

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await fetch('http://localhost:5000/api/auth/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Something went wrong');
      
//       const token = data.token;
//       setToken(token);
//       localStorage.setItem('authToken', token);
      
//       const decodedUser: { user: User } = jwtDecode(token);
//       setUser(decodedUser.user);
      
//       // Navigate to the dashboard on successful login.
//       navigate('/dashboard');
      
//     } catch (err) {
//       if (err instanceof Error) setError(err.message);
//       else setError('An unknown error occurred.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
//       <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back!</h2>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         {/* Form fields remain the same */}
//         <div>
//           <label htmlFor="email">Email Address</label>
//           <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         <div>
//           <label htmlFor="password">Password</label>
//           <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
//         <div>
//           <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
//             {isLoading ? 'Logging in...' : 'Log In'}
//           </button>
//         </div>
//       </form>
//       <p className="mt-4 text-center text-sm text-gray-600">
//         Don't have an account?{' '}
//         <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
//           Register here
//         </Link>
//       </p>
//     </div>
//   );
// };

// export default LoginPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   LoginPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import type { LoginPageProps, User } from '../types';
// // A lightweight library to decode JWTs on the client-side.
// import { jwtDecode } from 'jwt-decode';

// const LoginPage: React.FC<LoginPageProps> = ({ setRoute, setToken, setUser }) => {
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await fetch('http://localhost:5000/api/auth/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Something went wrong');
      
//       // On successful login, save the token and decode it to get user info.
//       const token = data.token;
//       setToken(token);
//       localStorage.setItem('authToken', token);
      
//       // Decode the token to get the payload (which includes the user's role).
//       const decodedUser: { user: User } = jwtDecode(token);
//       setUser(decodedUser.user);
      
//       setRoute('dashboard');
      
//     } catch (err) {
//       if (err instanceof Error) setError(err.message);
//       else setError('An unknown error occurred.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md">
//       <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back!</h2>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div>
//           <label htmlFor="email">Email Address</label>
//           <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         <div>
//           <label htmlFor="password">Password</label>
//           <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
//         <div>
//           <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
//             {isLoading ? 'Logging in...' : 'Log In'}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default LoginPage;

