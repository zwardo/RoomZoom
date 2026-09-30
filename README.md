# RoomZoom

Find and book meeting rooms near your desk. RoomZoom reads your Google Calendar, shows which of your upcoming meetings still need a room, and lists free rooms filtered by building, floor, capacity, and features, sorted by walking distance from your desk on an interactive floor map.

## Quick start (demo mode, no Google setup)

```bash
npm install
cp .env.example .env.local        # then set AUTH_SECRET (openssl rand -base64 32)
npm run db:push                   # create the SQLite database
npm run db:seed                   # sample rooms, two demo floors of HQ, Building 2 floor 4, desk assignments
npm run dev
```

Open <http://localhost:3000> and choose **Continue as demo user**. The demo calendar is simulated in memory (it resets when the server restarts), and the demo user sits at desk `2-4046` on Building 2 floor 4.

`npm run db:reset` wipes the database and re-seeds it.

## Connecting Google

Follow [docs/google-setup.md](docs/google-setup.md) to create the OAuth client, then set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `GOOGLE_WORKSPACE_DOMAIN` in `.env.local`. Set `DEMO_MODE="false"` to hide the demo sign-in.

A real user only gets distance sorting once their email has a desk assignment (see below).

## Loading your data

| What | How |
| --- | --- |
| Rooms, from the Directory (needs an admin) | `npm run sync:directory` |
| Rooms, from a CSV | `npm run import:rooms -- rooms.csv`, or paste it on the **Admin** page |
| Rooms, from your own calendar history | **Admin > Collect rooms from my calendar** (Google sign-in only) |
| Desk assignments | `npm run import:desks -- desks.csv`, or paste it on the **Admin** page |
| Floor plans | `npm run ocr:floor`, then `npm run import:floor` (below) |

See `data/samples/` for the CSV formats. Room rows may leave building, floor, capacity, and features empty when the name uses Google's `HQ-2-Oak (8) [TV]` format.

The **Admin** page (open to everyone under `npm run dev`, and to `ADMIN_EMAILS` in production) shows which floors are missing a plan, a scale, room outlines, or hallways.

## Floor plans

A floor is an SVG whose **layer names** mark what matters. Coordinates are the background image's pixels, so the SVG's `viewBox` must match the image size, with the image placed at `0,0`.

| Layer name | Shape | Meaning |
| --- | --- | --- |
| `room-<name>` | rect / polygon / path | Room outline. `<name>` matches the room's email, the part before `@`, or its name |
| `door-<name>` | any | Door position (optional; the outline's center is used otherwise) |
| `desk-<label>` | any | Desk position, e.g. `desk-2-114`. Labels match the desk CSV |
| `hall` | line / polyline / path | Hallway centerline. Lines whose ends touch another line are joined |
| `stairs-<key>`, `elevator-<key>` | any | Use the same key on every floor to link floors |
| `scale-<n>ft` (or `m`) | line | Drawn over a known real length, which sets the distance scale |

The separator after the kind can be `-`, `_`, `:` or a space, so names survive Figma's and Inkscape's SVG export. Group layers work too.

**From a JPG scan:**

1. `npm run ocr:floor -- plans/hq-2.jpg --building HQ` sends the image to Cloud Vision and writes `hq-2.starter.svg` next to it. The starter has desks placed wherever a label looks like a desk number (adjust with `--desk-pattern`), placeholder boxes around labels that match room names in the catalog, and every detected word as a faint reference.
2. Open the starter in Inkscape (free) or Figma. Resize the room boxes to the real outlines, draw the `hall` lines, mark the stairs and elevators, and move `scale-10ft` over a dimension you know, renaming it to that length.
3. `npm run import:floor -- --building HQ --floor 2 --svg plans/hq-2.starter.svg`

If you know the drawing scale and scan resolution instead, pass `--scale 1/8 --dpi 150` (meaning 1/8" = 1'-0") or `--scale 1:100 --dpi 150`, or `--feet-per-pixel`. Re-importing a floor replaces its outlines, desks, and hallways. Desk assignments are kept because they are stored by label.

**From a traced SVG:** if you've already redrawn a floor as a vector, name its layers as above and import it directly. When the SVG has no embedded image, its own drawing (minus the annotation layers) becomes the map background.

**Dark plans:** the map inverts backgrounds, assuming dark lines on white. A plan already drawn in the app's dark palette (like `prisma/floors/building-2-4.svg`, traced from the Figma frame) is shown as is with `--theme dark`:

```bash
npm run import:floor -- --building "Building 2" --floor 4 --svg prisma/floors/building-2-4.svg --theme dark
```

### How distance works

- **Walk:** the shortest route along the hallway graph from your desk to the room's door, drawn on the map when you select a room. A floor change adds `FLOOR_CHANGE_PENALTY_FT` (default 60 ft) per level.
- **Straight line:** used on your own floor when it has no hallways drawn.
- **Estimate:** a straight line plus the floor penalty, used for another floor without a connected graph. It assumes floor plans in a building line up.
- Rooms in other buildings have no distance.

## Project layout

```
src/app/                 pages (/, /find, /admin, /signin) and API routes
src/components/find/     room search: filters, results, floor map, booking dialog
src/lib/calendar/        Google Calendar and demo providers behind one interface
src/lib/rooms/           catalog, CSV parsing, room-name parsing, search
src/lib/floors/          SVG annotation parser, floor import, image storage
src/lib/geo/             hallway-graph distance and desk lookup
src/lib/ocr/             Cloud Vision OCR and starter SVG generation
scripts/                 command-line imports and sync
prisma/                  schema, seed, generated demo floors
prisma/floors/           annotated floor plans the seed imports
```

## Checks

```bash
npm run typecheck && npm run lint && npm test
```
