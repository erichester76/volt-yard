"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { CartIcon, MoonIcon, SunIcon, UserIcon } from "./icons";

type Account = { email: string; isAdmin: boolean } | null;
type AuthMode = "sign-in" | "sign-up" | "reset" | "new-password" | "magic-link";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
    const savedTheme = window.localStorage.getItem("volt-yard-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(savedTheme ? savedTheme === "dark" : prefersDark);
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
    async function loadAccount() {
      const { data } = await db.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setAccount(null);
        setCartCount(0);
        return;
      }
      const [{ data: profile }, { data: cart }] = await Promise.all([
        db.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle(),
        db.from("carts").select("cart_items(quantity)").eq("user_id", data.user.id).eq("status", "active").maybeSingle(),
      ]);
      if (!active) return;
      setAccount({ email: data.user.email ?? "Account", isAdmin: profile?.is_admin === true });
      setCartCount((cart?.cart_items ?? []).reduce((total, item) => total + item.quantity, 0));
    }
    void loadAccount();
    const { data: listener } = db.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("new-password");
        setMessageTone("success");
        setMessage("Choose a new password for your account.");
        setSignInOpen(true);
      }
      void loadAccount();
    });
    const openRequestedAuth = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: AuthMode }>).detail?.mode ?? "sign-in";
      setAuthMode(mode);
      setMessage("");
      setMessageTone("error");
      setPassword("");
      setConfirmPassword("");
      setSignInOpen(true);
    };
    window.addEventListener("volt-yard-open-auth", openRequestedAuth);
    window.addEventListener("volt-yard-cart-updated", loadAccount);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("volt-yard-open-auth", openRequestedAuth);
      window.removeEventListener("volt-yard-cart-updated", loadAccount);
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
    const redirectTo = `${window.location.origin}${pathname}`;
    let error: { message: string } | null = null;
    let successMessage = "";

    if (authMode === "sign-in") {
      ({ error } = await auth.signInWithPassword({ email, password }));
      successMessage = "Signed in successfully.";
    } else if (authMode === "sign-up") {
      ({ error } = await auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }));
      successMessage = "Account created. Check your email to confirm your address.";
    } else if (authMode === "reset") {
      ({ error } = await auth.resetPasswordForEmail(email, { redirectTo }));
      successMessage = "Check your email for a password reset link.";
    } else if (authMode === "new-password") {
      ({ error } = await auth.updateUser({ password }));
      successMessage = "Your password has been updated.";
    } else {
      ({ error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }));
      successMessage = "Check your email for a secure sign-in link.";
    }

    setSubmitting(false);
    if (error) {
      setMessageTone("error");
      return setMessage(error.message);
    }
    setMessageTone("success");
    setMessage(successMessage);
    if (authMode === "sign-in" || authMode === "new-password") setSignInOpen(false);
  }

  async function signOut() {
    if (isSupabaseConfigured) await createBrowserSupabaseClient().auth.signOut();
    setAccountOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="wrap site-nav">
          <Link className="brand" href="/" onClick={() => setMenuOpen(false)}><span className="mark">V</span> volt yard</Link>
          <nav className={menuOpen ? "consumer-nav is-open" : "consumer-nav"} aria-label="Primary navigation">
            <Link href="/issues" onClick={() => setMenuOpen(false)}>Diagnose</Link>
            <Link href="/#results" onClick={() => setMenuOpen(false)}>Shops</Link>
            <Link href="/catalog" onClick={() => setMenuOpen(false)}>Services &amp; upgrades</Link>
            <Link href="/community" onClick={() => setMenuOpen(false)}>Community</Link>
          </nav>
          <div className="site-actions">
            <button className="icon-button" type="button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Use light mode" : "Use dark mode"}>{dark ? <SunIcon /> : <MoonIcon />}</button>
            <Link className="cart-link" href="/cart" aria-label={`Cart and orders, ${cartCount} items`}><CartIcon /><span className="action-label">Cart</span>{cartCount > 0 && <span className="cart-count">{cartCount}</span>}</Link>
            {account ? (
              <div className="account-control">
                <button className="account-button" type="button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}><UserIcon /><span className="action-label">Profile</span></button>
                {accountOpen && <div className="account-menu">
                  <p>{account.email}</p>
                   <Link href="/profile" onClick={() => setAccountOpen(false)}>My profile</Link>
                   <Link href="/membership" onClick={() => setAccountOpen(false)}>Membership</Link>
                    <Link href="/portal" onClick={() => setAccountOpen(false)}>Partner portal</Link>
                    <Link href="/installer/work" onClick={() => setAccountOpen(false)}>Mechanic work queue</Link>
                    <Link href="/expert-work" onClick={() => setAccountOpen(false)}>Expert jobs</Link>
                   {account.isAdmin && <Link href="/admin" onClick={() => setAccountOpen(false)}>Administration</Link>}
                  <button type="button" onClick={signOut}>Log out</button>
                </div>}
              </div>
            ) : <button className="sign-in-button" type="button" onClick={() => openAuth()}><UserIcon /><span className="action-label">Sign in</span></button>}
            <button className="menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation" aria-expanded={menuOpen}>Menu</button>
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="wrap footer-content">
          <div><Link className="brand" href="/"><span className="mark">V</span> volt yard</Link><p>Independent EV service, connected.</p></div>
            <nav aria-label="Footer navigation"><Link href="/issues">Diagnose</Link><Link href="/membership">Membership</Link><Link href="/community">Community</Link><Link href="/catalog">Services &amp; upgrades</Link><a href="mailto:hello@voltyard.com">Contact</a></nav>
        </div>
      </footer>
      {signInOpen && <div className="sign-in-backdrop" role="presentation" onClick={closeAuth}><form className="sign-in-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onSubmit={authenticate} onClick={(event) => event.stopPropagation()}><button className="close" type="button" onClick={closeAuth} aria-label="Close sign in" disabled={submitting}>×</button><p className="eyebrow">Customer, mechanic, or administrator</p><h2 id="auth-title">{authMode === "sign-up" ? "Create your account." : authMode === "reset" ? "Reset your password." : authMode === "new-password" ? "Set a new password." : authMode === "magic-link" ? "Email sign-in link." : "Sign in to Volt Yard."}</h2><p>{authMode === "sign-up" ? "Use an email and password to create your account." : authMode === "reset" ? "Enter your email and we will send a reset link." : authMode === "new-password" ? "Enter and confirm a new password." : authMode === "magic-link" ? "Prefer passwordless sign-in? We will send a secure link." : "Sign in with your email and password."}</p>{authMode !== "new-password" && <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={submitting} /></label>}{(authMode === "sign-in" || authMode === "sign-up" || authMode === "new-password") && <label>Password<input required type="password" minLength={6} autoComplete={authMode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} /></label>}{(authMode === "sign-up" || authMode === "new-password") && <label>Confirm password<input required type="password" minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={submitting} /></label>}{message && <p className={messageTone === "success" ? "form-message auth-success" : "form-message"} role={messageTone === "error" ? "alert" : "status"}>{message}</p>}<button type="submit" disabled={submitting}>{submitting ? "Please wait..." : authMode === "sign-up" ? "Create account" : authMode === "reset" ? "Send reset link" : authMode === "new-password" ? "Update password" : authMode === "magic-link" ? "Send sign-in link" : "Sign in"}</button>{authMode === "sign-in" && <div className="auth-links"><button type="button" onClick={() => switchAuthMode("reset")} disabled={submitting}>Forgot password?</button><button type="button" onClick={() => switchAuthMode("magic-link")} disabled={submitting}>Use a magic link instead</button><button type="button" onClick={() => switchAuthMode("sign-up")} disabled={submitting}>Create an account</button></div>}{authMode === "sign-up" && <div className="auth-links"><button type="button" onClick={() => switchAuthMode("sign-in")} disabled={submitting}>Already have an account? Sign in</button><button type="button" onClick={() => switchAuthMode("magic-link")} disabled={submitting}>Use a magic link instead</button></div>}{(authMode === "reset" || authMode === "magic-link") && <div className="auth-links"><button type="button" onClick={() => switchAuthMode("sign-in")} disabled={submitting}>Back to password sign in</button><button type="button" onClick={() => switchAuthMode("sign-up")} disabled={submitting}>Create an account</button></div>}</form></div>}
    </div>
  );
}
