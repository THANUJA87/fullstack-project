import { useState } from 'react';
import { FormField } from '../../../components/common/FormField';
import { loginSchema, registrationSchema, validationMessage } from '../../../validation/schemas';

export default function LoginForm({ onLogin, onRegister, error, setError }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault();
    const result = (mode === 'login' ? loginSchema : registrationSchema).safeParse(form);
    const message = validationMessage(result);
    if (message) { setError(message); return; }
    setSubmitting(true); setError('');
    try { if (mode === 'login') await onLogin(form.email, form.password); else await onRegister({ name: form.name, email: form.email, password: form.password }); }
    catch (submitError) { setError(submitError.message); } finally { setSubmitting(false); }
  }
  return <div className="login-form"><p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Get started'}</p><h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}</h2><p className="muted">{mode === 'login' ? 'Use your work email to continue.' : 'Create an account to join your workspace.'}</p><form onSubmit={submit}>{mode === 'register' && <FormField label="Your name"><input name="name" value={form.name} onChange={update} autoComplete="name" /></FormField>}<FormField label="Email address"><input name="email" type="email" value={form.email} onChange={update} autoComplete="email" /></FormField><FormField label="Password"><input name="password" type="password" value={form.password} onChange={update} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></FormField>{error && <p className="form-error">{error}</p>}<button className="primary-button full" type="submit" disabled={submitting}>{submitting ? 'Working…' : mode === 'login' ? 'Continue' : 'Create account'} <span>→</span></button></form><div className="auth-switch">{mode === 'login' ? "Don't have an account yet?" : 'Already have an account?'}<button type="button" onClick={() => { setMode((current) => current === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create one' : 'Sign in'}</button></div></div>;
}
