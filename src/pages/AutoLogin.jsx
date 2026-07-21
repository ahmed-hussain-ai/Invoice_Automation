import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AutoLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('invoice_token', token);
      // Clean redirect to dashboard
      window.location.href = '/dashboard/invoice';
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return null;
}
