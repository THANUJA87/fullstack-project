import { useState } from 'react';
import { FormField } from '../../../components/common/FormField';
import { loginSchema, validationMessage } from '../../../validation/schemas';

export default function LoginForm({ onLogin, error, setError }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault();
    const result = loginSchema.safeParse(form);
    const message = validationMessage(result);
    if (message) { setError(message); return; }
    setSubmitting(true); setError('');
    try { await onLogin(form.email, form.password); }
    catch (submitError) { setError(submitError.message); } finally { setSubmitting(false); }
  }
  return <div className="login-form"><p className="eyebrow">Welcome back</p><h2>Sign in to your workspace</h2><p className="muted">Use your work email to continue.</p><form onSubmit={submit}><FormField label="Email address"><input name="email" type="email" value={form.email} onChange={update} autoComplete="email" /></FormField><FormField label="Password"><input name="password" type="password" value={form.password} onChange={update} autoComplete="current-password" /></FormField>{error && <p className="form-error">{error}</p>}<button className="primary-button full" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Continue'} <span>→</span></button></form></div>;
}
