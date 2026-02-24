const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function must(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Missing env ${name}`);
    process.exit(1);
  }
  return v;
}

const appleId = must("APPLE_ID");
const applePw = must("APPLE_APP_SPECIFIC_PASSWORD");
const teamId = must("APPLE_TEAM_ID");

const distDir = path.resolve(__dirname, "../dist");

// cari dmg terbaru yang bukan .blockmap
const dmgs = fs
  .readdirSync(distDir)
  .filter((f) => f.endsWith(".dmg") && !f.endsWith(".dmg.blockmap"))
  .map((f) => ({
    file: f,
    mtime: fs.statSync(path.join(distDir, f)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (dmgs.length === 0) {
  console.error("❌ No .dmg found in dist/");
  process.exit(1);
}

const dmgPath = path.join(distDir, dmgs[0].file);


// Submit notarization & wait
execSync(
  `xcrun notarytool submit "${dmgPath}" --apple-id "${appleId}" --password "${applePw}" --team-id "${teamId}" --wait`,
  { stdio: "inherit" }
);

// Staple ticket
execSync(`xcrun stapler staple "${dmgPath}"`, { stdio: "inherit" });


