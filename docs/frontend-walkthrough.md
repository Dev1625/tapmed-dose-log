# Build the package-to-dose interaction

This walkthrough follows one click through TapMed's browser demo. You'll trace a package link into a dialog, inspect the saved event, then add a fourth sample dose. The demo uses fictional entries and a URL fragment to simulate an NFC tag.

## 1. Run the demo

From the repo root, use Node.js 20 or newer:

```sh
node server.mjs
```

Open <http://127.0.0.1:4173> in Chrome or Edge. Use this URL during the walkthrough so the browser can load the JavaScript modules and register the service worker.

## 2. Follow a click from HTML into JavaScript

1. In [index.html](../index.html), find `tap-button`. It's an anchor with `href="#tap=afternoon"`. A normal link click changes the fragment after `#` without fetching a different HTML page.
2. In [app.js](../app.js), find `openTap()` and the `hashchange` listener. `openTap()` passes `location.hash` to `tapDose()` in [log.js](../log.js). `tapDose()` parses the `tap` value and looks up a known dose ID.
3. Click **Simulate a package tap**. The dialog should say **Afternoon capsule** and **Package tap**. `openTap()` removes the fragment with `history.replaceState()` after recognizing the dose, so a reload doesn't open the same dialog again.
4. Try loading <http://127.0.0.1:4173/#tap=evening> directly. The startup call to `openTap()` opens the evening dose. `#tap=unknown` should leave the dose dialog closed.

The HTML defines the dialog and two row templates. `drawDose()` and `drawEvent()` in `app.js` clone the templates and fill in the labels with `textContent`. This keeps labels and correction notes as text even when they contain punctuation or markup characters.

## 3. Inspect events and the rendered state

1. Open the afternoon dose through the package link and choose **Mark taken**. Open **Correct** on that row, add a sample note, then choose **Mark skipped**.
2. Check the dose row and Activity. The row should say **Skipped**. Activity should show the original **Taken** entry and the separate **Taken → Skipped** correction.
3. In DevTools, open **Application → Local Storage** and select the local app origin. Find the keys starting with `tapmed-dose-log:`. Each action saves its own JSON event with `id`, `dose`, `status`, `source`, `note`, `day`, and `at`.
4. Reload. Check that the current status and both events remain. `buildLog()` sorts the events and applies each one to its date and dose. `render()` uses the resulting status for the schedule and the full event history for Activity.

Repeat a log with the keyboard. Tab to the package link, press Enter, then use Tab to reach a status button. After you record a status from the package link, focus should return to that link. The markup gives the dialog a title and description, and `app.js` announces the saved status through the `role="status"` region.

## 4. Tell apart cached files and saved entries

Let the page show **Offline ready**. In DevTools, **Application → Cache Storage** should list `tapmed-dose-log-shell-v1` with the HTML, CSS, and two JavaScript module files. [sw.js](../sw.js) caches those files during installation.

In **Network**, switch throttling to **Offline** and reload normally. The page should open and still let you log a sample entry. Reload again and find that entry in Activity. The worker served the cached files and `localStorage` held your events. Switch back online before starting the exercise.

While editing, the cache may keep serving the previous files. In **Application**, unregister the worker under **Service workers**, delete `tapmed-dose-log-shell-v1` under **Cache Storage**, and reload online. Leave Local Storage alone if you want to keep the sample events. [Chrome DevTools Application panel guide](https://developer.chrome.com/docs/devtools/application/)

## 5. Exercise: add another sample dose

1. Append this object to `doses` in `log.js`.

   ```js
   { id: "bedtime", name: "Bedtime sample", time: "10:00 PM", slot: "Bedtime" },
   ```

2. Change the package link to `href="#tap=bedtime"` in `index.html`. The lookup already handles any ID in the `doses` array.
3. In `render()` in `app.js`, set `$("progress").max = today.length` before the line that sets its `.value`. The count text already reads `today.length`. Updating the maximum keeps the visual and announced progress in step with the count.
4. Reload with the updated files. Check that the package link opens **Bedtime sample**, the count is out of four, and a saved entry survives reload. Run `node --test` from the repo root. Add an assertion to the existing `tapDose()` test in [log.test.js](../log.test.js) that `tapDose("#tap=bedtime").id` is `"bedtime"`.
