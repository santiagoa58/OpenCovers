import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n";
import { useUiStore, type TimeFormat } from "@/stores/ui-store";

export function TimeFormatSettings() {
  const t = useT();
  const timeFormat = useUiStore((s) => s.timeFormat);
  const setTimeFormat = useUiStore((s) => s.setTimeFormat);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("setup.display.title")}</CardTitle>
        <CardDescription>{t("setup.display.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{t("setup.display.timeFormat")}</p>
          <p className="text-xs text-muted-foreground">{t("setup.display.timeHelp")}</p>
        </div>
        <Select value={timeFormat} onValueChange={(value) => setTimeFormat(value as TimeFormat)}>
          <SelectTrigger className="w-[180px]" aria-label={t("setup.display.timeFormat")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12h">{t("setup.display.12h")}</SelectItem>
            <SelectItem value="24h">{t("setup.display.24h")}</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
