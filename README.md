# TikTok Live AutoLiker

TikTok Live AutoLiker is a maintained fork of [TikTok Live Liker](https://github.com/AmpedWasTaken/TikTok-Live-Liker), the original userscript by Amped (AmpedWasTaken). It automates likes on TikTok live streams through a Tampermonkey control panel.

![Version](https://img.shields.io/badge/version-0.2.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Current Status

- **Version:** 0.2.1 (see [`VERSION`](./VERSION))
- **Maintainer:** joqtan
- **Original project:** [AmpedWasTaken/TikTok-Live-Liker](https://github.com/AmpedWasTaken/TikTok-Live-Liker)
- **License:** MIT

This fork keeps the original project's attribution and license while maintaining its current implementation and build structure.

## Features

- Automatic liking on TikTok live stream pages.
- Like-button detection using TikTok's `data-e2e="room-chat-like-btn"` anchor, with legacy class-based fallbacks.
- Six modes: Normal, Turbo, Stealth, Human, Combo, and Custom.
- Human Mode uses irregular delays, occasional double-taps, and short pauses instead of a fixed interval.
- Combo Mode sends short bursts of clicks for combo-focused use.
- Custom Mode provides minimum and maximum delay sliders, shown only while Custom Mode is active.
- Draggable, collapsible control panel with a dark theme.
- Panel position, collapsed state, and Custom Mode delay settings persisted in browser `localStorage`.
- Live statistics for runtime, total clicks, success rate, current and maximum combo, completed combos, and clicks per second.
- Keyboard shortcuts: `L` toggles the auto-liker and `Shift+M` cycles through modes; bare `M` remains available to TikTok for stream mute.
- Notifications for status changes, mode changes, and combo events.

## Installation

1. Install [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/), or [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd).
2. Open the generated [`tiktok_live_autoliker.user.js`](./tiktok_live_autoliker.user.js) file, or install the userscript from the fork's GitHub repository when it is published there.
3. Confirm the installation in Tampermonkey.
4. Open a TikTok live stream. The control panel appears automatically when the page path includes `/live`.

The final artifact is a single installable userscript. It includes the ordered source modules and can be installed directly in Tampermonkey without additional runtime dependencies.

## Usage

1. Open a TikTok live stream in a supported desktop browser.
2. Click **Start Auto-Liker** to begin and **Stop Auto-Liker** to stop.
3. Click the mode button to cycle through the available modes.
4. Select **Custom Mode** to reveal the minimum and maximum delay sliders. Values are stored automatically in the browser and constrained to `10–2000 ms` with the minimum never exceeding the maximum.
5. Drag the panel by its header or collapse it with the arrow control. The panel remembers those settings in the browser.
6. Press `L` to toggle the auto-liker or `Shift+M` to switch modes when focus is not in a text input or textarea. Bare `M` remains available to TikTok for stream mute.

The script only starts its liking loop after a visible like button is detected. Results can vary when TikTok changes its live-stream markup, browser behavior, or rate limits.

## Development

The `src/` directory contains the userscript modules in execution order:

- `header.js` contains the Tampermonkey metadata.
- `01-credits.js` through `08-bootstrap.js` contain credits, configuration, detection, click handling, statistics, UI, and initialization logic.

Run the build script from the repository root:

```sh
node tools/build.js
```

This generates `tiktok_live_autoliker.user.js`, the single userscript artifact used for installation. After a build, validate its JavaScript syntax with:

```sh
node --check tiktok_live_autoliker.user.js
```

## Responsible Use

This project is provided for educational purposes. Automated interaction may be restricted by TikTok's Terms of Service or other platform rules. Review and follow the applicable terms, use the script responsibly, and understand that use is at your own risk.

## Credits and License

This fork is maintained by **joqtan** and is based on the original work by **Amped / AmpedWasTaken** in [TikTok-Live-Liker](https://github.com/AmpedWasTaken/TikTok-Live-Liker). The original project and this fork are distributed under the MIT License.
