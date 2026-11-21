import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithApp } from "@/test/mock-api";
import { useUiStore } from "@/stores/ui-store";
import { useTimeDisplay } from "@/lib/time-format";
import { TimeFormatSettings } from "./time-format-settings";

function SampleClock() {
  const formatTime = useTimeDisplay();
  return <output data-testid="sample-time">{formatTime("16:45")}</output>;
}

describe("Time format preference", () => {
  afterEach(() => useUiStore.setState({ timeFormat: "24h", locale: "en" }));

  it("changes visible times immediately and keeps the preference in UI state", async () => {
    useUiStore.setState({ timeFormat: "24h", locale: "en" });
    const user = userEvent.setup();
    renderWithApp(<><TimeFormatSettings /><SampleClock /></>);
    expect(screen.getByTestId("sample-time")).toHaveTextContent("16:45");

    await user.click(screen.getByRole("combobox", { name: "Time format" }));
    await user.click(screen.getByRole("option", { name: "12-hour (4:15 PM)" }));
    expect(screen.getByTestId("sample-time")).toHaveTextContent("4:45 PM");
    expect(useUiStore.getState().timeFormat).toBe("12h");
  });
});
