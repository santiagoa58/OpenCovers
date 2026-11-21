import { useState } from "react";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithApp } from "@/test/mock-api";
import { useUiStore } from "@/stores/ui-store";
import { TimeField } from "./time-field";

function Clock({ initial = "17:30" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TimeField label="Time" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe("TimeField", () => {
  afterEach(() => useUiStore.setState({ locale: "en", timeFormat: "24h" }));

  it("uses an AM/PM control and preserves canonical HH:mm on edit", () => {
    useUiStore.setState({ locale: "en", timeFormat: "12h" });
    renderWithApp(<Clock />);
    expect(screen.getByRole("combobox", { name: "Time hour" })).toHaveValue("5");
    expect(screen.getByRole("combobox", { name: "Time minute" })).toHaveValue("30");
    expect(screen.getByRole("combobox", { name: "Time AM or PM" })).toHaveValue("PM");

    fireEvent.change(screen.getByRole("combobox", { name: "Time hour" }), { target: { value: "6" } });
    expect(screen.getByTestId("value")).toHaveTextContent("18:30");
    fireEvent.change(screen.getByRole("combobox", { name: "Time AM or PM" }), { target: { value: "AM" } });
    expect(screen.getByTestId("value")).toHaveTextContent("06:30");
  });

  it("represents midnight and noon correctly", () => {
    useUiStore.setState({ locale: "en", timeFormat: "12h" });
    function MidnightNoon() {
      const [value, setValue] = useState("00:15");
      return <><TimeField label="Time" value={value} onChange={setValue} /><button onClick={() => setValue("12:15")}>Set noon</button></>;
    }
    renderWithApp(<MidnightNoon />);
    expect(screen.getByRole("combobox", { name: "Time hour" })).toHaveValue("12");
    expect(screen.getByRole("combobox", { name: "Time AM or PM" })).toHaveValue("AM");
    fireEvent.click(screen.getByRole("button", { name: "Set noon" }));
    expect(screen.getByRole("combobox", { name: "Time hour" })).toHaveValue("12");
    expect(screen.getByRole("combobox", { name: "Time AM or PM" })).toHaveValue("PM");
  });

  it("always renders a 24-hour selector in 24h mode", () => {
    useUiStore.setState({ locale: "en", timeFormat: "24h" });
    renderWithApp(<Clock />);
    expect(screen.getByRole("combobox", { name: "Time hour" })).toHaveValue("17");
    expect(screen.queryByRole("combobox", { name: "Time AM or PM" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Time minute" }), { target: { value: "45" } });
    expect(screen.getByTestId("value")).toHaveTextContent("17:45");
  });

  it("responds immediately when the user changes their display preference", () => {
    useUiStore.setState({ locale: "en", timeFormat: "24h" });
    renderWithApp(<Clock />);
    act(() => useUiStore.setState({ timeFormat: "12h" }));
    expect(screen.getByRole("combobox", { name: "Time hour" })).toHaveValue("5");
    expect(screen.getByRole("combobox", { name: "Time AM or PM" })).toHaveValue("PM");
    expect(screen.getByTestId("value")).toHaveTextContent("17:30");
  });
});
