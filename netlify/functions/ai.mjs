// AI endpoint for "שם לבת": interview turns, per-name deep analysis and the personal report.
// Prompts are built here (never sent from the client), the response is streamed so long answers stay
// inside the 60s streaming limit, and finished analyses are cached per room in Netlify Blobs.
import { getStore } from "@netlify/blobs";

const ROOM = /^[A-Za-z0-9]{24,64}$/;
const MAX_CALLS_PER_ROOM = 400;
const MODEL_FAST = process.env.AI_MODEL_FAST || "claude-sonnet-5-5";
const MODEL_DEEP = process.env.AI_MODEL_DEEP || "claude-opus-5-5";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const clip = (v, n) => String(v ?? "").slice(0, n);

const STYLE = `כתוב בעברית טבעית, חמה וחדה, בלי משפטי סלוגן, בלי אימוג'י ובלי מקפים ארוכים כקישוט.
אל תמציא עובדות. אם אינך בטוח במקור, בפירוש או בנתון, השמט אותו. עדיף פחות ונכון.`;

function people(ctx) {
  return `שילת (אישה, אמא לעתיד) וניב (גבר, אבא לעתיד) בוחרים שם לבת שתיוולד להם. הם עברו משחק סוויפ על שמות מתוך מאגר הלמ"ס, שלבי סינון ודו-קרבות, ונשארו להם חמישה שמות.`;
}

function buildInterview(body) {
  const p = body.p === "niv" ? "niv" : "shilat";
  const me = p === "niv" ? { name: "ניב", g: "זכר" } : { name: "שילת", g: "נקבה" };
  const other = p === "niv" ? "שילת" : "ניב";
  const finals = (body.finals || []).slice(0, 5).map((f) => `- ${clip(f.name, 30)}: ${clip(f.facts, 300)}`).join("\n");
  const insights = (body.insights || []).slice(0, 10).map((s) => `- ${clip(s, 300)}`).join("\n");
  const history = (body.history || []).slice(0, 10).map((t, i) => `שאלה ${i + 1}: ${clip(t[0], 400)}\nתשובה: ${clip(t[1], 1200)}`).join("\n\n");
  const n = (body.history || []).length;
  const system = `אתה מראיין רגיש ומעמיק שעוזר לזוג לבחור שם לבתם. ${people()}
עכשיו אתה מראיין את ${me.name} (פנה בלשון ${me.g === "זכר" ? "זכר" : "נקבה"}), בפרטיות, בלי ש${other} רואה.
המטרה: להבין את המניעים העמוקים. מה מושך אותו/ה בשמות, אילו זיכרונות, אנשים ומשפחה קשורים, מה חשוב לו/ה במשמעות, בצליל, במסורת, בכינויים, איך השם יישמע עם שם המשפחה ועם שמות של אחים בעתיד, ממה הוא/היא חושש/ת.
כללים:
- שאלה אחת בכל פעם, קצרה (משפט או שניים), אישית וספציפית. התייחס לשמות עצמם ולתשובות הקודמות.
- אל תחזור על שאלה. אל תשפוט. אל תמליץ על שם.
- בין 5 ל-7 שאלות בסך הכול. כרגע נשאלו ${n}.
- כשיש לך תמונה מספיקה (ואחרי 5 שאלות לפחות), סיים.
${STYLE}
החזר JSON בלבד, באחד משני המבנים:
{"q":"השאלה הבאה"}
{"done":true,"thanks":"משפט סיום קצר וחם","summary":"סיכום של 4-6 משפטים על המניעים של ${me.name}, לשימוש הדוח הסופי"}`;
  const user = `חמשת השמות בגמר:\n${finals}\n\nמה המשחק למד על הטעם של ${me.name}:\n${insights || "- אין מספיק נתונים"}\n\n${history ? "הראיון עד עכשיו:\n" + history : "זו תחילת הראיון. פתח בשאלה חמה ופשוטה."}`;
  return { model: MODEL_FAST, system, user, max_tokens: 700 };
}

function buildName(body) {
  const f = body.name || {};
  const system = `אתה חוקר שמות עבריים, בקיא בתנ"ך, בספרות חז"ל, בתפילה, בבלשנות עברית ובמסורות קריאת שמות בעדות ישראל. ${people()}
${STYLE}
ציטוטים ומקורות: רק אם אתה בטוח בהם (ספר, פרק ופסוק). אנשים מפורסמים: רק אם אתה בטוח. אל תפרש את הגימטריה אם אין לה משמעות מוכרת ומבוססת.
החזר JSON בלבד במבנה:
{"meaning":"פירוש השם ושורשו, 2-3 משפטים","sources":["מקור מדויק עם הסבר קצר"],"tradition":"מנהגים, עדות, הקשר יהודי-ישראלי, משפט או שניים","sound":"איך השם נשמע: הברות, הטעמה, צליל, איך נקרא לה בגן ובבגרות","nicknames":["כינויים טבעיים"],"gematria_note":"משמעות מוכרת למספר, או מחרוזת ריקה","notes":["עוד דבר מעניין ובטוח"],"fit":"2-3 משפטים: איך השם מתחבר למה שידוע על שילת וניב מהמשחק"}`;
  const user = `השם: ${clip(f.name, 30)}
גימטריה (מחושבת): ${clip(f.gematria, 10)}
נתוני הלמ"ס: ${clip(f.facts, 400)}
פירוש קצר במאגר: ${clip(f.meaning, 200) || "אין"}
המסע של השם במשחק: ${clip(f.journey, 800)}
מה ידוע על הטעם של שילת: ${clip((body.shilat || []).join(" | "), 900)}
מה ידוע על הטעם של ניב: ${clip((body.niv || []).join(" | "), 900)}`;
  return { model: MODEL_DEEP, system, user, max_tokens: 1400 };
}

function buildReport(body) {
  const block = (who, d) =>
    `${who}:\nתובנות טעם: ${clip((d.insights || []).join(" | "), 1500)}\nנתוני התנהגות: ${clip(d.stats, 1500)}\nסיכום הראיון: ${clip(d.summary, 1500)}\nהראיון המלא:\n${(d.interview || []).slice(0, 10).map((t) => `ש: ${clip(t[0], 300)}\nת: ${clip(t[1], 900)}`).join("\n")}`;
  const system = `אתה פסיכולוג מנוסה שמתמחה בזוגיות, ובמקביל אוהב נתונים. ${people()}
כתוב להם דוח אישי: מה למדת על כל אחד מהם ועליהם כזוג לאורך התהליך, על סמך ההתנהגות במשחק (מה אהבו, על מה היססו, כמה מהר החליטו, עקביות) ועל סמך הראיונות.
אל תבחר בשבילם שם. כן מותר לומר איזה שם מתיישב הכי טוב עם מה שכל אחד אמר, ולמה.
היה ספציפי: צטט נתונים ושמות. בלי קלישאות של "אתם זוג מדהים".
${STYLE}
החזר JSON בלבד במבנה:
{"shilat":{"title":"כותרת קצרה","paragraphs":["2-3 פסקאות"],"motives":["מניע מרכזי"]},"niv":{"title":"","paragraphs":[],"motives":[]},"together":{"title":"","paragraphs":["2-3 פסקאות: איפה נפגשים, איפה שונים, איך לדבר על זה"]},"names":[{"name":"","why":"משפט או שניים: איך השם מתחבר למניעים של שניהם"}],"question":"שאלה אחת טובה שכדאי שישאלו זה את זה לפני ההחלטה","closing":"משפט סיום"}`;
  const user = `חמשת השמות בגמר: ${clip((body.finals || []).join(", "), 200)}\nדירוג הדו-קרבות: ${clip(body.duels, 600)}\n\n${block("שילת", body.shilat || {})}\n\n${block("ניב", body.niv || {})}\n\nנתונים משותפים: ${clip(body.together, 1500)}`;
  return { model: MODEL_DEEP, system, user, max_tokens: 2600 };
}

const BUILDERS = { interview: buildInterview, name: buildName, report: buildReport };

function mock(kind, body) {
  if (kind === "interview") {
    const n = (body.history || []).length;
    return n >= 5
      ? JSON.stringify({ done: true, thanks: "תודה, זה עזר מאוד.", summary: "סיכום בדיקה." })
      : JSON.stringify({ q: `שאלת בדיקה מספר ${n + 1}: מה עולה לך כשאת/ה שומע/ת את השמות?` });
  }
  if (kind === "name")
    return JSON.stringify({ meaning: "פירוש בדיקה.", sources: ["מקור בדיקה"], tradition: "מסורת בדיקה.", sound: "צליל בדיקה.", nicknames: ["כינוי"], gematria_note: "", notes: [], fit: "התאמה בדיקה." });
  return JSON.stringify({
    shilat: { title: "שילת", paragraphs: ["פסקת בדיקה."], motives: ["מניע"] },
    niv: { title: "ניב", paragraphs: ["פסקת בדיקה."], motives: ["מניע"] },
    together: { title: "ביחד", paragraphs: ["פסקת בדיקה."] },
    names: (body.finals || []).map((n) => ({ name: n, why: "בדיקה." })),
    question: "שאלת בדיקה?",
    closing: "סיום בדיקה.",
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const room = url.searchParams.get("room") || "";
  if (!ROOM.test(room)) return json({ error: "bad_room" }, 400);
  const store = getStore({ name: "shem-labat", consistency: "strong" });

  // cached results: GET /api/ai?room=..&key=name:הדס | report
  if (req.method === "GET") {
    const key = clip(url.searchParams.get("key"), 80);
    const hit = key ? await store.get(`${room}/ai/${key}`, { type: "json" }) : null;
    return json({ hit: hit || null });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // only rooms that are really in use may spend AI calls
  const [a, b] = await Promise.all([store.get(`${room}/shilat`), store.get(`${room}/niv`)]);
  if (!a && !b) return json({ error: "unknown_room" }, 403);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const kind = body && body.kind;
  if (!BUILDERS[kind]) return json({ error: "bad_kind" }, 400);
  const cacheKey = kind === "name" ? `name:${clip(body.name && body.name.name, 30)}` : kind === "report" ? "report" : null;

  if (cacheKey && !body.refresh) {
    const hit = await store.get(`${room}/ai/${cacheKey}`, { type: "json" });
    if (hit) return json({ cached: true, text: hit.text });
  }

  const countKey = `${room}/ai-count`;
  const count = Number((await store.get(countKey)) || 0);
  if (count >= MAX_CALLS_PER_ROOM) return json({ error: "limit" }, 429);
  await store.set(countKey, String(count + 1));

  const enc = new TextEncoder();
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key && process.env.MOCK_AI !== "1") return json({ error: "no_key" }, 503);

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        if (!key) {
          full = mock(kind, body);
          controller.enqueue(enc.encode(full));
        } else {
          const p = BUILDERS[kind](body);
          const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: p.model, max_tokens: p.max_tokens, stream: true, system: p.system, messages: [{ role: "user", content: p.user }] }),
          });
          if (!r.ok || !r.body) {
            const t = await r.text().catch(() => "");
            controller.enqueue(enc.encode(`\u0000ERROR ${r.status} ${t.slice(0, 300)}`));
            controller.close();
            return;
          }
          const reader = r.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, i).trim();
              buf = buf.slice(i + 1);
              if (!line.startsWith("data:")) continue;
              try {
                const ev = JSON.parse(line.slice(5));
                if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
                  full += ev.delta.text;
                  controller.enqueue(enc.encode(ev.delta.text));
                }
              } catch {}
            }
          }
        }
        if (cacheKey && full) await store.setJSON(`${room}/ai/${cacheKey}`, { text: full, t: Date.now() });
      } catch (e) {
        controller.enqueue(enc.encode(`\u0000ERROR stream ${String(e).slice(0, 200)}`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
};

export const config = { path: "/api/ai" };
