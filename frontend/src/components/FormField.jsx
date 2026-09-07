export function FormField({ label, error, children }) {
  return (
    <label>
      {label}
      {children}
      {error && <small className="form-error">{error}</small>}
    </label>
  );
}

export function FieldError({ message }) {
  return message ? <p className="form-error">{message}</p> : null;
}
