# 9-Layer Unslopping Execution Steps

## 1. Spacing

- Everything sits on a 4px grid. Margins, paddings, gaps and fixed heights are multiples of 4, so 28 or 104 are fine even though they are not in the token list. A 2px step is fine for nudges inside small controls, and an odd value that exactly centers something stays.
- Same thing, same size. All rows in a list share one height and one gap, all cards in a row share one padding.
- Space shows grouping. Space inside a group is smaller than space between groups, so a list reads as one block and sections read as separate ones.
- Things line up. Icons sit in one column, labels start on one line, numbers align right in one column. Nothing is nudged off the line with a stray translate or odd margin.
- Padding follows density. Compact panels and sidebars around 16, cards 20 to 24, page edges 24 to 32.
- Navigation is the densest part of an app. Rows are 32 to 36 tall with 2 to 4 between them, icons in one column, labels on one line. A section label sits closer to its own items than to the section above it, like 24 above and 8 below. Measure the sidebar after the pass, it is where spacing breaks most often.
- Remove one-off values that break the rhythm, like `mt-[13px]` or `py-[11px]`, and replace them with steps from the scale.

## 2. Color

- Build from one neutral ramp, tinted toward the world from the direction. Pick graphite, warm or ink from the tokens, or tint your own the same way. Background, raised surfaces, borders and text all come from that ramp.
- In apps and dashboards the backgrounds, surfaces, borders and text stay neutral, the graphite ramp or something just as grey. People look at them for hours and the content has to carry the color. A screen whose background reads as orange, brown, blue or green has gone too far. The world shows in the accent, the charts and the moments, not in the surfaces. Landing pages can tint their surfaces further toward the world.
- Three text roles, primary, secondary and muted. Not ten slightly different lavenders.
- In the chrome, one accent, used rarely. It marks the primary action, the selection or the one number that matters.
- The moments from the direction are the exception. Inside them color can be rich, several hues in a chart, a rendered object with real materials, an image with its own light, as long as it stays inside the world and each color means something.
- If the brand has a real color, it becomes the accent and leaves the surfaces. If there is no real brand color, take the accent from the world.
- Accent with text on it reaches 4.5 to 1 contrast. If it does not, darken it or put dark text on it. Accent used as text or ink on a light surface needs the same contrast, so use a darker shade of it there.
- On dark themes the primary button can be an off white from the ramp with dark text, and the accent can live in a smaller place like the selection or a key figure. This often looks more deliberate than a colored button.
- Semantic colors only carry meaning, like green for a good change and red for an error, and they are toned down to sit inside the palette.
- Remove hue gradients on surfaces, gradient text, colored glows and colored shadows, radial color washes and blobs behind content, and neon borders.
- Borders are quiet hairlines, the text color of the ramp at 6 to 10% opacity.
- On dark themes depth comes from surface steps and hairlines, not from shadows. A window or object floating over an image may keep a soft neutral shadow. On light themes shadows are neutral, soft and small.
- A gradient is allowed only as a small tone shift inside one neutral, like an active row going from #2b2b2b to #1f1f1f. Never from one hue to another.

## 3. Icons

- Every emoji used as an icon or as decoration in a label becomes a line icon from one set. Use the set the project already has, otherwise lucide.
- One size and one stroke everywhere, 16 or 18px with a 1.5 stroke.
- Icons take the color of their text role, usually secondary or muted. They never get their own colors.
- The icon box has the same width in every row and the gap to the label is fixed, 8 or 10, so labels align.
- Drop icons that add nothing, like an emoji in every card title or before every section label. Categories that need color get a small status dot.

## 4. Copy

- Headlines say what the product does for whom, in plain words, so they could not fit another product. Use the facts already on the page and do not invent new ones.
- No exclamation marks in interface text, and never `!!`.
- No greeting headlines like `Welcome back, Damir! 👋`. The title names the context, like the page name or the period, for example `October 2026`.
- Short labels. `Search`, not `Search anything...`.
- A change says what it compares to, like `+12% vs last month` or `3 fewer vs last month`.
- Headlines, subheads, labels, buttons and captions end without a period. Only paragraphs of several sentences keep their periods.
- No hype words like supercharge, seamless, unlock, magic, revolutionize or game-changing, and no `AI-powered` on everything.
- Claims that cannot be checked, like `Loved by 10,000+ teams` or `10x faster`, become quiet and specific if the user confirms they are real, and are removed otherwise. Ask, and list them in the report.
- Mock data looks real, with plausible numbers and names, never `[X]` or `123,456`.
- Badges like `PRO`, `New ✨` or `Beta 🚀` go away unless the product really needs them, and then they are quiet text.

## 5. Type

- Choose type for the character in the direction, from the families in the tokens. Keep the project's font when it is part of a real brand. A default like Inter that nobody chose may be swapped when another family fits the character better. One family for the interface, plus at most one partner from any row of the tokens, a mono for figures and meta or a display face for large headlines.
- A few sizes from a scale and two weights, 400 and 500, with 600 at most for rare emphasis. No 700 to 900 headings, no gradient text.
- Hierarchy comes from size and color, not from weight.
- Sentence case everywhere. Labels like `NAVIGATION` or `PAID THIS MONTH` with wide tracking become `Navigation` and `Paid this month`.
- Small text never gets negative letter spacing. Readability on small text means bigger, a bit bolder or slightly looser. Tight tracking is only for large display text.
- Numbers use `tabular-nums` and one format across the screen. If one figure is `$48,210`, the next is not `$124,860.40`.
- No italic for emphasis.

## 6. Layout

- Keep the sections and their order. Inside a section, alignment and proportions may change when that makes the screen clearer.
- Apps and dashboards keep real app proportions. The shell fills the viewport, a sidebar of 240 to 280 and fluid content, usually capped around 1440 to 1600 wide, and the page is as long as its content, with more sections below the first screen. Never shrink an app into a narrow centered column. If the original was drawn as a small window on a backdrop, keep it visibly a window, with its frame and backdrop, and still give it desktop proportions inside.
- The strongest landing hero is a scene. One generated image fills the hero from edge to edge, its subject sits on one side, and the headline sits on the calm empty part of the same image, with the product view rising from the bottom edge. Look at the hero in the references to see it.
- Without a scene, use an asymmetric split, text on one side and the visual given at least half the width, or text over a large product view below it. Everything stacked and centered is the template default, keep it only for a short hero with no visual.
- In a scene hero, the text block sits in the upper part, in the space between the navigation and the top of the product view, at its optical center, a little above the true middle.
- In a split, center the text block vertically against the visual, so neither side leaves a big empty corner. If the visual is much taller, shorten it instead of pushing the text down. Floating cards and devices next to the text are hard to balance, prefer one solid visual. The spacing token from the navigation to the headline applies to stacked heroes, a split hero is centered instead.
- Long headlines align left. Centered text works for one or two short lines.
- One primary action and at most one secondary action next to it. Anything else moves out of the hero.
- Navigation stays quiet. Logo, the existing links, one button. Log in is a quiet text link next to it, not a second button. A floating pill header is not required. On small screens the links collapse into one menu button.
- Compose the first screen as a whole. The hero fills the viewport height without a dead empty band. If the content is shorter, center it or let the product view start low and run past the bottom edge, so the page invites a scroll.
- On small screens everything stacks in reading order, the headline drops to the mobile size from the tokens and the visual comes after the actions. A dense preview gets simpler on mobile, with fewer rows and columns, instead of being zoomed down. No text in it goes below 11px.

## 7. Details

- Nested radius. An inner radius equals the outer radius minus the padding between them, never less than 4. Controls 8 to 10, cards 12 to 16, panels 14 to 20. Not everything is a pill.
- Counts and meta become quiet text, often mono and muted, instead of glowing pills.
- Keyboard shortcuts become small keycaps.
- Charts sit on a muted grid with muted mono labels. No rainbow bars inside one series, no glowing bars, no uppercase day labels. If the chart is placeholder noise, replace it with data that tells something real.
- Charts have a hierarchy, like text. One main chart is clearly the biggest thing on the screen, drawn with care, like smooth lines or a mirrored comparison. Anything else that shows data is smaller and different in kind, like a ranked list with thin bars or a short table, never a second chart of the same size.
- One accent per chart. The thing that matters, like the current month, the line you are tracking or the plan that grew, gets the accent, and everything else sits in neutral steps of the ramp. Several hues only when the chart really has to tell series apart, and even then one leads and the rest are quiet.
- Stat cards are numbers. A label, a big figure and a change with what it compares to. No sparklines, tallies, mini bars or icons added to fill them, they read as decoration. A card can hold a real looking object when it is the very thing its number counts, like a paid receipt next to paid revenue or bank cards next to spend. Use as many as make sense for that dashboard, as long as each one reads on its own and none of them is a mini chart.
- Vary the sizes. Cards of equal width side by side, each with the same kind of content, read as a template. Give the grid a rhythm, like three or four compact stats in a row above one wide chart, or a wide chart next to a narrow list.
- Pick the chart type for the data. A trend is a line, a comparison is bars, a share is one stacked bar or a list with bars, a single goal is a progress bar.
- The active state is a small surface step with a hairline highlight, not a gradient with a glow.
- Hover and focus states exist and stay inside the palette. A visible focus ring for keyboard users.
- The logo is the product name in the main family, plus a simple mark if there is one. No gradient wordmark and no sparkle tile.
- The signature detail from the direction appears where it belongs and nowhere else.

## 8. Visuals

- Decorative filler goes. Glossy blobs, orbs, nebulas, floating cubes, glowing grids, holographic brains and robots say nothing about the product.
- A landing hero gets a visual that shows something true.
- Dashboards and app screens almost never need generated images. Their moments come from the product itself: a chart drawn with care, figures set beautifully, real content like product photos or avatars, a status that feels alive. A physical thing the product deals with, like a payment card in a finance app, is usually better built in code with real materials, a soft gradient, a chip, a number.
- Generate images for an app only for empty states, onboarding and marketing moments, or when the user asks for it.
- With an image generation tool, the first choice for a landing hero is a scene from the world in the direction, generated wide enough to sit behind the whole hero, with calm empty space where the text goes. It carries the color and the mood, and the chrome stays quiet over it.
- Under the scene, or as the visual when there is no tool, show the product. Build a preview in code of what the page already promises, with the project's components or careful HTML and plausible data, like the main screen, one key card or the result the product produces. Showing what the copy already claims is not inventing a feature. In a scene hero it rises from the bottom edge and runs past it.
- The product view carries a moment, not just a plain card. A rendered object inside it, like a payment card on a figure, a rich chart or a small object from the world. These are kinds of objects, so using one that fits is fine.
- Before this pass, look at the references in [references/refs.md](references/refs.md). Take qualities from them, like composition, light, restraint and how the moment is placed, never their subject or layout.
- Rendered objects and scenes come from an image generation tool when you have one. If you do not, build what you can in code, write the prompts for the rest and leave empty slots of the right size.
- How to pick the subject, the prompt recipe and how to place the image are in [references/visuals.md](references/visuals.md). Read it before this pass.

## 9. Motion

- Remove motion that loops for no reason, like `animate-pulse` or `animate-ping` on things that are not live, shimmer on headings, breathing glows, floating elements and parallax.
- Remove `transition-all`, bouncy springs, `hover:scale` on cards and anything that moves more than a few pixels on hover.
- Keep motion that explains something. A hover is a quick color or surface change, a press is a tiny scale down, a menu fades and rises a few pixels from where it opens, a changed number tweens.
- Transition color, background, border, opacity and transform, and name them, like `transition-colors` or `transition-[transform,opacity]` in Tailwind, instead of a catch all. Never animate width, height, top, left, margins or large blurs, they stutter on weak devices.
- One easing curve and a few durations across the screen, from the tokens. Short for feedback, a little longer for things that enter.
- At most one entrance on load, a short fade and rise for the main content with a small stagger. Not every card flying in from a different side.
