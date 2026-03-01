#!/bin/bash

# iOS App Distribution Build Script for Ketravelan
# Usage: ./scripts/build-ios-dist.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_PROJECT_PATH="$PROJECT_ROOT/ios/App"
ARCHIVE_PATH="$IOS_PROJECT_PATH/build/Ketravelan.xcarchive"
EXPORT_PATH="$IOS_PROJECT_PATH/build/Export"
BUILD_PATH="$IOS_PROJECT_PATH/build/DerivedData"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Ketravelan iOS Distribution Build${NC}"
echo -e "${YELLOW}========================================${NC}"

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}Error: This script must be run on macOS${NC}"
  exit 1
fi

# Check dependencies
echo -e "${YELLOW}\n1. Checking dependencies...${NC}"
if ! command -v xcodebuild &> /dev/null; then
  echo -e "${RED}Error: xcodebuild not found. Please install Xcode Command Line Tools.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ xcodebuild found${NC}"

if ! command -v pod &> /dev/null; then
  echo -e "${RED}Error: CocoaPods not found. Run: sudo gem install cocoapods${NC}"
  exit 1
fi
echo -e "${GREEN}✓ CocoaPods found${NC}"

# Build web assets
echo -e "${YELLOW}\n2. Building web assets...${NC}"
cd "$PROJECT_ROOT"
npm run build
echo -e "${GREEN}✓ Web build complete${NC}"

# Sync Capacitor
echo -e "${YELLOW}\n3. Syncing Capacitor...${NC}"
npx cap copy ios
npx cap sync ios
echo -e "${GREEN}✓ Capacitor sync complete${NC}"

# Install pods
echo -e "${YELLOW}\n4. Installing CocoaPods dependencies...${NC}"
cd "$IOS_PROJECT_PATH"
pod install --repo-update
echo -e "${GREEN}✓ CocoaPods install complete${NC}"

# Create build directory
mkdir -p "$IOS_PROJECT_PATH/build"
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"

# Archive the app
echo -e "${YELLOW}\n5. Creating archive...${NC}"
xcodebuild archive \
  -workspace "App.xcworkspace" \
  -scheme "App" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -derivedDataPath "$BUILD_PATH" \
  -allowProvisioningUpdates \
  -quiet

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Archive created successfully${NC}"
else
  echo -e "${RED}✗ Archive creation failed${NC}"
  exit 1
fi

# Verify archive exists
if [ ! -d "$ARCHIVE_PATH" ]; then
  echo -e "${RED}Error: Archive not found at $ARCHIVE_PATH${NC}"
  exit 1
fi

# Export for App Store
echo -e "${YELLOW}\n6. Exporting archive for App Store...${NC}"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "ExportOptions.plist" \
  -allowProvisioningUpdates \
  -quiet

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Export successful${NC}"
else
  echo -e "${RED}✗ Export failed${NC}"
  exit 1
fi

# Find IPA
IPA_FILE=$(find "$EXPORT_PATH" -name "*.ipa" -type f)

if [ -z "$IPA_FILE" ]; then
  echo -e "${RED}Error: IPA file not found in export path${NC}"
  exit 1
fi

IPA_SIZE=$(du -h "$IPA_FILE" | cut -f1)

echo -e "${GREEN}\n========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}IPA File: $IPA_FILE${NC}"
echo -e "${GREEN}Size: $IPA_SIZE${NC}"
echo -e "${YELLOW}\nNext steps:${NC}"
echo "1. Upload to App Store Connect using Transporter app"
echo "2. Or use: xcrun altool --upload-app -f \"$IPA_FILE\" -t ios -u your-apple-id@example.com"
echo -e "\nFor more details, see: iOS_DISTRIBUTION_SETUP.md"
