import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = path.join(rootDir, "package.json");
const androidGradlePath = path.join(rootDir, "android", "app", "build.gradle");
const xcodeProjectPath = path.join(rootDir, "ios", "App", "App.xcodeproj", "project.pbxproj");

const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const version = packageJson.version;
const buildNumber = Number(packageJson.appBuild);

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`package.json version must be MAJOR.MINOR.PATCH, received: ${version}`);
}

if (!Number.isInteger(buildNumber) || buildNumber < 1) {
  throw new Error(`package.json appBuild must be a positive integer, received: ${buildNumber}`);
}

const updateFile = (filePath, transform) => {
  const before = fs.readFileSync(filePath, "utf8");
  const after = transform(before);
  fs.writeFileSync(filePath, after);
};

updateFile(androidGradlePath, (content) => {
  const versionCodePattern = /versionCode\s+\d+/;
  const versionNamePattern = /versionName\s+"[^"]+"/;
  if (!versionCodePattern.test(content) || !versionNamePattern.test(content)) {
    throw new Error("Android version fields were not found in android/app/build.gradle");
  }
  return content
    .replace(versionCodePattern, `versionCode ${buildNumber}`)
    .replace(versionNamePattern, `versionName "${version}"`);
});

updateFile(xcodeProjectPath, (content) => {
  const buildPattern = /CURRENT_PROJECT_VERSION = [^;]+;/g;
  const marketingPattern = /MARKETING_VERSION = [^;]+;/g;
  if (!buildPattern.test(content) || !marketingPattern.test(content)) {
    throw new Error("iOS version fields were not found in project.pbxproj");
  }
  return content
    .replace(buildPattern, `CURRENT_PROJECT_VERSION = ${buildNumber};`)
    .replace(marketingPattern, `MARKETING_VERSION = ${version};`);
});

console.log(`Synchronized native app version ${version} (${buildNumber})`);