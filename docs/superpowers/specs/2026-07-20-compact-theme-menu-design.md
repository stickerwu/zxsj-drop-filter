# Compact Theme Menu Design

## Goal

Make the toolbar theme dropdown visually quieter and more compact without
changing its three existing modes or theme persistence behavior.

## Scope

- Keep the existing HeroUI `Dropdown` implementation.
- Keep the `light`, `dark`, and `system` theme modes.
- Keep the current toolbar trigger icon and accessible label.
- Change only the dropdown popover and menu-item presentation.

## Visual Design

- Use a compact popover 128px wide.
- Use a 6px outer radius with a restrained border and soft shadow.
- Reduce popover padding and keep all three options in one uninterrupted list.
- Set each option to 34px tall.
- Use 14px mode icons with muted default color.
- Keep default and selected rows transparent.
- Show a very light background only while hovering or focusing an option.
- Indicate the active mode only with a small accent-colored check icon on the
  right.
- Do not add separators, descriptions, badges, or large selected backgrounds.

## Interaction

- Opening and closing behavior remains controlled by HeroUI.
- Selecting an option immediately calls `setMode`.
- Keyboard focus remains visible.
- The selected option remains discoverable through the check icon and existing
  menu semantics.
- The menu remains aligned to the bottom-right of the toolbar trigger.

## Testing

- Verify the menu still exposes all three theme options.
- Verify the active option exposes the compact selected indicator.
- Verify selecting a different option updates the stored theme mode.
- Run the full test suite, lint, frontend build, and Rust check.

## Non-Goals

- No changes to theme colors or application-wide tokens.
- No new theme modes.
- No replacement of HeroUI with a custom popover.
- No changes to the toolbar layout outside the theme control.
