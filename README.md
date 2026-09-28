# BucketList AI

Dream it, plan it, do it. Capture your bucket-list dreams, move them from dreaming to planning to done, and log the memory when you complete one — all in one page.

**100% local.** No account, no API keys, no network calls. Your dreams never leave the browser (saved in localStorage).

## Features

- **Dream capture** — add dreams with category (travel, adventure, learn, give, create), cost estimate, and effort level
- **State machine** — dreaming → planning → done, with completion dates and memory notes on every completed dream
- **105-idea bank** — 21 curated ideas per category; search, filter by category / max cost / max effort, or hit "Surprise me" for 3 random picks
- **One-click adoption** — add any idea to your list instantly
- **Progress dashboard** — dream counts, completion %, and a live progress bar

## Run it

Just open `index.html` in a browser — no build step. Or serve locally:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Tests

```bash
bash test/smoke.sh   # 12 checks
bash test/e2e.sh     # 7 flows
```

## Optional AI enhancement

Set an `OPENAI_API_KEY` in a future settings panel to generate personalized dream ideas — the app works fully without any key.

## License

MIT
