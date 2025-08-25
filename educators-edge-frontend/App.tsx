/*
 * =================================================================
 * Main App Component: App.tsx
 * =================================================================
 * This is the root of your React application, now using TypeScript (.tsx).
 *
 * KEY TYPESCRIPT CONCEPTS INTRODUCED:
 * - Type Aliases & Interfaces: We use `type` to define the shape of objects
 * (like props) and the possible values for state.
 * - Generics (`<T>`): `useState<string | null>` tells TypeScript exactly
 * what kind of data this state variable can hold (a string or null).
 * This prevents you from accidentally putting a number or object there.
 * - React.FC: A type for defining a Functional Component. It provides
 * type-checking for props and a return value.
 * - Event Typing: Events like `onChange` and `onSubmit` are typed
 * (e.g., `React.ChangeEvent<HTMLInputElement>`) to give you autocompletion
 * and safety when accessing event properties like `e.target.value`.
 */
import React, { useState, useEffect } from 'react';
import apiClient from './src/services/apiClient';

// --- Type Definitions ---
// It's a best practice to define your types in one place.

// Defines the possible routes for our authentication flow.
// This is a "union type", meaning `Route` can only be 'login' or 'register'.
type Route = 'login' | 'register';

// Defines the props for the AuthNav component.
type AuthNavProps = {
  route: Route;
  // This is the type for a state setter function from `useState`.
  // It's a function that dispatches an action to set the state.
  setRoute: React.Dispatch<React.SetStateAction<Route>>;
};

// Defines the props for the LoginPage component.
type LoginPageProps = {
  setRoute: React.Dispatch<React.SetStateAction<Route>>;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
};

// Defines the props for the RegisterPage component.
type RegisterPageProps = {
  setRoute: React.Dispatch<React.SetStateAction<Route>>;
};

// Defines the props for the Dashboard component.
type DashboardProps = {
    token: string;
    setToken: React.Dispatch<React.SetStateAction<string | null>>;
};


// --- Helper Components ---

// A simple navigation component to switch between Login and Register
const AuthNav: React.FC<AuthNavProps> = ({ route, setRoute }) => (
  <nav className="flex justify-center space-x-4 mb-8">
    <button
      onClick={() => setRoute('login')}
      className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${
        route === 'login'
          ? 'bg-indigo-600 text-white shadow-md'
          : 'text-gray-500 hover:bg-gray-200'
      }`}
    >
      Login
    </button>
    <button
      onClick={() => setRoute('register')}
      className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${
        route === 'register'
          ? 'bg-indigo-600 text-white shadow-md'
          : 'text-gray-500 hover:bg-gray-200'
      }`}
    >
      Register
    </button>
  </nav>
);

// --- Page Components ---

const LoginPage: React.FC<LoginPageProps> = ({ setRoute, setToken }) => {
  // TypeScript infers the type of `formData` from its initial value.
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  // We explicitly type state that can be one of multiple types.
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Here, we type the event `e` as a React ChangeEvent on an HTMLInputElement.
  // This gives us type safety on `e.target`, so we know it has `name` and `value`.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // We type the event `e` as a React FormEvent on an HTMLFormElement.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password
      });
      
      const data = response.data;

      // We know `data` has a `token` property because our backend sends it.
      // In a larger app, we would define a type for this response, e.g., `type LoginResponse = { token: string }`.
      setToken(data.token);
      localStorage.setItem('authToken', data.token);

    } catch (err) {
      // `err` is of type `unknown` in a catch block. We cast it to `Error`
      // to safely access its `message` property.
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back!</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email">Email Address</label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        <div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </div>
      </form>
    </div>
  );
};

const RegisterPage: React.FC<RegisterPageProps> = ({ setRoute }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiClient.post('/api/auth/register', {
        email,
        password
      });
      
      setMessage('Registration successful! Please log in.');
      setTimeout(() => setRoute('login'), 2000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Create Your Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username">Username</label>
          <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="email">Email Address</label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        {message && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md">{message}</p>}
        <div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
            {isLoading ? 'Registering...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ token, setToken }) => {
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };
  
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold">Welcome to Educator's Edge!</h1>
      <p className="mt-4 text-lg text-gray-600">You are logged in.</p>
      <p className="mt-2 text-sm text-gray-500 break-all">Your Token: {token}</p>
      <button onClick={handleLogout} className="mt-8 py-2 px-6 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">
        Log Out
      </button>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  // We explicitly type our state variables for maximum clarity and safety.
  const [route, setRoute] = useState<Route>('login');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []); // Empty dependency array means this runs only once on mount.

  const renderContent = () => {
    switch (route) {
      case 'login':
        return <LoginPage setRoute={setRoute} setToken={setToken} />;
      case 'register':
        return <RegisterPage setRoute={setRoute} />;
      default:
        return <LoginPage setRoute={setRoute} setToken={setToken} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        {token ? (
          <Dashboard token={token} setToken={setToken} />
        ) : (
          <>
            <AuthNav route={route} setRoute={setRoute} />
            {renderContent()}
          </>
        )}
      </div>
       <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Educator's Edge &copy; 2025</p>
      </footer>
    </div>
  );
}