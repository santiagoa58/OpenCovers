import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithApp } from "@/test/mock-api";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";

describe("form field primitives", () => {
  it("composes an associated label, control and help text", () => {
    renderWithApp(
      <Field>
        <FieldLabel htmlFor="guest">Guest name</FieldLabel>
        <Input id="guest" aria-describedby="guest-help" />
        <FieldDescription id="guest-help">Displayed on the reservation.</FieldDescription>
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Guest name" })).toHaveAttribute("aria-describedby", "guest-help");
    expect(screen.getByText("Displayed on the reservation.")).toBeInTheDocument();
  });

  it("only renders errors when there is one", () => {
    const { rerender } = renderWithApp(<FieldError />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<FieldError>Enter a guest name.</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a guest name.");
  });
});
