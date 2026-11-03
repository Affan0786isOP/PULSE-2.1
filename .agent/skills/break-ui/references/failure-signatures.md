# UI Failure Signatures & Truncation Guide

#### Failure signatures

Each of these appears in the screenshot. The cause in the right column is almost always it.

| What you see | Cause | Fix |
| --- | --- | --- |
| Avatar or icon squished into an oval or pill | Flex child shrinking | `flex-shrink: 0` on the avatar, icon, and any fixed-size box |
| Text overflows its box instead of wrapping or truncating | Flex/grid child has `min-width: auto` | `min-width: 0` on the text column (`minmax(0, 1fr)` in grid) |
| Email or URL runs past the edge | No break opportunities in the string | `overflow-wrap: anywhere` on that element |
| Trailing action (••• menu, button) pushed off-screen or clipped | Middle content took all the space | `min-width: 0` on the middle, `flex-shrink: 0` on the action |
| Badge wraps onto two lines | Badge allowed to shrink | `white-space: nowrap; flex-shrink: 0` on the badge, and decide what yields instead |
| Avatar centered against a three-line name looks adrift | `align-items: center` on rows of varying height | Top-align (`align-items: flex-start`) once text can wrap, |
| Last row cut off at a hard edge mid-glyph | Fixed-height container with no fade or scroll affordance | Visible scrollbar or a fade mask, and ensure `overflow` is intended |
| Long word breaks mid-word in a heading | `word-break: break-all` | `overflow-wrap: anywhere` breaks only when it has to |
| Wrong initials (`"J"` for "Jo", `"CI"` for "… Montgomery III", `"�"` for an emoji-first name) | `.split(' ')[0][0]` style code | Initials from grapheme clusters (`Intl.Segmenter`), first + last word, fallback icon |
| Orphaned `—` or empty line where the role was | Placeholder rendered for a missing optional field | Omit the line, or reserve its height intentionally |
| "1 members", "0 member" | Hardcoded plural | `Intl.PluralRules`, or separate strings per count |
| Numbers jitter when they update, columns misalign | Proportional figures | `font-variant-numeric: tabular-nums` |
| `1284`, `1,284.000000001`, `NaN`, `undefined` | Raw number rendered | `Intl.NumberFormat` with the user's locale; guard null |
| Long translated button label overflows | Fixed-width button | Width from content with `min-width`, never a fixed `width` |
| Diacritics or tall scripts (Vietnamese, Thai) clipped top or bottom | Tight `line-height` with `overflow: hidden` | Looser `line-height` or no clipping on text boxes |
| Broken-image icon in the avatar | No `onError` fallback | Fall back to initials; `object-fit: cover` for any aspect ratio |
| Truncated text with no way to read it | `text-overflow: ellipsis` and nothing else | `title` attribute or a tooltip, and the full value elsewhere (detail view) |
| Scrolling 1,000 rows stutters | Every row rendered | Virtualize, or paginate, and say which |
| Content renders raw `<b>`, `&amp;`, or `**text**` | Wrong escaping layer | Escape once, at render; never `dangerouslySetInnerHTML` user data |

#### Truncate, wrap, or clamp

Every long string forces this choice. Make it per field, not globally:

- **Wrap** text the user needs in full to identify something: names, titles in a detail view. Two lines is usually fine; four is a sign the column is too narrow.
- **Truncate at the end** for secondary metadata where the start carries the meaning: role, description, last message preview. Always pair with a way to see the full value.
- **Truncate in the middle** when items differ at the *end*: file names (`Q3-report…v12-final.pdf`), emails sharing a long domain, paths, hashes. End-truncation makes them identical.
- **Clamp** (`line-clamp: 2`) for multi-line previews in cards, so card heights stay predictable.
- **Never truncate** numbers, amounts, dates, or anything the user compares. Give them the room.

**Completion criterion:** every catalog row that applies has been tried, every width and environment above has been checked, and every break has a signature, a cause, and a fix.

### Phase 5 — Report and stop

Present the findings in the format below, leave the toggle running, and stop. The user flips the toggle, looks, and decides.

### Phase 6 — Fix on request

When the user says which to fix, apply those fixes in the component, using the project's existing conventions and tokens. Then flip the toggle through every state again (Demo too: a fix for the worst case must not regress the demo) and confirm each fixed break is gone.

Keep the worst-case fixture afterward unless the user says otherwise. It's the regression test for the next time someone touches the component. The toggle stays dev-only either way.
