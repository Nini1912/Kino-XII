import { useEffect, useRef, useState } from "react";
import { Upload, Eye, EyeOff, X } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import "./auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialValues = {
  username: "",
  email: "",
  password: "",
  password_confirmation: "",
};

export default function RegisterModal() {
  const { isRegisterOpen, closeRegister, openLogin, register } = useAuth();

  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const fileInputRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!avatar) return;

    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  useEffect(() => {
    if (!isRegisterOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape" && !submittingRef.current) {
        closeRegister();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isRegisterOpen, closeRegister]);

  if (!isRegisterOpen) return null;

  const errors = {
    username: !values.username.trim() ? "Username is required" : "",
    email: !values.email.trim()
      ? "Email is required"
      : !EMAIL_PATTERN.test(values.email.trim())
        ? "Enter a valid email address"
        : "",
    password: !values.password
      ? "Password is required"
      : values.password.length < 8
        ? "Password must contain at least 8 characters"
        : "",
    password_confirmation: !values.password_confirmation
      ? "Confirm your password"
      : values.password_confirmation !== values.password
        ? "Passwords do not match"
        : "",
  };

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setServerError("");
  }

  function getFieldError(field) {
    return fieldErrors[field] || (touched[field] ? errors[field] : "");
  }

  function resetForm() {
    setValues(initialValues);
    setTouched({});
    setFieldErrors({});
    setServerError("");
    setAvatar(null);
    setAvatarPreview(null);
    setShowPassword(false);
    setShowConfirmation(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function dismiss() {
    if (submittingRef.current) return;

    resetForm();
    closeRegister();
  }

  function switchToLogin() {
    if (submittingRef.current) return;

    resetForm();
    openLogin();
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setServerError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setServerError("Avatar must be smaller than 5 MB.");
      return;
    }

    setAvatar(file);
    setServerError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) return;

    setTouched({
      username: true,
      email: true,
      password: true,
      password_confirmation: true,
    });

    setFieldErrors({});
    setServerError("");

    if (Object.values(errors).some(Boolean)) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
        password_confirmation: values.password_confirmation,
        avatar,
      };

      await register(payload);
      resetForm();
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 422 && data?.errors) {
        const mappedErrors = {};

        Object.entries(data.errors).forEach(([field, messages]) => {
          mappedErrors[field] = Array.isArray(messages)
            ? messages[0]
            : String(messages);
        });

        setFieldErrors(mappedErrors);
      } else if (status === 409) {
        setServerError(
          data?.message || "An account with these details already exists.",
        );
      } else {
        setServerError(
          data?.message ||
            error.message ||
            "Registration failed. Please try again.",
        );
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function renderField({
    field,
    label,
    type = "text",
    placeholder,
    autoComplete,
    visible,
    toggleVisibility,
  }) {
    const message = getFieldError(field);

    const inputType = toggleVisibility ? (visible ? "text" : "password") : type;

    return (
      <div className="auth-field" key={field}>
        <label htmlFor={`register-${field}`}>{label}</label>

        <div className={toggleVisibility ? "auth-password-wrap" : undefined}>
          <input
            id={`register-${field}`}
            type={inputType}
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={values[field]}
            disabled={isSubmitting}
            className={
              message
                ? "invalid"
                : touched[field] && !errors[field]
                  ? "valid"
                  : ""
            }
            onChange={(event) => updateField(field, event.target.value)}
            onBlur={() =>
              setTouched((current) => ({
                ...current,
                [field]: true,
              }))
            }
            aria-invalid={Boolean(message)}
          />

          {toggleVisibility && (
            <button
              type="button"
              className="auth-password-toggle"
              onClick={toggleVisibility}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          )}
        </div>

        {message && <span className="auth-field-error">{message}</span>}
      </div>
    );
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
        className="auth-modal register-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
      >
        <button
          type="button"
          className="auth-close"
          onClick={dismiss}
          disabled={isSubmitting}
          aria-label="Close registration"
        >
          <X size={21} />
        </button>

        <div className="auth-heading">
          <h2 id="register-title">Sign up</h2>
          <p>Welcome to Kino XII</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="register-avatar-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              hidden
              onChange={handleAvatarChange}
              disabled={isSubmitting}
              aria-label="Upload avatar"
            />

            <button
              type="button"
              className="register-avatar-trigger"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <span className="register-avatar-icon">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" />
                ) : (
                  <Upload size={17} strokeWidth={1.5} />
                )}
              </span>

              <span className="register-avatar-copy">
                <strong>
                  {avatar ? avatar.name : "Upload avatar (optional)"}
                </strong>
                <small>JPG, PNG or WEBP</small>
              </span>
            </button>
          </div>

          {renderField({
            field: "username",
            label: "Username",
            placeholder: "User",
            autoComplete: "username",
          })}

          {renderField({
            field: "email",
            label: "Email",
            type: "email",
            placeholder: "example@gmail.com",
            autoComplete: "email",
          })}

          <div className="register-password-row">
            {renderField({
              field: "password",
              label: "password",
              placeholder: "••••••••",
              autoComplete: "new-password",
              visible: showPassword,
              toggleVisibility: () => setShowPassword((value) => !value),
            })}

            {renderField({
              field: "password_confirmation",
              label: "Confirm password",
              placeholder: "••••••••",
              autoComplete: "new-password",
              visible: showConfirmation,
              toggleVisibility: () => setShowConfirmation((value) => !value),
            })}
          </div>

          {serverError && (
            <p className="auth-server-error" role="alert">
              {serverError}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing up..." : "Sign up"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button
            type="button"
            className="auth-switch-link"
            onClick={switchToLogin}
            disabled={isSubmitting}
          >
            Log in
          </button>
        </p>
      </section>
    </div>
  );
}
