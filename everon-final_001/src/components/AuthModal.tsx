import { useState } from 'react';
import { signIn, signUp, signInWithGoogle, resetPassword } from '../services/authService';
import './AuthModal.css';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'reset') {
        const result = await resetPassword(email);
        if (result.success) {
          setResetEmailSent(true);
        } else {
          setError(result.error || 'Failed to send reset email');
        }
      } else if (mode === 'signup') {
        const result = await signUp(email, password, displayName);
        if (result.success) {
          onAuthSuccess();
        } else {
          setError(result.error || 'Sign up failed');
        }
      } else {
        const result = await signIn(email, password);
        if (result.success) {
          onAuthSuccess();
        } else {
          setError(result.error || 'Sign in failed');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      if (result.success) {
        onAuthSuccess();
      } else {
        setError(result.error || 'Google sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose}>×</button>
        
        <div className="auth-header">
          <h2>
            {mode === 'signin' && '👋 Welcome Back'}
            {mode === 'signup' && '🚀 Join Everon'}
            {mode === 'reset' && '🔑 Reset Password'}
          </h2>
          <p>
            {mode === 'signin' && 'Sign in to save your chat history'}
            {mode === 'signup' && 'Create an account to get started'}
            {mode === 'reset' && 'Enter your email to reset password'}
          </p>
        </div>

        {error && <div className="auth-error">⚠️ {error}</div>}
        {resetEmailSent && <div className="auth-success">✅ Password reset email sent!</div>}

        <form onSubmit={handleEmailAuth} className="auth-form">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="auth-input"
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          
          {mode !== 'reset' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="auth-input"
            />
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? '⏳ Loading...' : (
              <>
                {mode === 'signin' && '🔓 Sign In'}
                {mode === 'signup' && '✨ Create Account'}
                {mode === 'reset' && '📧 Send Reset Link'}
              </>
            )}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>

            <button 
              onClick={handleGoogleSignIn} 
              className="google-signin-btn"
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <div className="auth-footer">
          {mode === 'signin' && (
            <>
              <p>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="auth-link">
                  Sign up
                </button>
              </p>
              <button onClick={() => setMode('reset')} className="auth-link">
                Forgot password?
              </button>
            </>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button onClick={() => setMode('signin')} className="auth-link">
                Sign in
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p>
              <button onClick={() => setMode('signin')} className="auth-link">
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
