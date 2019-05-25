const child_process = require('child_process');
const clipboardy = require('clipboardy');
const fs = require('fs');
const path = require('path');

const repo = process.argv[2];

let clipboard;
let clipboardOld;
let deckName;
let deckPath;
let deckTracked;

setInterval(() => {
  clipboardOld = clipboard;
  clipboard = clipboardy.readSync();

  if (!(deckName = getDeckName())) {
    return;
  }

  deckPath = getDeckPath();

  if (clipboard !== clipboardOld && deckNotStaged() && userWantsAddition()) {
    addDeck();
  }
}, 400);

function getDeckName() {
  const match = clipboard.match(/^### (?<deckName>.+)$/m);

  if (match) {
    return match.groups.deckName;
  }
}

function getDeckPath() {
  return path.join(getDeckClassPath(), deckName);
}

function getDeckClassPath() {
  return path.join(repo, getDeckClass());
}

function getDeckClass() {
  const match = clipboard.match(/^# Class: (?<deckClass>.+)$/m);

  if (match) {
    return match.groups.deckClass;
  }
}

function deckNotStaged() {
  try {
    return fs.readFileSync(deckPath, { encoding: 'utf-8' }) !== clipboard;
  }
  catch (e) {
    return true;
  }
}

function userWantsAddition() {
  try {
    child_process.execSync(`
      osascript -l JavaScript -e '
        const se = Application("System Events");
        se.includeStandardAdditions = true;
        se.displayDialog("Save deck to repository?", {
          buttons: ["No", "Yes"],
          defaultButton: "Yes",
          cancelButton: "No"
        });'
    `, { stdio: 'ignore' });
  }
  catch (e) {
    return false;
  }
  finally {
    activateFrontmostApp();
  }

  return true;
}

// Refocuses after alerts
function activateFrontmostApp() {
  child_process.execSync(`
    osascript -l JavaScript -e '
      Application(
        Application("System Events").processes
          .whose({frontmost: true})[0]
          .applicationFile()
          .posixPath()
      ).activate();'
  `);
}

function addDeck() {
  deckTracked = fs.existsSync(deckPath);

  writeDeck();
  commitDeck();
}

function writeDeck() {
  const deckClassPath = getDeckClassPath();

  if (!fs.existsSync(deckClassPath)) {
    fs.mkdirSync(deckClassPath);
  }

  fs.writeFileSync(deckPath, clipboard);
}

function commitDeck() {
  const deckPathEscaped = escapeDoubleQuotes(deckPath);

  // Add file in case it's untracked
  child_process.execSync(`
    git add "${deckPathEscaped}";
    git commit -m "${getCommitMessage()}" "${deckPathEscaped}"
  `, { cwd: repo });
}

function getCommitMessage() {
  return `${getCommitMessagePrefix()}: ${escapeDoubleQuotes(deckName)}`;
}

function getCommitMessagePrefix() {
  return deckTracked ? "Edited" : "Added";
}

function escapeDoubleQuotes(string) {
  return string.replace(/"/g, String.raw`\"`);
}
