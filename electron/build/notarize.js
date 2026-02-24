const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  // ✅ Kalau env belum diset, JANGAN ERROR. Skip aja.
  if (!appleId || !appleIdPassword || !teamId) {
    
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return notarize({
    appBundleId: "com.arrangely.desktop",
    appPath: `${context.appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword,
    teamId,
  });
};
