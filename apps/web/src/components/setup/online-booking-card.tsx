import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "cn";
import { Pill } from "@/components/pill";
import { SaveBar } from "./form-parts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n";
import { useOnlineBooking } from "@/hooks/use-online-booking";
import { useServices } from "@/hooks/use-services";
import { useTables } from "@/hooks/use-tables";
import { useVenues } from "@/hooks/use-venues";
import { api } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/error-message";
import {
  defaultThemeForm,
  parseForm,
  toForm,
  type OnlineBookingForm,
  type FormErrors,
  type ThemeForm,
} from "@/lib/online-booking";
import { OnlineBookingThemeEditor } from "./online-booking-theme-editor";
import { OnlineBookingEmbed } from "./online-booking-embed";
import { OnlineBookingAvailabilityFields } from "./online-booking-availability-fields";
import { OnlineBookingGuestFields } from "./online-booking-guest-fields";

export function OnlineBookingCard({ venueId }: { venueId: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { data, isPending, isError, error: loadError, isRefetching, refetch } = useOnlineBooking(venueId);
  const { data: serviceData } = useServices(venueId);
  const { data: venueData } = useVenues();
  const { data: tableData } = useTables(venueId);
  const services = serviceData?.services ?? [];
  const serviceNames = services.map((s) => s.name);
  const venueName = venueData?.venues.find((v) => v.id === venueId)?.name;
  const [form, setForm] = useState<OnlineBookingForm | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [incomplete, setIncomplete] = useState(false);
  const [host, setHost] = useState(window.location.origin);
  const [followDark, setFollowDark] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [lowContrast, setLowContrast] = useState<number | null>(null);
  const [lowContrastDark, setLowContrastDark] = useState<number | null>(null);

  // Reset the form only when the saved server value changes, so a refetch that returns the same
  // settings does not wipe edits that are not saved yet.
  const savedKey = useRef<string | null>(null);
  useEffect(() => {
    if (!data) return;
    const next = JSON.stringify(data);
    if (next === savedKey.current) return;
    savedKey.current = next;
    setForm(toForm(data));
    setErrors({});
    setIncomplete(false);
  }, [data]);

  const save = useMutation({
    mutationFn: (update: Parameters<typeof api.setOnlineBooking>[1]) =>
      api.setOnlineBooking(venueId, update),
    onSuccess: ({ warnings, ...settings }) => {
      queryClient.setQueryData(["online-booking", venueId], settings);
      setIncomplete(false);
      toast.success(t("onlinebooking.saved"));
      const low = warnings.find((w) => w.code === "low_contrast" && w.palette !== "dark");
      setLowContrast(low ? (low.ratio ?? 0) : null);
      const lowDark = warnings.find((w) => w.code === "low_contrast" && w.palette === "dark");
      setLowContrastDark(lowDark ? (lowDark.ratio ?? 0) : null);
    },
    onError: (err) => {
      if (isApiError(err, "online_booking_incomplete")) {
        // The server kept online booking off: show that, and keep the other edits.
        setForm((f) => (f && data ? { ...f, enabled: data.enabled } : f));
        setIncomplete(true);
        return;
      }
      toast.error(
        isApiError(err, "forbidden")
          ? t("onlinebooking.forbidden")
          : errorMessage(err, t("onlinebooking.saveFailed")),
      );
    },
  });

  const rotate = useMutation({
    mutationFn: () => api.rotateBookingKey(venueId),
    onSuccess: (settings) => {
      queryClient.setQueryData(["online-booking", venueId], settings);
      setConfirmRotate(false);
      toast.success(t("onlinebooking.rotated"));
    },
    onError: (err) => {
      setConfirmRotate(false);
      toast.error(
        isApiError(err, "forbidden")
          ? t("onlinebooking.rotateForbidden")
          : errorMessage(err, t("onlinebooking.rotateFailed")),
      );
    },
  });

  function submit() {
    if (!data || !form) return;
    const result = parseForm(form, data, serviceNames);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIncomplete(false);
    setLowContrast(null);
    setLowContrastDark(null);
    if (Object.keys(result.update).length === 0) {
      toast.success(t("onlinebooking.nothingToSave"));
      return;
    }
    save.mutate(result.update);
  }

  function setTheme(patch: Partial<ThemeForm>) {
    if (form) setForm({ ...form, theme: { ...form.theme, ...patch } });
  }

  // The zone names the venue's tables carry. A saved name no table has is still listed, so it can be removed.
  const tableZones = [...new Set((tableData?.tables ?? []).map((tb) => tb.zone.trim()).filter((z) => z !== ""))];
  const zonesReady = tableData !== undefined;

  const bookable = services.some(
    (s) =>
      (form?.services == null || form.services.includes(s.name)) &&
      (form === null || s.days.some((d) => form.weekdays.includes(d))),
  );
  const missing: string[] = [];
  if (venueName !== undefined && venueName.trim() === "") missing.push(t("onlinebooking.missing.name"));
  if (services.length === 0) missing.push(t("onlinebooking.missing.services"));
  else if (!bookable)
    missing.push(t("onlinebooking.missing.bookable"));
  if (missing.length === 0) missing.push(t("onlinebooking.missing.generic"));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("onlinebooking.title")}</CardTitle>
        <CardDescription>{t("onlinebooking.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isError && !data ? (
          <LoadError compact what={t("onlinebooking.loadWhat")} error={loadError} retrying={isRefetching} onRetry={() => void refetch()} />
        ) : isPending || !form || !data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors",
                form.enabled && "border-transparent bg-success-soft",
              )}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="ob-enabled">{t("onlinebooking.enabled.label")}</Label>
                  <Pill tone={data.enabled ? "success" : "muted"} dot>
                    {data.enabled ? t("onlinebooking.live") : t("onlinebooking.off")}
                  </Pill>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("onlinebooking.enabled.help")}
                </p>
              </div>
              <Switch
                id="ob-enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>

            {incomplete && (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
              >
                <p>{t("onlinebooking.incomplete")}</p>
                <ul className="list-disc pl-5">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            <OnlineBookingAvailabilityFields form={form} errors={errors} serviceNames={serviceNames} onChange={setForm} />
            <OnlineBookingGuestFields form={form} errors={errors} tableZones={tableZones} zonesReady={zonesReady} onChange={setForm} />

            <OnlineBookingThemeEditor
              theme={form.theme}
              errors={errors}
              lowContrast={lowContrast}
              lowContrastDark={lowContrastDark}
              onThemeChange={setTheme}
              onReset={() => setForm({ ...form, theme: defaultThemeForm() })}
            />

            <OnlineBookingEmbed
              bookingKey={data.bookingKey}
              enabled={data.enabled}
              host={host}
              followDark={followDark}
              onHostChange={setHost}
              onFollowDarkChange={setFollowDark}
              onRotate={() => setConfirmRotate(true)}
            />

            <SaveBar hint={t("onlinebooking.saveHint")}>
              <Button onClick={submit} disabled={save.isPending}>
                {save.isPending ? t("common.saving") : t("onlinebooking.saveButton")}
              </Button>
            </SaveBar>
          </>
        )}
      </CardContent>

      <Dialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("onlinebooking.rotate.title")}</DialogTitle>
            <DialogDescription>
              {t("onlinebooking.rotate.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRotate(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={rotate.isPending}
              onClick={() => rotate.mutate()}
            >
              {rotate.isPending ? t("onlinebooking.rotating") : t("onlinebooking.rotateKey")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
