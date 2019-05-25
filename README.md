# Hearthstash
Store your Hearthstone decks in Git.

Currently with macOS support only, but I'm happy to integrate support
for other environments.

## Prerequisites
Hearthstash requires the following:
- macOS
- Node.js
- [clipboardy](https://github.com/sindresorhus/clipboardy)

## Usage
Start Hearthstash via `node hearthstash.js <repository>`, where
`<repository>` is the absolute path to the Git repository that you want
to save your decks in. Now every time you copy a deck with the
Collection Manager, Hearthstash will offer to save it to your repository
if it detects that your clipboard has changed (see
[Screenshots](#screenshots)).

## Screenshots
![Screenshot](docs/images/screenshot.jpeg)
