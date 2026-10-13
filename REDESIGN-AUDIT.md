# Redesign Audit — bucketlist-ai (2026-10-13)

**Competitors studied:** TickItOff (goals tied to a year, progress tracking, completion summary, share achievements), Soon (category-organized lists, "past" section for completed items, trending), Lemon8 "100 ideas" (curated idea library, completed counter).

## Visual gaps
1. **Generic card stack.** Dream cards are plain bordered boxes with pills; category apps like Soon give each category a visual signature. Ours has no per-category identity.
2. **Hero is a thin stat strip.** TickItOff-style products make progress the hero — a big completion ring + "up next" spotlight. Ours shows small numbers above a thin progress bar.
3. **Memory journal reads like more cards.** Completed dreams with memories should feel like a journal — quoted memories, dates, an expedition-diary voice.
4. **Idea bank is a plain list.** Lemon8's idea library is browsable/categorical; ours is fine but visually flat.

## Functional / flow gaps
1. **No year goal framing.** TickItOff ties goals to a year ("12 in 2026"). → add a "completed this year" spotlight line under the hero (cheap, computed).
2. **No category visual coding.** → category-colored side bands + medallion glyph per card.
3. **Surprise-me uses alert().** → replace with an inline "draw" panel (3 cards to pick from).

## Decisions
- Keep: dreaming→planning→done flow, pins, target dates + due badges, journal entries, memories, actual-cost tracking, idea bank filters, backup/restore, share journey — all preserved.
- Identity: "expedition dossier" — cream paper, deep forest ink, brass accents, serif display titles, state-colored side bands, sharp corners.
- Hero: dark forest band, completion ring, year-progress line, up-next spotlight.
