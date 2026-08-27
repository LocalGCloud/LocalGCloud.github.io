# Compact Homepage Command Rows Design

**Date:** 2026-08-27  
**Status:** Approved  
**Primary target:** `src/components/InstallationMethods.astro`  
**Route:** `/`

## Purpose

Reduce the visual dominance of the homepage quick-start commands. The current full-width black code blocks occupy more space and contrast than their supporting role requires.

## Goals

1. Apply one compact visual treatment to all three quick-start command boxes.
2. Shrink-wrap each command row to its content on wider screens without exceeding its container.
3. Replace the black terminal surface with a quiet light utility treatment.
4. Preserve command readability, copy behavior, installation tabs, analytics, and keyboard access.
5. Keep long and multiline commands usable on narrow screens.

## Non-goals

- Changing command text, installation channels, workflow copy, or step order.
- Redesigning the surrounding quick-start panel.
- Creating a new shared component or changing command boxes outside the homepage.
- Changing product colors or typography globally.

## Design Direction

Use the selected **Inline Command Row** treatment consistently across all three steps:

- Pale blue-gray surface instead of black.
- Subtle cool-gray border and compact corner radius.
- Dark monospace command text.
- Tight vertical and horizontal padding.
- A quiet white-and-blue copy control inset at the right edge.
- Minimal or no shadow so the commands read as utilities rather than hero elements.

The installation script and Homebrew tabs remain above the first command. Their behavior and labels do not change.

## Layout and Responsive Behavior

Each `.installation-methods__command` shrink-wraps to the intrinsic width of its command while retaining `max-width: 100%`. The nested code block follows that width rather than filling the step column.

Multiline commands retain their authored line breaks and grow vertically. On narrow screens, the command row may use the available width, while the code area retains horizontal scrolling for any content that cannot fit. Space remains reserved for the copy control so it does not cover command text.

## Accessibility and Interaction

- Preserve the existing focusable code blocks and accessible labels.
- Preserve `CopyButton` behavior, copied-state feedback, and analytics labels.
- Maintain visible focus styles and sufficient text, border, and control contrast.
- Keep the copy control reachable and operable by keyboard.
- Do not truncate or visually replace the command text.

## Implementation Boundary

Make the change in the scoped styles of `InstallationMethods.astro`. Reuse the existing markup, `CodeTabs`, and `CopyButton`; no new component or client-side behavior is needed.

## Verification

Exercise the real homepage at desktop and mobile viewport widths and verify:

1. All three command rows use the compact light treatment.
2. Rows no longer span the content column unnecessarily on desktop.
3. Multiline commands retain their line breaks and remain readable.
4. Install-script and Homebrew tabs still switch commands correctly.
5. Every copy control copies the full command and exposes its feedback state.
6. Keyboard focus remains visible and no page-level horizontal overflow is introduced.
