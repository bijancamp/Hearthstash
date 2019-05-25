const child_process = require('child_process');
const clipboardy = require('clipboardy');
const fs = require('fs');
const path = require('path');

const repos = process.argv.slice(2);

let clipboardOld;
let clipboard;
let deckName;
let deckPath;
let deckTracked;
let repo;

setInterval(() => {
  clipboardOld = clipboard;
  clipboard = clipboardy.readSync();

  if (!(deckName = getDeckName())) {
    return;
  }

  if (clipboard !== clipboardOld
    && deckNotStagedInAllRepos()
    && (repo = getRepo())) {
    deckPath = getDeckPath(repo);
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

function deckNotStagedInAllRepos() {
  for (repo of repos) {
    deckPath = getDeckPath();

    if (deckNotStaged()) {
      return true;
    }
  }

  return false;
}

function deckNotStaged(deckPath) {
  try {
    return fs.readFileSync(deckPath, { encoding: 'utf-8' }) !== clipboard;
  }
  catch (e) {
    return true;
  }
}

function getRepo() {
  return repos.length === 1 && userWantsAddition() ? repos[0] : getRepoChoice();
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

function getRepoChoice() {
  const result = child_process.execSync(`
    osascript -l JavaScript -e '
      const se = Application("System Events");
      se.includeStandardAdditions = true;
      se.chooseFromList([${repos.map(r => `"${r}"`).join(', ')}], {
        withTitle: "Save Deck",
        withPrompt: "Pick repository to save deck in:",
        defaultItems: ["HS Decks"],
        okButtonName: "Save"
      });'
  `, { encoding: 'utf-8' }).slice(0, -1);  // drops trailing "\n"

  return result !== 'false' ? result : null
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
