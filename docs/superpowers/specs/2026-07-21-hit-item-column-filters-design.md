# Hit Item Column Filters Design

## Goal

Add local multi-select filters to the Treasure and Slot columns of the Hit Items table only.

## Interaction

- Add a compact filter icon beside the Treasure and Slot header labels.
- Clicking an icon opens a themed HeroUI multi-select dropdown.
- Options come from the currently available hit-item rows and use deterministic Chinese sorting.
- No selection means all values are shown.
- Treasure and Slot filters combine with AND logic.
- An active filter uses the application accent color and shows the selected count.
- Each dropdown provides a clear action.
- Filtering does not modify the global sidebar filters, recommendation ranking, dungeon detail table, or detail panel selection state.
- Local filters remain while switching result tabs and reset when the Hit Items table is remounted.

## Empty State

- No global hit rows: `当前条件没有命中装备。`
- Rows exist but local column filters remove them all: `当前列筛选没有命中装备。`

## Release

- Publish as `v0.5.4`.
- Update npm, Tauri, Cargo, and changelog metadata.
- Push `main` and `v0.5.4` to GitHub and Gitee.

