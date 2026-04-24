'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

function PasswordInput({ id, name, value, onChange, autoComplete, showPassword, onToggle, label, invalid = false }) {
  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <span className="auth-password-wrap">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          minLength={6}
          required
        />
        <button
          className="auth-password-toggle"
          type="button"
          onClick={onToggle}
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}

function GoogleMark() {
  return (
    <span className="auth-google__mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.3 13.1 17.7 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.7-2 5-4.2 6.6l6.6 5.2c3.9-3.6 6.4-9 6.4-15.8z"/>
        <path fill="#FBBC05" d="M10.5 28.4c-.5-1.5-.8-3.1-.8-4.9s.3-3.4.8-4.9l-7.8-6.1C1 16.1 0 20 0 23.5s1 7.4 2.7 10.9l7.8-6z"/>
        <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-6.6-5.2c-2 1.3-4.6 2.1-8.9 2.1-6.3 0-11.7-3.6-13.6-8.9l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
      </svg>
    </span>
  );
}

function LoginAuthPanel({ next, error, message, initialMode, loginAction, signUpAction, googleAction }) {
  const [mode, setMode] = useState(initialMode === 'signup' ? 'signup' : 'login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loginValues, setLoginValues] = useState({
    email: '',
    password: ''
  });
  const [signupValues, setSignupValues] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const loginEmailHasValue = loginValues.email.trim().length > 0;
  const signupEmailHasValue = signupValues.email.trim().length > 0;
  const signupPasswordHasValue = signupValues.password.length > 0;
  const signupConfirmHasValue = signupValues.confirmPassword.length > 0;
  const loginEmailInvalid = loginEmailHasValue && !isValidEmail(loginValues.email);
  const signupEmailInvalid = signupEmailHasValue && !isValidEmail(signupValues.email);
  const signupPasswordInvalid = signupPasswordHasValue && signupValues.password.length < 6;
  const signupPasswordMismatch =
    signupConfirmHasValue && signupValues.password !== signupValues.confirmPassword;
  const canLogin = isValidEmail(loginValues.email) && loginValues.password.length > 0;
  const canSignUp =
    signupValues.fullName.trim().length > 0 &&
    isValidEmail(signupValues.email) &&
    signupValues.password.length >= 6 &&
    signupValues.password === signupValues.confirmPassword;

  function updateLoginValue(key, value) {
    setLoginValues((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateSignupValue(key, value) {
    setSignupValues((current) => ({
      ...current,
      [key]: value
    }));
  }

  return (
    <div className="auth-card">
      <div className="auth-mode-switch" aria-label="Authentication mode">
        <button
          className={`auth-mode-switch__button ${mode === 'login' ? 'auth-mode-switch__button--active' : ''}`}
          type="button"
          onClick={() => setMode('login')}
        >
          Log in
        </button>
        <button
          className={`auth-mode-switch__button ${mode === 'signup' ? 'auth-mode-switch__button--active' : ''}`}
          type="button"
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>

      {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}
      {message ? <div className="auth-alert auth-alert--success">{message}</div> : null}

      <form action={googleAction} className="auth-form">
        <input type="hidden" name="next" value={next} />
        <button className="auth-google" type="submit">
          <GoogleMark />
          <span>Continue with Google</span>
        </button>
      </form>

      <div className="auth-divider">
        <span>or use email</span>
      </div>

      {mode === 'login' ? (
        <form action={loginAction} className="auth-form">
          <input type="hidden" name="next" value={next} />
          <h2 className="auth-form__title">Welcome back</h2>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={loginValues.email}
              onChange={(event) => updateLoginValue('email', event.target.value)}
              autoComplete="email"
              aria-invalid={loginEmailInvalid}
              required
            />
          </label>
          {loginEmailInvalid ? <p className="auth-field__hint auth-field__hint--error">Enter a valid email address.</p> : null}
          <PasswordInput
            id="login-password"
            name="password"
            label="Password"
            value={loginValues.password}
            onChange={(value) => updateLoginValue('password', value)}
            autoComplete="current-password"
            showPassword={showLoginPassword}
            onToggle={() => setShowLoginPassword((value) => !value)}
          />
          <button className="auth-submit" type="submit" disabled={!canLogin}>
            Log in
          </button>
          <button className="auth-swap" type="button" onClick={() => setMode('signup')}>
            New here? Create an account
          </button>
        </form>
      ) : (
        <form action={signUpAction} className="auth-form">
          <input type="hidden" name="next" value={next} />
          <h2 className="auth-form__title">Create your account</h2>
          <label className="auth-field">
            <span>Name</span>
            <input
              type="text"
              name="full_name"
              value={signupValues.fullName}
              onChange={(event) => updateSignupValue('fullName', event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={signupValues.email}
              onChange={(event) => updateSignupValue('email', event.target.value)}
              autoComplete="email"
              aria-invalid={signupEmailInvalid}
              required
            />
          </label>
          {signupEmailInvalid ? <p className="auth-field__hint auth-field__hint--error">Enter a valid email address.</p> : null}
          <PasswordInput
            id="signup-password"
            name="password"
            label="Password"
            value={signupValues.password}
            onChange={(value) => updateSignupValue('password', value)}
            autoComplete="new-password"
            showPassword={showSignupPassword}
            onToggle={() => setShowSignupPassword((value) => !value)}
            invalid={signupPasswordInvalid}
          />
          {signupPasswordInvalid ? (
            <p className="auth-field__hint auth-field__hint--error">Password must be at least 6 characters.</p>
          ) : null}
          <PasswordInput
            id="signup-confirm-password"
            name="confirm_password"
            label="Confirm Password"
            value={signupValues.confirmPassword}
            onChange={(value) => updateSignupValue('confirmPassword', value)}
            autoComplete="new-password"
            showPassword={showSignupPassword}
            onToggle={() => setShowSignupPassword((value) => !value)}
            invalid={signupPasswordMismatch}
          />
          {signupPasswordMismatch ? (
            <p className="auth-field__hint auth-field__hint--error">Passwords do not match.</p>
          ) : null}
          <button className="auth-submit auth-submit--purple" type="submit" disabled={!canSignUp}>
            Create account
          </button>
          <button className="auth-swap" type="button" onClick={() => setMode('login')}>
            Already have an account? Log in
          </button>
        </form>
      )}
    </div>
  );
}

export default LoginAuthPanel;
