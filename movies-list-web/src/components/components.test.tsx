import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Form, Formik } from "formik";
import * as Yup from "yup";

import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";
import { MovieCard } from "./MovieCard";
import { ImageDisplay } from "./ImageDisplay";

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "type",
      "button"
    );
  });

  it("lets the caller opt into a submit button", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "submit"
    );
  });

  it("applies the secondary variant classes and merges custom ones", () => {
    render(
      <Button variant="secondary" className="w-full">
        Cancel
      </Button>
    );
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button).toHaveClass("border");
    expect(button).toHaveClass("w-full");
  });

  it("forwards click handlers", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Go" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Checkbox", () => {
  it("associates the label with the input so clicking the text toggles it", async () => {
    render(<Checkbox name="remember" label="Remember me" />);

    const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
    expect(checkbox).not.toBeChecked();

    await userEvent.click(screen.getByText("Remember me"));

    expect(checkbox).toBeChecked();
  });

  it("honours an explicitly supplied id", () => {
    render(<Checkbox id="custom-id" name="remember" label="Remember me" />);
    expect(screen.getByRole("checkbox", { name: "Remember me" })).toHaveAttribute(
      "id",
      "custom-id"
    );
  });
});

const renderInput = (props: { name: string; type?: string }, schema?: any) =>
  render(
    <Formik
      initialValues={{ [props.name]: "" }}
      onSubmit={jest.fn()}
      validationSchema={schema}
    >
      <Form>
        <Input placeholder={props.name} {...props} />
        <button type="submit">Submit</button>
      </Form>
    </Formik>
  );

describe("Input", () => {
  it("writes typed values back into the formik state", async () => {
    renderInput({ name: "title" });

    const input = screen.getByPlaceholderText("title");
    await userEvent.type(input, "Arrival");

    expect(input).toHaveValue("Arrival");
  });

  it("renders the validation message with an alert role", async () => {
    const schema = Yup.object().shape({
      title: Yup.string().required("Please enter movie title"),
    });
    renderInput({ name: "title" }, schema);

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Please enter movie title")
    );
  });

  it("marks the field with the error border once touched and invalid", async () => {
    const schema = Yup.object().shape({
      title: Yup.string().required("Please enter movie title"),
    });
    renderInput({ name: "title" }, schema);

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("title")).toHaveClass("border-error")
    );
  });
});

describe("MovieCard", () => {
  it("shows the title and year and names the poster in its alt text", () => {
    render(
      <MovieCard
        title="Arrival"
        year={2016}
        image="blob:poster"
        onEditClick={jest.fn()}
      />
    );

    expect(screen.getByText("Arrival")).toBeInTheDocument();
    expect(screen.getByText("2016")).toBeInTheDocument();
    expect(screen.getByAltText("Arrival poster")).toHaveAttribute(
      "src",
      "blob:poster"
    );
  });

  it("falls back to a placeholder when the movie has no poster", () => {
    render(
      <MovieCard title="Arrival" year={2016} image={null} onEditClick={jest.fn()} />
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("No poster")).toBeInTheDocument();
  });

  it("renders at most three tags", () => {
    render(
      <MovieCard
        title="Arrival"
        year={2016}
        image={null}
        tags={["sci-fi", "drama", "aliens", "2016"]}
        onEditClick={jest.fn()}
      />
    );

    expect(screen.getByText("sci-fi")).toBeInTheDocument();
    expect(screen.getByText("aliens")).toBeInTheDocument();
    expect(screen.queryByText("2016", { selector: "li" })).not.toBeInTheDocument();
  });

  it("invokes the edit callback when clicked", async () => {
    const onEditClick = jest.fn();
    render(
      <MovieCard title="Arrival" year="2016" image={null} onEditClick={onEditClick} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit Arrival" }));

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it("only offers a delete control when a handler is supplied", async () => {
    const onDeleteClick = jest.fn();
    const { rerender } = render(
      <MovieCard title="Arrival" year={2016} image={null} onEditClick={jest.fn()} />
    );

    expect(
      screen.queryByRole("button", { name: "Delete Arrival" })
    ).not.toBeInTheDocument();

    rerender(
      <MovieCard
        title="Arrival"
        year={2016}
        image={null}
        onEditClick={jest.fn()}
        onDeleteClick={onDeleteClick}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete Arrival" }));

    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });
});

describe("ImageDisplay", () => {
  it("renders nothing when there is no file yet", () => {
    const { container } = render(<ImageDisplay removeFile={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the image carries a null file", () => {
    const { container } = render(
      <ImageDisplay removeFile={jest.fn()} image={{ name: "x", type: "", file: null }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("previews the uploaded file and can remove it", async () => {
    const removeFile = jest.fn();
    const file = new File(["bytes"], "poster.jpg", { type: "image/jpeg" });

    render(
      <ImageDisplay
        removeFile={removeFile}
        image={{ name: file.name, type: file.type, file }}
      />
    );

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);

    await userEvent.click(screen.getByRole("button"));

    expect(removeFile).toHaveBeenCalledTimes(1);
  });
});
