import { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import "./auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginModal() {
  const { isLoginOpen, closeLogin, openRegister, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoginOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) {
        closeLogin();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isLoginOpen, isSubmitting, closeLogin]);

  if (!isLoginOpen) return null;

  const emailError = !email.trim()
    ? "Email is required"
    : !EMAIL_PATTERN.test(email.trim())
      ? "Enter a valid email address"
      : "";

  const passwordError = !password ? "Password is required" : "";

  const emailMessage = fieldErrors.email || (touched.email ? emailError : "");

  const passwordMessage =
    fieldErrors.password || (touched.password ? passwordError : "");

  function resetForm() {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setTouched({});
    setFieldErrors({});
    setServerError("");
  }

  function dismiss() {
    if (isSubmitting) return;

    resetForm();
    closeLogin();
  }

  function switchToRegister() {
    if (isSubmitting) return;

    resetForm();
    openRegister();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setTouched({
      email: true,
      password: true,
    });

    setFieldErrors({});
    setServerError("");

    if (emailError || passwordError) return;

    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      resetForm();
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 422 && data?.errors) {
        const errors = {};

        Object.entries(data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages)
            ? messages[0]
            : String(messages);
        });

        setFieldErrors(errors);
      } else if (status === 401) {
        setServerError("Incorrect email or password.");
      } else {
        setServerError(
          data?.message ||
            error.message ||
            "Something went wrong. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="auth-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismiss();
        }
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button
          type="button"
          className="auth-close"
          onClick={dismiss}
          disabled={isSubmitting}
          aria-label="Close login"
        >
          <X size={21} />
        </button>

        <div className="auth-heading">
          <h2 id="login-title">Welcome back</h2>
          <p>Log in to your Kino XII account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>

            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              disabled={isSubmitting}
              className={
                emailMessage ? "invalid" : touched.email ? "valid" : ""
              }
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  email: "",
                }));
                setServerError("");
              }}
              onBlur={() =>
                setTouched((current) => ({
                  ...current,
                  email: true,
                }))
              }
              aria-invalid={Boolean(emailMessage)}
            />

            {emailMessage && (
              <span className="auth-field-error">{emailMessage}</span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>

            <div className="auth-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                disabled={isSubmitting}
                className={
                  passwordMessage ? "invalid" : touched.password ? "valid" : ""
                }
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({
                    ...current,
                    password: "",
                  }));
                  setServerError("");
                }}
                onBlur={() =>
                  setTouched((current) => ({
                    ...current,
                    password: true,
                  }))
                }
                aria-invalid={Boolean(passwordMessage)}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {passwordMessage && (
              <span className="auth-field-error">{passwordMessage}</span>
            )}
          </div>

          {serverError && (
            <p className="auth-server-error" role="alert">
              {serverError}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <button
            type="button"
            className="auth-switch-link"
            onClick={switchToRegister}
            disabled={isSubmitting}
          >
            Sign up
          </button>
        </p>
      </section>
    </div>
  );
}
