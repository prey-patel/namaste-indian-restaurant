# Motion and Interaction Guidelines

This document outlines the animation standards, duration, easing, and accessibility constraints configured for motions and page transitions in **Namaste Indian Restaurant**.

---

## 1. Animation Principles

We believe that motion should add a premium hospitality feel (calm luxury) rather than create distraction.
*   **Calm transitions:** No rapid bounces or cartoonish scale effects.
*   **Purposeful flow:** Transitions guide the user's attention from elements (e.g. menu button click) to containers (e.g. mobile drawer menu slide).
*   **Reduced-motion support:** All animations must immediately disable or fallback to static rendering if the client device requests reduced motion (`prefers-reduced-motion: reduce`).

---

## 2. Speed and Timing

| Transition Type | Duration | Easing (Cubic Bezier) | Description |
| :--- | :--- | :--- | :--- |
| **Hover States** | `0.3s` (`300ms`) | `ease-in-out` | Links color fade, button hover scale offsets. |
| **Page Transitions** | `0.5s` (`500ms`) | `[0.16, 1, 0.3, 1]` | Calm luxury `easeOutExpo` for page fades and upward translate shifts. |
| **Mobile Drawer** | `0.4s` (`400ms`) | Spring (`damping: 25`, `stiffness: 200`) | Fluid elastic slide-out panel transition. |
| **Pulse animations** | `2.0s` (`2000ms`) | `linear` | Pulse glows on active state badges. |

---

## 3. Reduced Motion Guardrail

All framer-motion components must read the client motion preference using the `useReducedMotion()` hook.
When `shouldReduceMotion` is `true`:
- All translations (`y`, `x`) are forced to `0`.
- Transition duration is set to `0` or `0.01ms`.
- Pulse loops are disabled.

This is enforced globally in `app/globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
And programmatically inside [page-transition.tsx](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/components/ui/page-transition.tsx) and [header.tsx](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/components/layout/header.tsx).
