#!/bin/zsh
set -euo pipefail

WORKSPACE="${NEXTOPS_WORKSPACE:-/Users/leohang/project/nextops}"
LABEL="${NEXTOPS_LAUNCHD_LABEL:-com.nextops.codex-nightly}"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT="$WORKSPACE/scripts/nightly-codex-dev.sh"
LOG_DIR="${NEXTOPS_LOG_DIR:-$WORKSPACE/logs/nightly-codex}"

if [ ! -x "$SCRIPT" ]; then
  echo "Script not executable: $SCRIPT"
  echo "Run: chmod +x $SCRIPT"
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>$SCRIPT</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$WORKSPACE</string>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>1</integer>
    <key>Minute</key>
    <integer>30</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>$LOG_DIR/launchd.out.log</string>

  <key>StandardErrorPath</key>
  <string>$LOG_DIR/launchd.err.log</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>NEXTOPS_WORKSPACE</key>
    <string>$WORKSPACE</string>
    <key>NEXTOPS_LOG_DIR</key>
    <string>$LOG_DIR</string>
    <key>NEXTOPS_PUSH</key>
    <string>0</string>
  </dict>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Installed launchd job: $LABEL"
echo "Plist: $PLIST"
echo "Schedule: every day at 01:30 local time"
echo "Logs: $LOG_DIR"
echo
echo "Useful commands:"
echo "  launchctl list | grep $LABEL"
echo "  launchctl start $LABEL"
echo "  launchctl unload $PLIST"
