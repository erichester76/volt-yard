"use client";

import Link from "@/app/locale-link";
import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { authRedirectUrl } from "@/lib/auth-redirect";
import { CartIcon, MoonIcon, SunIcon, UserIcon } from "./icons";
import { localePath, localePathname } from "@/lib/i18n";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";

type Account = { email: string; isAdmin: boolean } | null;
type AuthMode = "sign-in" | "sign-up" | "reset" | "new-password" | "magic-link";
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
const buildCommit = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useLocalizedContent(locale);
  const localHref = (path: string) => path;
  const switchLocale = (nextLocale: typeof locale) => {
    document.cookie = `volt-yard-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const path = localePathname(pathname);
    window.location.assign(localePath(nextLocale, path));
  };
  const [account, setAccount] = useState<Account>(null);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [submitting, setSubmitting] = useState(false);
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.localStorage.setItem("volt-yard-theme", dark ? "dark" : "light");
  }, [dark, themeReady]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    let active = true;
    let requestVersion = 0;
    async function loadAccount(user?: User | null) {
      const version = ++requestVersion;
      const currentUser =
        user === undefined ? (await db.auth.getUser()).data.user : user;
      if (!active || version !== requestVersion) return;
      if (!currentUser) {
        setAccount(null);
        setCartCount(0);
        return;
      }
      const [{ data: profile }, { data: cart }] = await Promise.all([
        db
          .from("profiles")
          .select("is_admin")
          .eq("id", currentUser.id)
          .maybeSingle(),
        db
          .from("carts")
          .select("cart_items(quantity)")
          .eq("user_id", currentUser.id)
          .eq("status", "active")
          .maybeSingle(),
      ]);
      if (!active || version !== requestVersion) return;
      setAccount({
        email: currentUser.email ?? "Account",
        isAdmin: profile?.is_admin === true,
      });
      setCartCount(
        (cart?.cart_items ?? []).reduce(
          (total, item) => total + item.quantity,
          0,
        ),
      );
    }
    void loadAccount();
    const { data: listener } = db.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("new-password");
        setMessageTone("success");
        setMessage("Choose a new password for your account.");
        setSignInOpen(true);
      }
      void loadAccount(session?.user ?? null);
    });
    const openRequestedAuth = (event: Event) => {
      const mode =
        (event as CustomEvent<{ mode?: AuthMode }>).detail?.mode ?? "sign-in";
      setAuthMode(mode);
      setMessage("");
      setMessageTone("error");
      setPassword("");
      setConfirmPassword("");
      setSignInOpen(true);
    };
    window.addEventListener("volt-yard-open-auth", openRequestedAuth);
    const reloadAccount = () => {
      void loadAccount();
    };
    window.addEventListener("volt-yard-cart-updated", reloadAccount);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("volt-yard-open-auth", openRequestedAuth);
      window.removeEventListener("volt-yard-cart-updated", reloadAccount);
    };
  }, []);

  function openAuth(mode: AuthMode = "sign-in") {
    setAuthMode(mode);
    setMessage("");
    setMessageTone("error");
    setPassword("");
    setConfirmPassword("");
    setSignInOpen(true);
  }

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setMessage("");
    setMessageTone("error");
    setPassword("");
    setConfirmPassword("");
  }

  function closeAuth() {
    if (submitting) return;
    setSignInOpen(false);
    setMessage("");
    setMessageTone("error");
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setMessageTone("error");
      return setMessage("Sign-in is not configured.");
    }
    if (authMode === "new-password" && password !== confirmPassword) {
      setMessageTone("error");
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const auth = createBrowserSupabaseClient().auth;
    // Browser origin prevents a build-time local URL from being used in email links.
    const redirectTo = authRedirectUrl(window.location.origin, pathname);
    let error: { message: string } | null = null;
    let successMessage = "";

    if (authMode === "sign-in") {
      ({ error } = await auth.signInWithPassword({ email, password }));
      successMessage = "Signed in successfully.";
    } else if (authMode === "sign-up") {
      ({ error } = await auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      }));
      successMessage =
        "Account created. Check your email to confirm your address.";
    } else if (authMode === "reset") {
      ({ error } = await auth.resetPasswordForEmail(email, { redirectTo }));
      successMessage = "Check your email for a password reset link.";
    } else if (authMode === "new-password") {
      ({ error } = await auth.updateUser({ password }));
      successMessage = "Your password has been updated.";
    } else {
      ({ error } = await auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      }));
      successMessage = "Check your email for a secure sign-in link.";
    }

    setSubmitting(false);
    if (error) {
      setMessageTone("error");
      return setMessage(error.message);
    }
    setMessageTone("success");
    setMessage(successMessage);
    if (authMode === "sign-in" || authMode === "new-password")
      setSignInOpen(false);
  }

  async function signOut() {
    if (isSupabaseConfigured)
      await createBrowserSupabaseClient().auth.signOut();
    setAccountOpen(false);
    router.push(localHref("/"));
    router.refresh();
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="wrap site-nav">
          <Link
            className="brand"
            href={localHref("/")}
            onClick={() => setMenuOpen(false)}
            aria-label="Amped Up Network home"
          >
            <img
              className="brand-logo"
              src="/images/amped-up-electric-garage-logo.jpg"
              alt="Amped Up Electric Garage founding partner logo"
            />
            <span className="brand-copy">
              <strong>Amped Up Network</strong>
              <small>Independent EV ownership network</small>
            </span>
          </Link>
          <nav
            className={menuOpen ? "consumer-nav is-open" : "consumer-nav"}
            aria-label="Primary navigation"
          >
            <Link
              href={localHref("/issues")}
              onClick={() => setMenuOpen(false)}
            >
              {t("chrome.nav.diagnose", "Diagnose")}
            </Link>
            <Link
              href={localHref("/shops")}
              onClick={() => setMenuOpen(false)}
            >
              {t("chrome.nav.shops", "Shops")}
            </Link>
            <Link
              href={localHref("/services")}
              onClick={() => setMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              href={localHref("/upgrades")}
              onClick={() => setMenuOpen(false)}
            >
              Upgrades
            </Link>
            <Link
              href={localHref("/community")}
              onClick={() => setMenuOpen(false)}
            >
              {t("chrome.nav.community", "Community")}
            </Link>
          </nav>
          <div className="site-actions">
            <label className="locale-switcher">
              <span className="sr-only">Language</span>
              <select
                value={locale}
                onChange={(event) =>
                  switchLocale(event.target.value as typeof locale)
                }
                aria-label="Language"
              >
                <option value="en">EN</option>
                <option value="de">DE</option>
                <option value="fr">FR</option>
                <option value="es">ES</option>
              </select>
            </label>
            <button
              className="icon-button"
              type="button"
              onClick={() => setDark((value) => !value)}
              aria-label={dark ? "Use light mode" : "Use dark mode"}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link
              className="cart-link"
              href={localHref("/cart")}
              aria-label={`Cart and orders, ${cartCount} items`}
            >
              <CartIcon />
              <span className="action-label">
                {t("chrome.action.cart", "Cart")}
              </span>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
            {account ? (
              <div className="account-control">
                <button
                  className="account-button"
                  type="button"
                  onClick={() => setAccountOpen((value) => !value)}
                  aria-expanded={accountOpen}
                >
                  <UserIcon />
                  <span className="action-label">
                    {t("chrome.action.profile", "Profile")}
                  </span>
                </button>
                {accountOpen && (
                  <div className="account-menu">
                    <p>{account.email}</p>
                    <Link href="/profile" onClick={() => setAccountOpen(false)}>
                      My profile
                    </Link>
                    <Link
                      href="/membership"
                      onClick={() => setAccountOpen(false)}
                    >
                      Membership
                    </Link>
                    <Link href="/portal" onClick={() => setAccountOpen(false)}>
                      Partner portal
                    </Link>
                    <Link
                      href="/installer/work"
                      onClick={() => setAccountOpen(false)}
                    >
                      Mechanic work queue
                    </Link>
                    <Link
                      href="/expert-work"
                      onClick={() => setAccountOpen(false)}
                    >
                      Expert jobs
                    </Link>
                    {account.isAdmin && (
                      <Link href="/admin" onClick={() => setAccountOpen(false)}>
                        Administration
                      </Link>
                    )}
                    <button type="button" onClick={signOut}>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="sign-in-button"
                type="button"
                onClick={() => openAuth()}
              >
                <UserIcon />
                <span className="action-label">
                  {t("chrome.action.sign_in", "Sign in")}
                </span>
              </button>
            )}
            <button
              className="menu-button"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              {t("chrome.action.menu", "Menu")}
            </button>
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="wrap footer-content">
          <div>
            <Link
              className="brand"
              href={localHref("/")}
              aria-label="Amped Up Network home"
            >
              <img
                className="brand-logo"
                src="/images/amped-up-electric-garage-logo.jpg"
                alt="Amped Up Electric Garage founding partner logo"
              />
              <span className="brand-copy">
                <strong>Amped Up Network</strong>
                <small>Independent EV ownership network</small>
              </span>
            </Link>
            <p>
              {t(
                "chrome.footer.tagline",
                "Independent EV ownership, connected.",
              )}
            </p>
            <span
              className="version-crumb"
              aria-label={`Application version ${appVersion}, build ${buildCommit}`}
            >
              v{appVersion} / {buildCommit}
            </span>
          </div>
          <nav aria-label={t("chrome.footer.navigation", "Footer navigation")}>
            <Link href={localHref("/issues")}>
              {t("chrome.nav.diagnose", "Diagnose")}
            </Link>
            <Link href={localHref("/pricing")}>
              Pricing
            </Link>
            <Link href={localHref("/community")}>
              {t("chrome.nav.community", "Community")}
            </Link>
            <Link href={localHref("/services")}>
              Services
            </Link>
            <Link href={localHref("/upgrades")}>
              Upgrades
            </Link>
            <a href="mailto:hello@voltyard.com">
              {t("chrome.footer.contact", "Contact")}
            </a>
          </nav>
        </div>
      </footer>
      {signInOpen && (
        <div
          className="sign-in-backdrop"
          role="presentation"
          onClick={closeAuth}
        >
          <form
            className="sign-in-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onSubmit={authenticate}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              type="button"
              onClick={closeAuth}
              aria-label="Close sign in"
              disabled={submitting}
            >
              ×
            </button>
            <p className="eyebrow">Customer, mechanic, or administrator</p>
            <h2 id="auth-title">
              {authMode === "sign-up"
                ? "Create your account."
                : authMode === "reset"
                  ? "Reset your password."
                  : authMode === "new-password"
                    ? "Set a new password."
                    : authMode === "magic-link"
                      ? "Email sign-in link."
                : "Sign in to Amped Up Network."}
            </h2>
            <p>
              {authMode === "sign-up"
                ? "Use an email and password to create your account."
                : authMode === "reset"
                  ? "Enter your email and we will send a reset link."
                  : authMode === "new-password"
                    ? "Enter and confirm a new password."
                    : authMode === "magic-link"
                      ? "Prefer passwordless sign-in? We will send a secure link."
                      : "Sign in with your email and password."}
            </p>
            {authMode !== "new-password" && (
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={submitting}
                />
              </label>
            )}
            {(authMode === "sign-in" ||
              authMode === "sign-up" ||
              authMode === "new-password") && (
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete={
                    authMode === "sign-in" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />
              </label>
            )}
            {(authMode === "sign-up" || authMode === "new-password") && (
              <label>
                Confirm password
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={submitting}
                />
              </label>
            )}
            {message && (
              <p
                className={
                  messageTone === "success"
                    ? "form-message auth-success"
                    : "form-message"
                }
                role={messageTone === "error" ? "alert" : "status"}
              >
                {message}
              </p>
            )}
            <button type="submit" disabled={submitting}>
              {submitting
                ? "Please wait..."
                : authMode === "sign-up"
                  ? "Create account"
                  : authMode === "reset"
                    ? "Send reset link"
                    : authMode === "new-password"
                      ? "Update password"
                      : authMode === "magic-link"
                        ? "Send sign-in link"
                        : "Sign in"}
            </button>
            {authMode === "sign-in" && (
              <div className="auth-links">
                <button
                  type="button"
                  onClick={() => switchAuthMode("reset")}
                  disabled={submitting}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode("magic-link")}
                  disabled={submitting}
                >
                  Use a magic link instead
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode("sign-up")}
                  disabled={submitting}
                >
                  Create an account
                </button>
              </div>
            )}
            {authMode === "sign-up" && (
              <div className="auth-links">
                <button
                  type="button"
                  onClick={() => switchAuthMode("sign-in")}
                  disabled={submitting}
                >
                  Already have an account? Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode("magic-link")}
                  disabled={submitting}
                >
                  Use a magic link instead
                </button>
              </div>
            )}
            {(authMode === "reset" || authMode === "magic-link") && (
              <div className="auth-links">
                <button
                  type="button"
                  onClick={() => switchAuthMode("sign-in")}
                  disabled={submitting}
                >
                  Back to password sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode("sign-up")}
                  disabled={submitting}
                >
                  Create an account
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
