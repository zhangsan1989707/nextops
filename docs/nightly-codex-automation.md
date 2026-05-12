# Nightly Codex Automation

This project includes a local macOS `launchd` job for unattended nightly development.

## What It Does

- Runs every day at 01:30 local time.
- Uses `caffeinate` to reduce sleep risk while the MacBook is open and plugged in.
- Runs Codex non-interactively with approval policy `never`.
- Records logs under `logs/nightly-codex/`.
- Instructs Codex to choose reasonable defaults instead of asking the user.
- Requires each completed feature to pass:
  - `npm run lint`
  - `npm run build`
  - `npm run docker:deploy`
  - `npm run smoke`
- Requires each completed feature to be committed separately.

## Install

```bash
cd /Users/leohang/project/nextops
chmod +x scripts/nightly-codex-dev.sh scripts/install-nightly-codex-launchd.sh
scripts/install-nightly-codex-launchd.sh
```

## Run Once Manually

```bash
scripts/nightly-codex-dev.sh
```

## Trigger The Scheduled Job Manually

```bash
launchctl start com.nextops.codex-nightly
```

## Logs

```bash
ls -lt logs/nightly-codex
tail -f logs/nightly-codex/launchd.out.log
```

Each run also writes:

- `run-YYYYMMDD-HHMMSS.log`
- `last-message-YYYYMMDD-HHMMSS.md`

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.nextops.codex-nightly.plist
rm ~/Library/LaunchAgents/com.nextops.codex-nightly.plist
```

## Notes For MacBook Lock Screen

- Keep the MacBook plugged in.
- Keep the lid open.
- The script wraps Codex with `/usr/bin/caffeinate -dimsu`.
- `launchd` user agents generally run while the user session exists. If the machine is fully asleep, powered off, or logged out, the job cannot run.

## Push Behavior

By default the job commits locally but does not push.

To enable push, edit `~/Library/LaunchAgents/com.nextops.codex-nightly.plist` and set:

```xml
<key>NEXTOPS_PUSH</key>
<string>1</string>
```

Then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.nextops.codex-nightly.plist
launchctl load ~/Library/LaunchAgents/com.nextops.codex-nightly.plist
```
