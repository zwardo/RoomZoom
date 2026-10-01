import { Check, X } from "lucide-react";
import { notFound } from "next/navigation";
import { CsvImportForm, HarvestForm } from "@/components/admin/action-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/session";
import { harvestRoomsAction, importDesksAction, importRoomsAction } from "./actions";

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {ok ? <Check className="size-3.5 text-success" aria-label="Done" /> : <X className="size-3.5 text-destructive" aria-label="Missing" />}
      {children}
    </span>
  );
}

export default async function AdminPage() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  const [floors, unplaced, roomCount, people, desks] = await Promise.all([
    db.floor.findMany({
      include: {
        building: true,
        _count: { select: { rooms: true, desks: true, navNodes: true } },
        rooms: { select: { polygon: true, doorX: true } },
      },
      orderBy: [{ building: { name: "asc" } }, { level: "asc" }],
    }),
    db.room.count({ where: { floorId: null } }),
    db.room.count(),
    db.person.findMany({ select: { deskLabel: true } }),
    db.desk.findMany({ select: { label: true } }),
  ]);
  const deskLabels = new Set(desks.map((d) => d.label));
  const unmatchedPeople = people.filter((p) => !deskLabels.has(p.deskLabel)).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          {roomCount} rooms · {floors.length} floors · {people.length} desk assignments
          {unmatchedPeople > 0 && ` (${unmatchedPeople} point at desks that aren't drawn yet)`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Floors</CardTitle>
          <CardDescription>
            Import or re-import a floor with <code>npm run import:floor</code>. See the README section on floor plans.
          </CardDescription>
        </CardHeader>
        <CardContent className="scrollbar-auto-hide overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Floor</th>
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Scale</th>
                <th className="py-2 pr-4 font-medium">Rooms drawn</th>
                <th className="py-2 pr-4 font-medium">Desks</th>
                <th className="py-2 font-medium">Hallways</th>
              </tr>
            </thead>
            <tbody>
              {floors.map((f) => {
                const drawn = f.rooms.filter((r) => r.polygon || r.doorX != null).length;
                return (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">
                      {f.building.name} · {f.name}
                    </td>
                    <td className="py-2 pr-4">
                      <Status ok={Boolean(f.imagePath)}>{f.imagePath ? `${f.widthPx}×${f.heightPx}` : "none"}</Status>
                    </td>
                    <td className="py-2 pr-4">
                      <Status ok={Boolean(f.feetPerPixel)}>
                        {f.feetPerPixel ? `${Math.round(f.widthPx * f.feetPerPixel)} ft wide` : "not set"}
                      </Status>
                    </td>
                    <td className="py-2 pr-4">
                      <Status ok={drawn === f._count.rooms && drawn > 0}>
                        {drawn} / {f._count.rooms}
                      </Status>
                    </td>
                    <td className="py-2 pr-4">{f._count.desks}</td>
                    <td className="py-2">
                      {f._count.navNodes ? (
                        `${f._count.navNodes} nodes`
                      ) : (
                        <Badge variant="warning">straight-line only</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {unplaced > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {unplaced} rooms have no floor (their names didn&apos;t include one).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rooms CSV</CardTitle>
            <CardDescription>
              Columns: <code>email, name, building, floor, capacity, features</code>. Building, floor, capacity and
              features can be left empty if <code>name</code> is Google&apos;s <code>HQ-2-Oak (8) [TV]</code> format.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImportForm
              id="rooms-csv"
              label="Paste CSV"
              action={importRoomsAction}
              placeholder={"email,name,building,floor,capacity,features\nc_123@resource.calendar.google.com,HQ-2-Oak (8) [TV],,,,"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Desk assignments CSV</CardTitle>
            <CardDescription>
              Columns: <code>email, desk</code>, optionally <code>name, building, floor</code>. Desk labels must match{" "}
              <code>desk-…</code> names on the floor plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImportForm
              id="desks-csv"
              label="Paste CSV"
              action={importDesksAction}
              placeholder={"email,name,desk,building,floor\nalex@example.com,Alex Kim,2-114,HQ,2"}
            />
          </CardContent>
        </Card>
      </div>

      {user.provider === "google" && (
        <Card>
          <CardHeader>
            <CardTitle>No Directory access?</CardTitle>
            <CardDescription>
              Adds any room that appears on your own calendar events from the last 6 months, parsed from its name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HarvestForm action={harvestRoomsAction} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
