import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { LoadError } from "@/components/load-error";
import { ServerBanner } from "@/components/server-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { useVenues } from "@/hooks/use-venues";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";
import { sectionForTarget } from "@/lib/settings-section";
import { useUrlParam, setUrlParams } from "@/lib/url-state";
import { AgendaView } from "./agenda/agenda-view";
import { AvailabilityView } from "./availability/availability-view";
import { FloorView } from "./floor/floor-view";
import { NavigationProvider, useScrollToSection } from "./layout/navigation";
import { MobileNav, Sidebar, viewLabel, type ViewId } from "./layout/sidebar";
import { Topbar } from "./layout/topbar";
import { SetupView } from "./setup/setup-view";
import { TeamView } from "./team/team-view";
import { EmptyVenues } from "./venue/empty-venues";
import { WaitlistView } from "./waitlist/waitlist-view";

export function Dashboard() {
  const t = useT();
  const { data: session } = authClient.useSession();
  const { data, isPending, isError, error, isRefetching, refetch } = useVenues();
  const venueId = useUiStore((s) => s.venueId);
  const setVenue = useUiStore((s) => s.setVenue);
  const viewParam = useUrlParam("view");
  const sectionParam = useUrlParam("section");
  const views: ViewId[] = ["floor", "agenda", "availability", "waitlist", "setup", "team"];
  const requestedView = views.find((view) => view === viewParam) ?? (sectionParam ? "setup" : "floor");
  const [navOpen, setNavOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);

  const venues = data?.venues ?? [];
  const role = venues.find((v) => v.id === venueId)?.role;
  const active: ViewId = requestedView === "team" && role && role !== "admin" ? "floor" : requestedView;

  useEffect(() => {
    if (
      venues.length > 0 &&
      (!venueId || !venues.some((v) => v.id === venueId))
    ) {
      setVenue(venues[0].id);
    }
  }, [venues, venueId, setVenue]);

  const goTo = useCallback((view: ViewId, to?: string) => {
    setSection(to ?? null);
    const target = to ? sectionForTarget(to) : undefined;
    const changedScreen = view !== active;
    setUrlParams({
      view,
      section: view === "setup" ? (target ?? (changedScreen ? null : sectionParam)) : null,
      // Keep date, floor snapshot and party filters available on a return visit.
      // Tab changes are navigable; rapid time selection remains replace-only.
    });
  }, [active, sectionParam]);
  const navigation = useMemo(() => ({ goTo, role }), [goTo, role]);

  const sectionDone = useCallback(() => setSection(null), []);
  useScrollToSection(section, sectionDone);

  // The tab says which screen and which venue it is, and a screen reader hears it when the page changes.
  const venueName = venues.find((v) => v.id === venueId)?.name;
  useEffect(() => {
    document.title = [viewLabel(active), venueName, "OpenCovers"].filter(Boolean).join(" · ");
    return () => {
      document.title = "OpenCovers";
    };
  }, [active, venueName]);

  const mainRef = useRef<HTMLElement>(null);

  return (
    <NavigationProvider value={navigation}>
      <div className="flex min-h-dvh">
        {/* biome-ignore lint/a11y/useValidAnchor: Skip link deliberately focuses the landmark without mutating the URL fragment used by invitations. */}
        <a
          href="#main-content"
          onClick={(e) => {
            // A link to a fragment would change the address, which the invitation link also uses.
            e.preventDefault();
            mainRef.current?.focus();
          }}
          className="sr-only z-50 rounded-md bg-primary text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:px-4 focus:py-2 focus:shadow-lg"
        >
          {t("layout.skipToContent")}
        </a>
        <Sidebar active={active} onSelect={(view) => goTo(view)} role={role} />
        <MobileNav
          open={navOpen}
          onOpenChange={setNavOpen}
          active={active}
          onSelect={(view) => goTo(view)}
          role={role}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <ServerBanner />
          <Topbar email={session?.user.email} onMenu={() => setNavOpen(true)} />
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 outline-none sm:p-6 lg:p-8 print:p-0"
          >
            {isPending ? (
              <div className="space-y-4">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : isError && !data ? (
              <LoadError title={t("layout.dashboard.loadVenues")} error={error} retrying={isRefetching} onRetry={() => void refetch()} />
            ) : venues.length === 0 ? (
              <EmptyVenues />
            ) : venueId ? (
              <>
                {active === "agenda" && <AgendaView venueId={venueId} />}
                {active === "floor" && <FloorView venueId={venueId} timezone={venues.find((v) => v.id === venueId)?.timezone} />}
                {active === "availability" && <AvailabilityView venueId={venueId} />}
                {active === "waitlist" && <WaitlistView venueId={venueId} />}
                {active === "team" && role === "admin" && <TeamView venueId={venueId} />}
                {active === "setup" && <SetupView venueId={venueId} role={role} />}
              </>
            ) : null}
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}
