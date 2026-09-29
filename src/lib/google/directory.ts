import { type admin_directory_v1, google } from "googleapis";
import { env } from "@/lib/env";
import type { RoomInput } from "@/lib/rooms/catalog";
import { completeFromName } from "@/lib/rooms/catalog";

const DIRECTORY_SCOPE = "https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly";

/**
 * Admin SDK access via a service account with domain-wide delegation that
 * impersonates an admin. Only used by the sync script, never per request.
 */
function directoryClient() {
  if (!env.serviceAccountKeyFile || !env.adminImpersonateEmail) {
    throw new Error(
      "Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE and GOOGLE_ADMIN_IMPERSONATE_EMAIL (see docs/google-setup.md).",
    );
  }
  const auth = new google.auth.JWT({
    keyFile: env.serviceAccountKeyFile,
    scopes: [DIRECTORY_SCOPE],
    subject: env.adminImpersonateEmail,
  });
  return google.admin({ version: "directory_v1", auth });
}

export async function fetchDirectoryRooms(): Promise<{ rooms: RoomInput[]; skipped: string[] }> {
  const admin = directoryClient();

  const buildingNames = new Map<string, string>();
  let pageToken: string | undefined;
  do {
    const res: { data: admin_directory_v1.Schema$Buildings } = await admin.resources.buildings.list({ customer: "my_customer", maxResults: 500, pageToken });
    for (const b of res.data.buildings ?? []) {
      if (b.buildingId) buildingNames.set(b.buildingId, b.buildingName ?? b.buildingId);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  const rooms: RoomInput[] = [];
  const skipped: string[] = [];
  pageToken = undefined;
  do {
    const res: { data: admin_directory_v1.Schema$CalendarResources } = await admin.resources.calendars.list({ customer: "my_customer", maxResults: 500, pageToken });
    for (const r of res.data.items ?? []) {
      if (!r.resourceEmail) continue;
      if (r.resourceCategory && r.resourceCategory !== "CONFERENCE_ROOM") continue;
      const features = (r.featureInstances as { feature?: { name?: string } }[] | undefined)
        ?.map((f) => f.feature?.name)
        .filter((n): n is string => Boolean(n));
      const room = completeFromName({
        resourceEmail: r.resourceEmail,
        name: r.resourceName ?? undefined,
        generatedName: r.generatedResourceName ?? undefined,
        building: r.buildingId ? buildingNames.get(r.buildingId) : undefined,
        googleBuildingId: r.buildingId,
        floor: r.floorName ?? undefined,
        capacity: r.capacity ?? undefined,
        features: features ?? [],
        source: "directory",
      });
      if (room) rooms.push(room);
      else skipped.push(r.generatedResourceName ?? r.resourceEmail);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return { rooms, skipped };
}
