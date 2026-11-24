# TapMed dose log

A small browser demo of TapMed's package-to-dose flow. A link from a simulated NFC tag opens the right dose. You can log it, correct it later, and see both entries in Activity.

## Try it

[Open the live demo](https://dev1625.github.io/tapmed-dose-log/) or run it locally.

Use Node.js 20 or newer. The app has no runtime dependencies.

```sh
node server.mjs
```

1. Open <http://127.0.0.1:4173> and click **Simulate a package tap**.
2. Mark the afternoon capsule taken. Open **Correct**, add a sample note, and mark it skipped to see the change in Activity.
3. Wait for **Offline ready**, switch your browser offline, and reload. Add another entry and reload again to check that it stayed on the device.

Appending `#tap=morning`, `#tap=afternoon`, or `#tap=evening` to the app URL simulates a different package tag.

## Frontend walkthrough

[Trace an NFC tap and add a new dose](docs/frontend-walkthrough.md). The guide covers JavaScript events, browser storage, and offline caching.

## How it works

- `app.js` handles the vanilla JavaScript UI and writes each event under its own browser storage key.
- `log.js` reads the tag link and folds the event history into the current schedule. Correcting a dose appends an event, so the original status stays visible.
- `sw.js` caches the UI and scripts on the first online visit. This works at localhost or on an HTTPS static host.

```sh
node --test
```

The tests cover tag routing, corrections, status resets, local-day rollover, damaged saved entries, and the offline cache under a project URL.

## Scope

This is a public demo built with AI assistance and sample doses. The tag is simulated with a URL. Browser storage keeps the log on one device, and clearing site data removes it. The demo has no account, server-side storage, or sync. Use sample text when trying the correction notes.
