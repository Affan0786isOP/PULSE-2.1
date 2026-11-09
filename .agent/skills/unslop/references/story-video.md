# Story Video Walkthrough & Script

## Story video

A short video where the screen unslops itself step by step, with red redlines on the slop. Look at [refs/story-dashboard-frames.webp](references/refs/story-dashboard-frames.webp) before you build it, eight frames from it in order. That video went viral, and this is how it works:

- **Nothing is swapped, everything morphs.** One page, and each step only changes CSS, so padding, gaps, sizes, colors, radii and shadows tween from the old value to the new one in place. You see the spacing open up, the purple drain out, the corners soften.
- **A wave.** Elements start a few dozen milliseconds apart from the top left down, so a change runs across the screen instead of everything flipping at once.
- **Text rolls.** Copy that changes blurs out, and the new words rise in letter by letter.
- **Redlines first.** The slop gets red selection boxes with tags, a spacing step shows red measurements that turn white once fixed, a details step outlines corners with their radius.
- **Close and short.** Square, cropped close on the part that changes most, so it reads on a phone, and about 10 seconds.

It adds a few minutes, so make it only when the user wants it.

1. **One story file.** Build `unslop-story/story.html`, a standalone copy of the original screen with its styles in the file. Keep the original rules as they are, they are step 0.
2. **Steps.** Three to five, merging passes so each one changes something you can see, like `Spacing`, `Color and icons`, `Type and copy`, `Details`. A new chart or visual goes into the last step. List them in the head as `<meta name="unslop-steps" content="Spacing, Color and icons, Type and copy, Details">`. A name containing Spacing shows spacing measurements, one containing Details shows corner outlines.
3. **Each step is CSS on top.** Write the changes of step 1 under `.s1`, step 2 under `.s2` and so on, like `.s1 .card { padding: 24px }` or `.s2 body { background-color: #141415 }`. The classes add up, so step 3 still has the rules of steps 1 and 2. Change values, never structure, so the browser can tween them.
4. **What cannot tween, and how to handle it.**
   - Gradients, glows and washes: put them on their own layer and fade its `opacity` to 0, with the solid color underneath changing. Gradient text goes on the `.from` span only, never on the swap or its parent, because a text clip also catches the hidden new text.
   - Pills: write their radius as half the height, like `23px`, not `9999px`, or the corner only changes in the last frame.
   - Use swaps sparingly, only where the words change, at most eight in a story. Twenty swaps blurring at once read as a cut between two pictures, which is exactly what the video must not look like. Weight, size, tracking and color changes tween on their own, so they never need a swap. A new font family switches directly in its step, without swaps.
   - Text that changes, a new font family, an emoji that becomes an icon: `<span class="swap" data-at="3"><span class="from">Welcome back, Damir! 👋</span><span class="to">October 2026</span></span>`. At step 3 the old part blurs out and the new one rolls in.
   - Emoji that become icons: put the new icon next to the emoji inside the same box, both absolutely stacked, and crossfade their `opacity` in the step. That is not a swap and does not count toward the limit.
   - Things that disappear, like a `New ✨` badge: `data-out="2"` collapses them at step 2.
   - Things that appear, like a legend: `data-in="4"` fades them in at step 4. Reserve their space so nothing jumps.
5. **Redlines.** The measurements follow the elements live, so their numbers count from the old value to the new one while things move. That is the moment people watch, so choose them well.
   - `data-gap` goes on the blocks of a vertical stack, like the brand row, the search, the navigation group and the plans group in a sidebar, or the headline, the stat row and the chart in the main column. Not on every row, or the screen fills with tiny 2px tags. Aim for four to six measured gaps per stack, and give each stack its own name if there is more than one, like `data-gap="sidebar"` and `data-gap="main"`.
   - `data-radius` goes on two to four buttons and cards whose corners change.
   - `data-slop="Gradient text"` and so on marks the slop for a short first beat, at most five, on the clearest examples that sit apart from each other, with short tags. It is optional, the reference video has none.
6. **Only the screen and its background.** The video shows the story page as it is, with no extra window, border or shadow around it, so the page's own background fills the frame and the screen is the only box. If the screen sits in a window that grows to desktop proportions, anchor it to the left in the story so it widens to the right instead of gliding sideways. The story page renders 1440 wide and at least 900 tall, so do not size things from `100vh`, and keep `position: fixed` for background layers only.
7. **Camera.** `<meta name="unslop-frame" content="0 0 960">` sets which part of the page fills the frame, as x, y and width in page pixels. Point x and y at the screen's own top left corner, so the frame starts with the page background around it, and crop close on where the most visible change happens, usually the sidebar or headline and the first cards.
8. **Render.** `node <skill folder>/scripts/story.mjs unslop-story/story.html unslop-story.mp4`, square by default, `--wide` for 16:9. It needs Playwright and ffmpeg, so if either is missing, tell the user the one command that installs it. To watch it live first, run it with `--play` instead of the output path, and it loops in a browser window until closed. Pull a few frames with ffmpeg and look at them before you hand it over. Checking the story file and the video does not count toward the render limit of a run.
9. **The story file is a presentation piece.** The clean result still ships as normal code in the project's own stack, without `.s` classes or story attributes. Every video carries a small `unslop by @heydamir` credit, as the license asks.
