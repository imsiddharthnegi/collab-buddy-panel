import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? "signup" : "login",
    returnTo: typeof s.returnTo === "string" ? s.returnTo : undefined,
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Tasklist" },
      {
        name: "description",
        content: "Sign in or create an account for your collaborative to-do app.",
      },
    ],
  }),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const signupSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Enter your name").max(80),
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const isSignup = search.mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const returnTo = search.returnTo;

  // Redirect away if already signed in
  useEffect(() => {
    const redirectPath = returnTo ?? "/";
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (returnTo) {
          window.location.href = returnTo;
        } else {
          navigate({ to: "/" });
        }
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (returnTo) {
          window.location.href = returnTo;
        } else {
          navigate({ to: "/" });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, returnTo]);

  const toggleMode = () => {
    navigate({
      to: "/auth",
      search: { mode: isSignup ? "login" : "signup" },
      replace: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        const parsed = signupSchema.safeParse({ name, email, password });
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name: parsed.data.name },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Account created. Check your email to confirm.");
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (returnTo) {
          window.location.href = returnTo;
        } else {
          navigate({ to: "/" });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Could not sign in with Google");
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 space-y-2">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Tasklist
          </p>
          <h1 className="auth-headline text-3xl font-semibold tracking-tight sm:text-4xl">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignup
              ? "Start organizing your day with your team."
              : "Sign in to pick up where you left off."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              isSignup
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 pb-1">
                <Label htmlFor="name" className="text-sm text-foreground/80">
                  Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="auth-input"
                  maxLength={80}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-foreground/80">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="auth-input"
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-foreground/80">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="auth-input"
              maxLength={72}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="auth-primary h-12 w-full text-base"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSignup ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="auth-secondary h-12 w-full gap-3 text-base"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </Button>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-foreground underline-offset-4 transition hover:underline"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
