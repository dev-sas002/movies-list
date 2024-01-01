import { useState } from "react";
import { Form, Formik } from "formik";
import { useNavigate } from "react-router-dom";
import { Button } from "components/Button";
import { Input } from "components/Input";
import { ROUTES } from "constants/routes";
import { signinSchema } from "schemas/signinSchema";
import { login } from "services/api";
import { setToken } from "services/session";

export const Signin = (): JSX.Element => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (values: { email: string; password: string }) => {
    // Clear the previous failure so a retry does not show a stale message.
    setError(null);

    try {
      setToken(await login(values));
      navigate(ROUTES.movies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Movies List
        </p>
        <h1 className="text-5xl font-semibold text-paper">Sign in</h1>
        <p className="mb-8 mt-3 text-paper/70">
          Your film collection, searchable by whatever you remember about it.
        </p>
        <Formik
          initialValues={{ email: "", password: "" }}
          onSubmit={handleLogin}
          validationSchema={signinSchema}
        >
          {({ isSubmitting }) => (
            <Form className="flex flex-col gap-5" noValidate>
              <Input name="email" type="email" label="Email" autoComplete="email" />
              <Input
                name="password"
                type="password"
                label="Password"
                autoComplete="current-password"
              />
              {error && (
                <div
                  className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <Button className="mt-2 w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Log in"}
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </main>
  );
};
