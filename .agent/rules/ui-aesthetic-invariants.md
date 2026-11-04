# UI/UX Aesthetic & Design Invariants

## 1. Minimalist Information Hierarchy (Anti-Pill / Anti-Clutter)
- **Eliminate Pill & Badge Overuse:** Avoid enclosing small metadata, categories, or evidence markers in rounded chip/pill containers with solid or pastel backgrounds. Use clean typography, muted monospace labels, or compact inline text.
- **Indicators over Bulky Tags:** When status or sentiment must be indicated, prefer subtle color dots or border accents over full pill tags.

## 2. Card Framing & Semantic Color Accents
- **No Full-Fill Floods:** Do not flood entire card surfaces with colored fills (e.g., solid green or red card bodies) unless expressly requested.
- **Prominent Perimeter Borders:** Express categorical or status differences through crisp perimeter borders (e.g. `border-2 border-rose-400/80` or `border-emerald-400/80`) on neutral, theme-consistent surface cards (`bg-white dark:bg-[#12161B]`).

## 3. Floating Navigation & Aside Panels
- **Containerless Floating Sidebars:** Sticky navigation elements and anchor lists should float freely on the layout canvas without enclosing card frames, heavy borders, or background slabs (`bg-transparent border-none shadow-none`).
- **Theme Background Parity:** Ensure sidebars and floating elements are clean and transparent in both light and dark modes. Avoid asymmetric background boxes appearing in dark mode.
- **Sleek Active States:** Active navigation links use minimal indicators (e.g., left accent border `border-l-2`, active font weight, and subtle accent text color) rather than heavy background fills.

## 4. Scroll Tracking Invariants
- In scroll-spy implementations, ensure the scroll listener or observer tracks against the actual scrolling viewport (`window` / `root: null`), never an inner non-scrolling DOM wrapper.
