# Inventory Scan Modal Compact Layout Design

## Goal

Refine the inventory scan review modal so its controls align with the annotated reference: the manual-add action sits at the far right of the inventory tabs, the header and footer are shorter, and unnecessary horizontal divider lines are removed.

## Layout

- Keep the modal's existing fixed three-column body and responsive outer dimensions.
- Reduce the header from 76px to 60px.
- Keep the scan icon, title, description, session chip, and close action on one compact horizontal row.
- Keep the inventory tabs in the center workspace toolbar and place the manual-add button at the far right edge.
- Reduce the tabs toolbar from 64px to 52px.
- Reduce the footer from 62px to 50px.
- Remove the header bottom border, tabs toolbar bottom border, and footer top border.
- Preserve separation through surface colors, body padding, and the existing body-card shadow.

## Behavior

- Manual add continues to add an item to the currently selected tab.
- Tab switching, scanning, completeness validation, cancel, and apply behavior remain unchanged.
- Existing HeroUI Modal, Tabs, Button, Chip, and other controls remain in use.

## Verification

- Add a component regression test for the compact header/footer, divider removal, and right-aligned manual-add action.
- Run the complete frontend test suite, lint, production build, Rust checks, and release validation.
- Check the modal at the running Tauri dev viewport before publishing.

## Release

- Publish as `v0.5.3`.
- Update npm, Tauri, and Cargo version metadata plus `CHANGELOG.md`.
- Push commit and tag to GitHub and Gitee over SSH.
