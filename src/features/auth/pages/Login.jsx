import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/login";
import "../../../styles/login.css";
import logo from "../../../assets/logo.jpeg";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: login,

    /*onSuccess: (data) => {
       console.log("Login Success", data);
     },  */

    /*onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    }, */

    onSuccess: (data) => {

      localStorage.setItem("access_token", data.access_token);

      localStorage.setItem("refresh_token", data.refresh_token);

      localStorage.setItem("user", JSON.stringify(data.user));

      const role = data.user.role;

      if (role === "ADMIN") {
        navigate("/admin-dashboard");
      }
      else if (role === "OWNER") {
        navigate("/owner-dashboard");
      }
    },

    onError: (error) => {
      console.log("Login Failed", error.response.data);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    mutation.mutate({
      email,
      password,
    });
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>

        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <img src={logo} alt="7waleek" />
          </div>
          <div className="login-brand-divider" />
          <div>
            {/*  <div className="login-brand-name">7waleek</div> */}
            <div className="login-brand-tag">Management Console</div>
          </div>
        </div>

        {/* Header */}
        <div className="login-header">
          <h2>Sign in to your account</h2>
          <p className="login-subtitle">Enter your credentials to access the dashboard.</p>
        </div>

        {/* Error message */}
        {mutation.isError && (
          <div className="login-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Invalid email or password. Please try again.
          </div>
        )}

        {/* Email field */}
        <div className="field-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="email">Email address</label>
          </div>
          <input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        {/* Password field */}
        <div className="field-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="password">Password</label>
            <span
              className="field-label-link"
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            >
              {showPassword ? "Hide password" : "Show password"}
            </span>
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {/* Remember me */}
        <div className="login-remember">
          <input type="checkbox" id="remember" />
          <label htmlFor="remember">Keep me signed in for 30 days</label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </button>

        {/* Footer links */}
        <div className="login-footer-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Use</a>
          <a href="/support">Support</a>
        </div>

        {/* Secured */}
        <div className="login-secured">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Secured with SSL encryption</span>
        </div>

      </form>
    </div>
  );
}