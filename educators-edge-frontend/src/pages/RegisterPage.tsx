/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   RegisterPage.tsx (UPDATED for CoreZenith)
 * =================================================================
 * DESCRIPTION: The entry point for new users of the CoreZenith platform.
 * This design establishes the brand's futuristic and aspirational
 * identity, splitting the screen into a brand promise and an interactive form.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { GraduationCap, BookOpen, UserCircle, Gift, CheckCircle, XCircle, Sparkles } from 'lucide-react';

// Import shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// An SVG for a futuristic logo, can be replaced with an actual image/component
const CoreZenithLogo = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const RegisterPage: React.FC = () => {
  const location = useLocation();
  const roleFromState = (location.state as { role?: string })?.role || 'student';

  // Get referral code from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get('ref') || '';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: roleFromState,
    referralCode: refCode
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [referralValid, setReferralValid] = useState<boolean | null>(refCode ? null : false);
  const [referrerName, setReferrerName] = useState<string>('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Validate referral code when it changes or on mount
  useEffect(() => {
    const validateReferralCode = async () => {
      if (!formData.referralCode || formData.referralCode.trim() === '') {
        setReferralValid(null);
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(
          `http://localhost:10000/api/referrals/validate/${formData.referralCode}`,
          {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }
        );

        const data = await response.json();

        if (data.valid) {
          setReferralValid(true);
          setReferrerName(data.data.referrerDisplayName);
        } else {
          setReferralValid(false);
          setReferrerName('');
        }
      } catch (error) {
        console.error('Error validating referral code:', error);
        setReferralValid(false);
      }
    };

    const debounce = setTimeout(() => {
      validateReferralCode();
    }, 500);

    return () => clearTimeout(debounce);
  }, [formData.referralCode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient.post('/api/auth/register', formData);
      const welcomeBonusMsg = response.data.welcomeBonus
        ? `\n🎉 ${response.data.welcomeBonus.message}`
        : '';
      setMessage(`Registration successful! ${welcomeBonusMsg}\n\nRedirecting to login...`);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = () => {
    return formData.role === 'teacher' ? <GraduationCap className="w-16 h-16 text-purple-400" /> : <BookOpen className="w-16 h-16 text-cyan-400" />;
  };

  const getRoleColor = () => {
    return formData.role === 'teacher' ? 'from-purple-500 to-pink-500' : 'from-cyan-500 to-blue-500';
  };

  return (
    <div className="flex items-stretch justify-center min-h-screen w-full bg-[#0a091a]">
      {/* Left Pane: Brand Identity */}
      <div className="hidden lg:flex w-1/2 flex-col items-start justify-center p-12 bg-indigo-950/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <CoreZenithLogo />
        <h1 className="mt-6 text-5xl font-bold text-white tracking-tighter">Educators Edge</h1>
        <p className="mt-4 text-xl text-gray-300">Where Learning Meets Innovation</p>
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${getRoleColor()} rounded-lg flex items-center justify-center`}>
              {formData.role === 'teacher' ? <GraduationCap className="w-6 h-6 text-white" /> : <BookOpen className="w-6 h-6 text-white" />}
            </div>
            <span className="text-gray-300">Joining as a {formData.role === 'teacher' ? 'Teacher' : 'Student'}</span>
          </div>
        </div>
        <p className="mt-auto text-sm text-gray-500">© {new Date().getFullYear()} Educators Edge. All Rights Reserved.</p>
      </div>

      {/* Right Pane: Registration Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 text-white">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={`p-4 bg-gradient-to-r ${getRoleColor()} rounded-2xl`}>
                    {getRoleIcon()}
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight">Create Your Account</CardTitle>
                <CardDescription className="text-gray-400 pt-2">
                  {formData.role === 'teacher'
                    ? 'Start inspiring the next generation'
                    : 'Begin your learning journey today'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Welcome Bonus Banner */}
                <div className="mb-6 p-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="w-6 h-6 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">Welcome Bonus!</h3>
                  </div>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Get <span className="font-semibold text-cyan-400">100 Z-Credits</span> instantly
                    </p>
                    <p className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Enjoy <span className="font-semibold text-purple-400">3 Free AI Mentor Sessions</span>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Role Toggle */}
                    <div className="flex gap-2 p-1 bg-black/40 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
                        className={`flex-1 py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 ${
                          formData.role === 'student'
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'teacher' }))}
                        className={`flex-1 py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 ${
                          formData.role === 'teacher'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4" />
                        Teacher
                      </button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username" className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4" />
                          Username
                        </Label>
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          placeholder="ada_lovelace"
                          required
                          value={formData.username}
                          onChange={handleChange}
                          className="bg-black/20 border-gray-600 focus:border-cyan-400 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="ada@example.com"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="bg-black/20 border-gray-600 focus:border-cyan-400 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="bg-black/20 border-gray-600 focus:border-cyan-400 text-white"
                        />
                    </div>

                    {/* Referral Code Input */}
                    <div className="space-y-2">
                        <Label htmlFor="referralCode" className="flex items-center gap-2">
                          <Gift className="w-4 h-4" />
                          Referral Code (Optional)
                        </Label>
                        <div className="relative">
                          <Input
                            id="referralCode"
                            name="referralCode"
                            type="text"
                            placeholder="Enter referral code"
                            value={formData.referralCode}
                            onChange={handleChange}
                            className={`bg-black/20 border-gray-600 focus:border-cyan-400 text-white pr-10 ${
                              referralValid === true ? 'border-green-500' :
                              referralValid === false ? 'border-red-500' : ''
                            }`}
                          />
                          {referralValid === true && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                          )}
                          {referralValid === false && formData.referralCode && (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                          )}
                        </div>
                        {referralValid === true && referrerName && (
                          <p className="text-sm text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Referred by {referrerName} - You'll both get 100 Z-Credits!
                          </p>
                        )}
                        {referralValid === false && formData.referralCode && (
                          <p className="text-sm text-red-400 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            Invalid referral code
                          </p>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {message && <p className="text-sm text-green-400">{message}</p>}
                    <Button
                      type="submit"
                      className={`w-full bg-gradient-to-r ${getRoleColor()} hover:opacity-90 text-white font-bold text-base`}
                      disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : `Start as ${formData.role === 'teacher' ? 'Teacher' : 'Student'}`}
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
                      Sign up with Google
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline">
                        Log In
                    </Link>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;

// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   RegisterPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// const RegisterPage: React.FC = () => {
//   const [formData, setFormData] = useState({ username: '', email: '', password: '' });
//   const [message, setMessage] = useState<string | null>(null);
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
//     setMessage(null);
//     try {
//       const response = await fetch('http://localhost:5000/api/auth/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Failed to register');
//       setMessage('Registration successful! Redirecting to login...');
//       setTimeout(() => navigate('/login'), 2000);
//     } catch (err) {
//       if (err instanceof Error) setError(err.message);
//       else setError('An unknown error occurred.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <Card className="w-full max-w-sm">
//         <CardHeader>
//             <CardTitle className="text-2xl">Create an Account</CardTitle>
//             <CardDescription>Enter your information to create a new account.</CardDescription>
//         </CardHeader>
//         <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-4">
//                 <div className="space-y-2">
//                     <Label htmlFor="username">Username</Label>
//                     <Input id="username" name="username" type="text" placeholder="Your Name" required value={formData.username} onChange={handleChange} />
//                 </div>
//                 <div className="space-y-2">
//                     <Label htmlFor="email">Email</Label>
//                     <Input id="email" name="email" type="email" placeholder="m@example.com" required value={formData.email} onChange={handleChange} />
//                 </div>
//                 <div className="space-y-2">
//                     <Label htmlFor="password">Password</Label>
//                     <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} />
//                 </div>
//                 {error && <p className="text-sm text-destructive">{error}</p>}
//                 {message && <p className="text-sm text-green-600">{message}</p>}
//                 <Button type="submit" className="w-full" disabled={isLoading}>
//                     {isLoading ? 'Registering...' : 'Create Account'}
//                 </Button>
//             </form>
//             <div className="mt-4 text-center text-sm">
//                 Already have an account?{' '}
//                 <Link to="/login" className="underline">
//                     Log in
//                 </Link>
//             </div>
//         </CardContent>
//     </Card>
//   );
// };

// export default RegisterPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   RegisterPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';

// const RegisterPage: React.FC = () => {
//   const [formData, setFormData] = useState({ username: '', email: '', password: '' });
//   const [message, setMessage] = useState<string | null>(null);
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
//     setMessage(null);
//     try {
//       const response = await fetch('http://localhost:5000/api/auth/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Failed to register');
//       setMessage('Registration successful! Redirecting to login...');
//       setTimeout(() => navigate('/login'), 2000);
//     } catch (err) {
//       if (err instanceof Error) setError(err.message);
//       else setError('An unknown error occurred.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//      <div className="flex items-center justify-center min-h-screen">
//         <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
//           <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Create Your Account</h2>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div><label htmlFor="username">Username</label><input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" /></div>
//             <div><label htmlFor="email">Email Address</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" /></div>
//             <div><label htmlFor="password">Password</label><input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" /></div>
//             {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
//             {message && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md">{message}</p>}
//             <div><button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">{isLoading ? 'Registering...' : 'Create Account'}</button></div>
//           </form>
//            <p className="mt-4 text-center text-sm text-gray-600">
//             Already have an account?{' '}
//             <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
//               Log in
//             </Link>
//           </p>
//         </div>
//     </div>
//   );
// };

// export default RegisterPage;
