import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { Signin } from "./Signin";
import { login } from "../services/api";

jest.mock("../services/api");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockedLogin = login as jest.MockedFunction<typeof login>;

const renderSignin = () =>
  render(
    <MemoryRouter>
      <Signin />
    </MemoryRouter>
  );

const fillAndSubmit = async (email: string, password: string) => {
  await userEvent.type(screen.getByPlaceholderText("Email"), email);
  await userEvent.type(screen.getByPlaceholderText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: /Login/ }));
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Signin page", () => {
  it("blocks submission until the form validates", async () => {
    renderSignin();

    await userEvent.click(screen.getByRole("button", { name: /Login/ }));

    await waitFor(() =>
      expect(screen.getByLabelText("Please enter your email")).toBeInTheDocument()
    );
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than eight characters", async () => {
    renderSignin();

    await fillAndSubmit("test@example.com", "short");

    await waitFor(() =>
      expect(
        screen.getByLabelText("Password must be at least 8 characters")
      ).toBeInTheDocument()
    );
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("stores the token and redirects on success", async () => {
    mockedLogin.mockResolvedValue("tok-123");
    renderSignin();

    await fillAndSubmit("test@example.com", "password123");

    await waitFor(() => expect(localStorage.getItem("userToken")).toBe("tok-123"));
    expect(mockedLogin).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/movies");
  });

  it("shows the failure message and does not navigate", async () => {
    mockedLogin.mockRejectedValue(new Error("Invalid email or password"));
    renderSignin();

    await fillAndSubmit("test@example.com", "password123");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password")
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem("userToken")).toBeNull();
  });

  it("clears a stale error when the next attempt succeeds", async () => {
    mockedLogin.mockRejectedValueOnce(new Error("Invalid email or password"));
    renderSignin();

    await fillAndSubmit("test@example.com", "password123");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    mockedLogin.mockResolvedValueOnce("tok-123");
    await userEvent.click(screen.getByRole("button", { name: /Login/ }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
