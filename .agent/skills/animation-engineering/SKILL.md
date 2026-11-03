---
name: animation-engineering
description: Complete animation engineering pipeline for building high-fidelity animations, micro-interactions, gestures, and transitions across Web and Mobile. Covers web motion (CSS, WAAPI, Motion/Framer Motion, layout transitions, exit choreography) and mobile native motion in React Native and Expo (Reanimated 3, Gesture Handler, Expo Router transitions, expo-haptics, sheet dismissals). Use whenever asked to animate a UI component, build fluid transitions, implement physics springs, wire gesture-driven interactions, or fix stuttering motion.
---

# Animation Engineering

Unified animation engineering engine for web and native mobile environments.

## When to Use & Platform Routing

Evaluate the target platform and stack before writing code, then load the appropriate reference:

1. **Web Animations (React, Next.js, HTML/CSS, Vanilla JS)**
   - **Scope:** Web micro-interactions, popover enter/exits, layout animations (layoutId), staggered lists, page transitions, CSS vs WAAPI vs Motion/Framer Motion decisions.
   - **Reference File:** Read [web.md](references/web.md) for decision hierarchy, property rules, curves, and interruptibility.
   - **Code Recipes:** Read [recipes-web.md](references/recipes-web.md) for copy-paste implementation recipes.

2. **React Native & Expo Animations (iOS, Android)**
   - **Scope:** UI thread worklet execution, Reanimated 3 (useAnimatedStyle, withSpring, withTiming), Gesture Handler pan/pinch/swipe, Expo Router screen transitions, expo-haptics tactile feedback, and draggable bottom sheets.
   - **Reference File:** Read [react-native.md](references/react-native.md) for worklet thread rules, gesture handoffs, spring configs, and device degradation.
   - **Code Recipes:** Read [recipes-expo.md](references/recipes-expo.md) for production React Native recipes.

## Universal Motion Invariants
1. **Purpose First:** Every animation must justify its existence. It must orient the user, express spatial hierarchy, or provide direct physical feedback.
2. **Composite-Only Properties:** Only animate 	ransform (scale, translate, rotate) and opacity. Never animate width, height, 	op, margin, or padding.
3. **Interruptibility:** Running animations must gracefully redirect to new target states without jumping or freezing.
4. **Physical Springs:** Prefer under-damped or critically-damped spring physics over linear or mechanical easing curves.
5. **Reduced Motion:** Always respect prefers-reduced-motion on web and accessibility motion reduction settings in native apps.
