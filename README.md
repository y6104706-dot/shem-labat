# שם לבת

משחק סוויפ לבחירת שם לבת, לשילת וניב. אפליקציית ווב (PWA) שמותקנת במסך הבית, עם סנכרון דרך Netlify Functions + Netlify Blobs.

- `index.html` — כל המשחק (2,170 שמות מנתוני הלמ"ס 1949–2024).
- `netlify/functions/sync.mjs` — `GET/PUT /api/sync?room=<קוד>&p=<shilat|niv>`.
- `sw.js` — עבודה בלי אינטרנט. בכל שחרור מעלים את `VERSION`.

הקישור האישי: `https://<האתר>/?k=<קוד-חדר>&p=shilat` (או `p=niv`). הקוד נשמר בטלפון בפעם הראשונה.
