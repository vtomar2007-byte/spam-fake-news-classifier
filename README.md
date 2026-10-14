# Clearcheck

Clearcheck is a small, browser-based app for reviewing suspicious messages and news excerpts.

## Run it

Open [`outputs/index.html`](outputs/index.html) in a modern browser. It uses plain HTML, CSS, and JavaScript and does not need a build step, server, or API key.

## What it checks

- **Spam message:** looks for common pressure tactics, suspicious links, requests for sensitive information, and unusual payment requests.
- **News or claim:** looks for sensational language, urgent sharing prompts, missing attribution, and source links in the pasted text.

The checks run in the browser. Text is not sent to a server. Scores are transparent text-pattern clues, not proof: Clearcheck does not browse the web, verify senders or publishers, or determine whether a claim is true.

## Files

- `outputs/index.html` — app structure
- `outputs/styles.css` — responsive styling
- `outputs/app.js` — local pattern checks and interactions

