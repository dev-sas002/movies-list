import { useState } from "react";
import { Button } from "components/Button";
import { Input } from "components/Input";
import { ROUTES } from "constants/routes";
import { Form, Formik } from "formik";
import { signinSchema } from "schemas/signinSchema";
import { useNavigate } from "react-router-dom";
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
    <div className="flex flex-col items-center justify-center w-full">
      <Formik
        initialValues={{ email: "", password: "" }}
        onSubmit={handleLogin}
        validationSchema={signinSchema}
      >
        {({ isSubmitting }) => (
          <Form className="flex flex-col gap-4 items-center justify-center h-[100vh] md:w-1/5">
            <h1 className="mb-6 text-6xl text-white">Sign in</h1>
            <Input name="email" type="email" label="Email" autoComplete="email" />
            <Input
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
            />
            {error && (
              <div className="text-error" role="alert">
                {error}
              </div>
            )}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Login"}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
};
