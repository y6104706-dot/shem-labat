// Sync endpoint for "שם לבת": each player's packed answers live in one blob per room.
import { getStore } from "@netlify/blobs";

const ROOM = /^[A-Za-z0-9]{24,64}$/;
const PLAYERS = ["shilat", "niv"];
const MAX_BYTES = 1_000_000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async (req) => {
  const url = new URL(req.url);
  const room = url.searchParams.get("room") || "";
  if (!ROOM.test(room)) return json({ error: "bad_room" }, 400);
  const store = getStore({ name: "shem-labat", consistency: "strong" });

  if (req.method === "GET") {
    const docs = await Promise.all(PLAYERS.map((p) => store.get(`${room}/${p}`, { type: "json" })));
    return json({ shilat: docs[0] || null, niv: docs[1] || null, t: Date.now() });
  }

  if (req.method === "PUT") {
    const p = url.searchParams.get("p");
    if (!PLAYERS.includes(p)) return json({ error: "bad_player" }, 400);
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "too_large" }, 413);
    let doc;
    try { doc = JSON.parse(text); } catch { return json({ error: "bad_json" }, 400); }
    if (!doc || typeof doc !== "object" || typeof doc.a !== "object") return json({ error: "bad_doc" }, 400);
    await store.setJSON(`${room}/${p}`, doc);
    return json({ ok: true, t: Date.now() });
  }

  return json({ error: "method" }, 405);
};

export const config = { path: "/api/sync" };
