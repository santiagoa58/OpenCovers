import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n";
import { embedSnippet, scriptSnippet, widgetOrigin } from "@/lib/online-booking";

/** A translated sentence with `{name}` spots filled by elements (the `<code>` words that stay as they are). */
function withCode(text: string, parts: Record<string, string>) {
  return text.split(/(\{\w+\})/).map((piece, i) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return name && name in parts ? <code key={i}>{parts[name]}</code> : piece;
  });
}


async function copyText(text: string, done: string, failed: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error(failed);
  }
}


/** Booking key and embed instructions; own form state is held by its parent. */
export function OnlineBookingEmbed({
  bookingKey,
  enabled,
  host,
  followDark,
  onHostChange,
  onFollowDarkChange,
  onRotate,
}: {
  bookingKey: string | null;
  enabled: boolean;
  host: string;
  followDark: boolean;
  onHostChange: (host: string) => void;
  onFollowDarkChange: (checked: boolean) => void;
  onRotate: () => void;
}) {
  const t = useT();
  const hostOk = widgetOrigin(host) !== null;
  const snippet = bookingKey ? embedSnippet(host, bookingKey, followDark) : "";
  const script = bookingKey ? scriptSnippet(host, bookingKey, followDark) : "";
  return (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-display text-lg">{t("onlinebooking.embed.title")}</h3>
              {bookingKey ? (
                <div className="space-y-2">
                  <Label htmlFor="ob-key">{t("onlinebooking.key.label")}</Label>
                  <div className="flex gap-2">
                    <Input id="ob-key" readOnly value={bookingKey} className="font-mono" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t("onlinebooking.key.copyAria")}
                      onClick={() => void copyText(bookingKey, t("onlinebooking.key.copied"), t("onlinebooking.copyFailed"))}
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("onlinebooking.key.help")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("onlinebooking.key.none")}
                </p>
              )}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRotate()}
                >
                  {t("onlinebooking.rotateKey")}
                </Button>
              </div>

              {enabled && bookingKey && (
                <div className="space-y-2">
                  <Label htmlFor="ob-host">{t("onlinebooking.host.label")}</Label>
                  <Input
                    id="ob-host"
                    value={host}
                    onChange={(e) => onHostChange(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    {withCode(t("onlinebooking.host.help"), { path: `/w/${bookingKey}` })}
                  </p>
                  {!hostOk && (
                    <p className="text-sm text-destructive" role="alert">
                      {t("onlinebooking.host.invalid")}
                    </p>
                  )}

                  <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div>
                      <Label htmlFor="ob-follow-dark">{t("onlinebooking.followDark.label")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("onlinebooking.followDark.help")}
                      </p>
                    </div>
                    <Switch id="ob-follow-dark" checked={followDark} onCheckedChange={onFollowDarkChange} />
                  </div>

                  <Label htmlFor="ob-script">{t("onlinebooking.script.label")}</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="ob-script"
                      readOnly
                      rows={2}
                      value={script}
                      aria-invalid={!hostOk}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t("onlinebooking.script.copyAria")}
                      disabled={!hostOk}
                      onClick={() => void copyText(script, t("onlinebooking.embedCopied"), t("onlinebooking.copyFailed"))}
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {withCode(t("onlinebooking.script.help"), { script: "script-src", frame: "frame-src" })}
                  </p>

                  <Label htmlFor="ob-snippet">{t("onlinebooking.snippet.label")}</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="ob-snippet"
                      readOnly
                      rows={3}
                      value={snippet}
                      aria-invalid={!hostOk}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t("onlinebooking.snippet.copyAria")}
                      disabled={!hostOk}
                      onClick={() => void copyText(snippet, t("onlinebooking.embedCopied"), t("onlinebooking.copyFailed"))}
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {withCode(t("onlinebooking.snippet.help"), { frame: "frame-src" })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("onlinebooking.snippet.origins")}
                  </p>
                </div>
              )}
            </div>


  );
}
