# Kimi AI Frontend Upgrade

## Fixed
- Fixed mobile composer visibility by pinning the composer to the bottom with a fixed layout.
- Added dynamic bottom padding for the chat area so messages stay visible above the composer.
- Added Visual Viewport handling for iOS and Android keyboards so the composer and activity panel stay above the keyboard.

## Upgraded
- Added a collapsible live activity panel above the composer.
- Added animated progress dots for each activity step.
- Added task progress label in the format `Task X/Y` with a mini progress bar.
- Added auto-hide behavior when the panel becomes idle.
- Added mobile-safe floating layout measurements for composer height and panel height.

## Bonus polish
- Added blurred floating composer styling.
- Added dynamic repositioning for the toast and status FAB so they do not overlap the composer.
- Added smoother layout recalculation on resize, focus, keyboard open, and orientation change.
