import { useState } from "react";
import { login, setToken } from "../../api";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("leo@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      setToken(res.token);
      localStorage.setItem("nextops_user", JSON.stringify(res.user));
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">NextOps</h1>
        <p className="login-subtitle">智能运维控制台</p>

        {error && <div className="login-error">{error}</div>}

        <label className="login-label">
          邮箱
          <input
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="login-label">
          密码
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>

        <p className="login-hint">演示账号: leo@example.com / admin123</p>
      </form>
    </div>
  );
}
