---
name: unslop
description: Turns vibecoded, AI-looking UI into a designed interface with its own character. Finds a direction from the product itself, then fixes spacing, color, icons, copy, type, layout, details, visuals and motion in that order, and can generate a real hero visual with an image tool when one is available. Use when the user asks to unslop, polish, clean up or redesign a screen so it stops looking AI-generated, or when a UI shows the usual tells like purple gradients, glows, gradient text, emoji labels, "New ✨" badges, glossy blobs, uppercase tracked labels, pulsing elements or uneven spacing. Works on React, Tailwind, HTML and CSS, for dashboards, apps and landing pages.
license: CC-BY-4.0
metadata:
  author: Damir Sokolovsky
  x: https://x.com/heydamir
  site: https://heydamir.design/unslop
---

# Unslop

unslop was created by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), who started the Unslopping series on X. It is licensed under CC BY 4.0, so keep this credit in any copy or adaptation.

Vibecoded UI fails in the same predictable ways. Every surface glows, every label has an emoji, spacing is whatever the model typed that day, and the copy shouts. Unslopping fixes the craft and keeps the product. The features, content and order of sections stay. What changes is that every size, color, word and image becomes deliberate.

Removing slop is only half the job. A screen that is clean but could belong to any product is the next template. Every run ends with a screen that only this product could have.

The difference between slop and craft is where the richness goes. Slop spreads color and effects over the chrome, the backgrounds, buttons, borders and labels. Craft keeps the chrome quiet and puts the richness into one or two moments of content that people remember, like a rendered object, a beautiful chart or an image from the product's world.

Work like a designer doing a redline pass, one layer at a time, across the whole screen.

## What good looks like

- **One bright element.** Each screen has one polished thing that carries the color and the craft, a rendered object, a painted scene or a rich chart. Everything around it is quiet, so it reads instantly.
- **Quiet chrome.** Navigation, buttons and text use the tinted neutrals and one accent. Nothing glows, nothing competes with the bright element.
- **A clear idea.** You can say in one sentence what the visual shows and why it belongs to this product.
- **Text on calm space.** The headline sits on a part of the image or layout that was left empty for it, short and specific, with one primary and one secondary action and nothing stacked under them.
- **Real product, real material.** Previews look like the real app with plausible data, and objects look like real things with weight, light and shadow.

Which visual styles tend to work, and which fail, is in [references/visuals.md](references/visuals.md). Finished examples to learn from are in [references/refs.md](references/refs.md), and code treatments like drawing an image in glyphs are in [references/effects.md](references/effects.md).

## Run it

1. **Look at the screen.** Find the files that render it. If you can run the app or open the file in a browser and take a screenshot, do it, so you judge what people see and not only the code.
   - Only a link to a live site, no code? Save the page with `node <skill folder>/scripts/snapshot.mjs <url> unslop/original.html` and work on a copy of that file. A local HTML file works in place of the URL. Add `--dark` or `--light` to match the theme the user sees. It also saves `original.live.png`, a screenshot of the live page, so render the saved copy and compare the two before you start. The script scrolls through the page first, so lazy-loaded sections and images are captured. Animated backgrounds drawn by scripts do not survive, so describe them in the audit from the live page.
   - Only a screenshot? Rebuild the screen as one static HTML file first, matching it closely, and treat that as the original.
   - In both cases the result is a redesigned page in code that the user can hand to whoever owns the real site, so say that in the report.
2. **Audit.** Go through [references/signs.md](references/signs.md) and list every sign you find, one line each with where it lives.
3. **Decide how much to change.** Read the audit honestly before planning anything.
   - **Heavy slop**, many signs across color, type, icons and copy. Run the full process below.
   - **Light slop**, a screen that is mostly designed with a few signs left. Polish mode. Fix only what the audit found, take the direction from the existing brand instead of inventing a new one, and keep the palette, type, layout and visual. Bigger ideas, like a moment that is missing or a scene for the hero, go into the report as suggestions, not changes.
   - **No slop.** Say so plainly and suggest two or three small refinements at most, with exact values. Apply them only if the user agrees, and stop there. Never change a good screen just to make it different.
4. **Set the direction and stop.** Write the five lines described below. Show the audit and the direction to the user and wait for their answer before editing, since changing the direction later means redoing everything. If you have a tool for asking the user questions, ask through it, otherwise ask in plain text and stop. Skip the wait only when the user already said to just do it.
5. **Fix in nine passes, in order.** Finish a pass across the whole screen before starting the next. When nearly every line changes, plan the passes in order and then write the new screen in one go, as long as every pass is applied. Spacing comes first because everything else reads differently once the rhythm is right. Copy comes before type and layout because the length of the headline decides its size and where it sits. Visuals and motion come last because they should fit a screen that already works without them.
6. **Check.** Run the checklist at the end of this file, render again and compare with the audit list. Anything still on the list gets fixed.
7. **Report** the direction, a few lines per pass about what changed, and any image prompt you wrote.
8. **Record, when asked or when the user wants something to share.** Build the story file and render the video described in [Story video](#story-video). If the user asks for it at the start, write each pass into the story file as you go.

Keep a run quick. Render the screen to check it at most three times. When you generate an image, start it right after the direction is confirmed and keep doing the first passes while it runs, instead of waiting for it.

Exact values for every pass live in [references/tokens.md](references/tokens.md).

## Direction

Before touching anything, write five short lines. Derive them from what the page says the product does and who it is for. Never from what is trending.

- **Product.** What it does and for whom, in one plain sentence.
- **Character.** Two or three concrete words, like `calm, exact, a little warm` or `fast, technical, playful`. Words like clean, modern, sleek, minimal and premium are not allowed, because they describe every template.
- **World.** The place or material the product naturally belongs to. A note app lives near paper and ink, a monitoring tool near instruments and night shifts, a travel app near maps and window light. This world sets the tint of the neutrals, the accent and the visual.
- **Moments.** One or two places where the screen gets rich color, material and detail, chosen from what the product shows. A rendered card or device inside the preview, a chart whose colors each mean a series, an object from the world placed next to the content. Write what they are.
- **Signature.** One small detail only this product would have, used consistently. A live status dot for a monitoring tool, keycaps for a developer tool, hand drawn underlines for a teaching app, a route line for a delivery app. One detail, not five.

The examples here only show the shape of an answer. Derive yours from the product in front of you, even when an example happens to fit.

If the product already has a real brand, like a logo file, a color or a typeface that is not slop, keep it and build the direction around it. A violet to blue gradient, sparkles and glow are slop even when they sit in the logo, so they do not count as brand unless the user says they do.

## Specialized Execution References

Follow the 9-layer redline pass across the screen. Load references on demand based on current task:

1. **9-Layer Redline Pass (Steps 1–9)**
   - Detailed specifications for:
     - 1. Spacing (4/8/12/16/24/32/48/64, card paddings, table cells)
     - 2. Color (tinted neutrals, background layering, borders, single accent)
     - 3. Icons (stroke weights, sizing, muted tones)
     - 4. Copy (strip hyping AI adjectives, direct lowercase verbs)
     - 5. Type (2 fonts max, tracking, line heights)
     - 6. Layout (align edges, asymmetric hierarchy)
     - 7. Details (clean borders, subtle shadows, focus rings)
     - 8. Visuals (hero element, prompt formulas for Midjourney/Recraft/DALL-E)
     - 9. Motion (springs, duration limits)
   - **Reference File:** Read [steps.md](references/steps.md).

2. **Tokens, Slop Signs & Effects Reference Library**
   - **Tokens:** CSS variables & Tailwind config values for dark/light themes: [tokens.md](references/tokens.md)
   - **Slop Signs:** Full taxonomy of AI tells (blobs, glows, emoji labels, uppercase tracking): [signs.md](references/signs.md)
   - **Effects:** CSS recipes for subtle borders, inner shadows, and grain: [effects.md](references/effects.md)
   - **Visuals:** Hero generation prompts and direction templates: [visuals.md](references/visuals.md)
   - **Case Studies / Before-After:** Verified before/after visual breakdowns: [refs.md](references/refs.md)

3. **Viral Story Video Walkthrough (Optional)**
   - Morphing CSS step-by-step video script with redline annotations: [story-video.md](references/story-video.md)

## Do not

- Do not rename the product, even when the name has AI in it. Keep a real logo as it is. When the logo itself is slop, like an emoji or a sparkle in a gradient tile, redraw it flat: the wordmark alone in the new type, or a simple glyph from the product's idea in one solid color. Never a glossy or gradient ball, a glow or a gradient tile, those read as AI at first sight.
- Do not change what the product is. Keep its features, content and the order of sections unless the user asks for more. Placeholder content that means nothing may be replaced with content that does.
- Do not replace removed decoration with new decoration, and do not swap one trend for another like glass, grain, noise, neon or bento grids.
- Do not invent features, claims or data.
- Do not fall back to the same look for every product. The direction decides the palette tint, type and visual, not habit.

## Checklist

- [ ] The direction is written and every pass follows it
- [ ] Every spacing value is on the 4px scale and equal things have equal sizes
- [ ] Icons, labels and numbers each sit in one aligned column
- [ ] One tinted neutral ramp, three text roles, one accent with enough contrast
- [ ] No hue gradients, gradient text, glows, colored shadows or color blobs
- [ ] No emoji left in the interface
- [ ] One icon set at one size and stroke
- [ ] Type chosen for the character, weights 400 to 600, no uppercase tracked labels, no italic, no negative tracking on small text
- [ ] No exclamation marks, no trailing periods on short strings, no greeting headline, no unverified claims
- [ ] Numbers in one format with tabular figures
- [ ] Nested radii add up
- [ ] Table row states read apart: header, value in use, selection and keyboard focus are each recognizable
- [ ] Buttons share the control radius, no square corners against the component style
- [ ] A hero has a real visual or a product preview with at least one moment, never filler and never a labeled placeholder
- [ ] The first screen is composed as a whole with no dead empty band
- [ ] No looping or bouncy motion, one easing curve, no animated layout properties
- [ ] Template check. If you swapped the product name for another product's, would the screen still fit? If yes, push the direction harder in the copy, the visual and the signature detail
