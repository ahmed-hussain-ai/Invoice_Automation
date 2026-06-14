import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Hardcoded credentials ───────────────────────────────────────────────────
const VALID_EMAIL    = 'muhammadasifnawazkhanniazi@rankify.com';
const VALID_PASSWORD = 'TheBoss123!@%$';
// ─────────────────────────────────────────────────────────────────────────────

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  // If already logged in, skip login page
  useEffect(() => {
    if (localStorage.getItem('invoice_token')) {
      navigate('/dashboard/invoice', { replace: true });
    }
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      localStorage.setItem('invoice_token', 'true');
      navigate('/dashboard/invoice', { replace: true });
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-brand-dark">Login</h2>
        {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-brand-dark"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-brand-dark"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-brand-dark text-white py-2 rounded hover:bg-blue-900 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
