import { PlusIcon, PrinterIcon, UserRoundCheckIcon } from "lucide-react";
import { DayNav } from "@/components/day-nav";
import { PageHeader } from "@/components/layout/page-header";
import { TimeField } from "@/components/time-field";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { nowTime, todayIso, venueNow } from "@/lib/date";
import { setUrlParams } from "@/lib/url-state";

interface FloorToolbarProps {
  date: string;
  time: string;
  timezone?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onNewReservation: () => void;
  onWalkIn: () => void;
  onPrint: () => void;
}

export function FloorToolbar({
  date, time, timezone, onDateChange, onTimeChange, onNewReservation, onWalkIn, onPrint,
}: FloorToolbarProps) {
  const t = useT();

  function showNow() {
    setUrlParams(timezone ? venueNow(timezone) : { date: todayIso(), time: nowTime() }, "replace");
  }

  return (
    <div data-testid="floor-controls" className="print:hidden">
      <PageHeader
        title={t("floor.title")}
        description={t("floor.intro")}
        actions={
          <>
            <Button onClick={onNewReservation}>
              <PlusIcon className="size-4" />
              {t("floor.plan.addReservation")}
            </Button>
            <Button variant="outline" onClick={onWalkIn}>
              <UserRoundCheckIcon className="size-4" />
              {t("floor.plan.walkInNow")}
            </Button>
            <Button variant="outline" onClick={onPrint}>
              <PrinterIcon className="size-4" />
              {t("preshift.print")}
            </Button>
          </>
        }
      />
      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" data-testid="floor-filter-bar">
        <DayNav date={date} onChange={onDateChange} showToday={false} />
        <div className="flex min-w-0 items-center gap-2">
          <TimeField label={t("floor.time")} value={time} onChange={onTimeChange} />
          <Button variant="outline" className="shrink-0 px-3" onClick={showNow}>
            {t("floor.now")}
          </Button>
        </div>
      </div>
    </div>
  );
}
