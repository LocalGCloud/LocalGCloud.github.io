# Two-Step Homepage Quick Start Design

**Date:** 2026-08-27  
**Status:** Approved  
**Primary target:** `src/components/InstallationMethods.astro`  
**Route:** `/`

## Purpose

Reduce the homepage quick start from three steps to two. The homepage should show the shortest successful path from installing the CLI to starting LocalCloud and opening its console.

## Goals

1. Keep the existing CLI installation step unchanged.
2. Merge the current start and connect steps into one second step.
3. Show only `localcloud start` and `localcloud console` in the merged command row.
4. Preserve the compact inline command-row treatment, copy behavior, keyboard access, and responsive containment.
5. Keep advanced setup and SDK environment guidance in the documentation rather than the homepage quick start.

## Non-goals

- Changing installation commands or channels.
- Changing CLI behavior.
- Removing `localcloud doctor` or `localcloud env` guidance from documentation routes.
- Redesigning the surrounding quick-start panel.
- Changing command-row styling outside this component.

## Workflow

### Step 1: Install the CLI

Retain the existing title, description, installation-script and Homebrew tabs, commands, copy controls, analytics labels, and accessible labels.

### Step 2: Start LocalCloud and open the console

Replace the current steps 2 and 3 with one step:

- **Title:** Start LocalCloud and open the console
- **Description:** Start the default persistent runtime, then open its console.
- **Command:**

```sh
localcloud start
localcloud console
```

The code block accessible label should describe both actions. Its copy control must copy both commands, including the newline between them.

## Implementation Boundary

Replace the two existing command constants with one merged constant and remove the third workflow list item. Reuse the existing workflow markup, `CopyButton`, and compact command-row styles. No new component or client-side behavior is needed.

## Verification

Exercise the real homepage at desktop and mobile viewport widths and verify:

1. The ordered workflow renders exactly two steps.
2. Step 1 remains unchanged.
3. Step 2 shows the approved title, description, and two-line command.
4. The step 2 copy payload exactly matches `localcloud start\nlocalcloud console`.
5. Both command rows remain compact, responsive, keyboard accessible, and free of page-level horizontal overflow.
