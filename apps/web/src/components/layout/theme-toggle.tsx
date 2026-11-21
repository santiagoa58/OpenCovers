import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n";

const OPTIONS: ThemePreference[] = ["system", "light", "dark"];

export function ThemeToggle() {
  const t = useT();
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("layout.theme.toggle")}>
          {theme === "system" ? <MonitorIcon className="size-4" /> : resolvedTheme === "dark" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => setTheme(option)}>
            {option === "system" ? <MonitorIcon className="size-4" /> : option === "dark" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
            {t(`layout.theme.${option}`)}
            {theme === option && <CheckIcon className="ml-auto size-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
