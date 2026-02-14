import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const result = await login(username.trim(), password);
    if (!result.success) {
      setError(result.message || 'Falha no login.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="https://i.imgur.com/k7G7ZwP.png" alt="Davarium" style={{ height: 48 }} />
          </div>
          <h1>Admin Dashboard</h1>
          <p>Faça login para aceder ao painel de administração</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Nome de utilizador</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Palavra-passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-login" disabled={isSubmitting}>
            {isSubmitting ? 'A iniciar sessão...' : 'Iniciar sessão'}
          </button>
        </form>

        <div className="login-footer">
          <p>Davarium Admin &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
