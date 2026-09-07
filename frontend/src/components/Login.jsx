import { useState } from 'react';
import { FormField } from './FormField';
import { loginSchema, registrationSchema, validationMessage } from '../validation/schemas';

export default function Login({ onLogin, onRegister, error, setError }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = (mode === 'login' ? loginSchema : registrationSchema).safeParse(form);
    const validationError = validationMessage(result);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (mode === 'login') await onLogin(form.email, form.password);
      else await onRegister({ name: form.name, email: form.email, password: form.password });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode((current) => current === 'login' ? 'register' : 'login');
    setError('');
  }

  return (
    <main className="login-page">
      <div className="login-art">
        <div className="art-copy">
          <div className="brand light"><span className="brand-mark">N</span><span>northstar</span></div>
          <h1>Make progress<br /><em>visible.</em></h1>
          <p>A multi-tenant project management workspace with role-based access control.</p>
        </div>
        <div className="art-lines" />
      </div>
      <div className="login-panel">
        <div className="login-form">
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Get started'}</p>
          <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}</h2>
          <p className="muted">{mode === 'login' ? 'Use your work email to continue.' : 'Create an account to join your workspace.'}</p>
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <FormField label="Your name">
                <input name="name" type="text" value={form.name} onChange={updateField} autoComplete="name" />
              </FormField>
            )}
            <FormField label="Email address">
              <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" />
            </FormField>
            <FormField label="Password">
              <input name="password" type="password" value={form.password} onChange={updateField} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </FormField>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button full" type="submit" disabled={submitting}>
              {submitting ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Continue' : 'Create account')} <span>→</span>
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? "Don't have an account yet?" : 'Already have an account?'}
            <button type="button" onClick={switchMode}>{mode === 'login' ? 'Create one' : 'Sign in'}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
