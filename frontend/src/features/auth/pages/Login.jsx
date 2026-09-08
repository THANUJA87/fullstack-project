import LoginForm from '../components/LoginForm';

export default function Login({ onLogin, onRegister, error, setError }) {
  return (
    <main className="login-page">
      <div className="login-art">
        <div className="art-copy">
          <div className="brand light"><span className="brand-mark">P</span><span>Project Stack</span></div>
          <h1>Make progress<br /><em>visible.</em></h1>
          <p>A multi-tenant project management workspace with permission-based access control.</p>
        </div>
        <div className="art-lines" />
      </div>
      <div className="login-panel">
        <LoginForm {...{ onLogin, onRegister, error, setError }} />
      </div>
    </main>
  );
}
