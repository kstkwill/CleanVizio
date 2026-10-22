# CleanVizio

A personal, locally hosted home screen for a Vizio SmartCast TV: app shortcuts, remote navigation, a rotating sports ticker, Clemson weather, and a time-based greeting.

The computer serves the interface over the home network. The TV renders it; no HDMI cable is required. This is a temporary app launch, not a firmware installation or permanent replacement for Vizio Home. Compatibility has only been tested on a VFD40M-0810.

## Windows setup

1. Install Node.js and connect the computer and TV to the same trusted network.
2. Copy `Start-CleanVizio.example.ps1` to `Start-CleanVizio.ps1`.
3. Pair with the TV using the SmartCast pairing procedure linked below. Keep the resulting token in a PowerShell variable named `$vizioToken`; do not paste it into source files or GitHub.
4. Run the following in that PowerShell window, replacing the two sample IP addresses:

```powershell
& .\Start-CleanVizio.ps1 -Token $vizioToken -TvAddress '192.168.1.50' -ComputerAddress '192.168.1.51'
Show-CleanVizio
Resume-CleanVizioWatcher
```

If local script execution is disabled, set `RemoteSigned` for the current process only, then restore the previous process policy after loading the script. Do not change machine-wide policy for this app.

Open `http://COMPUTER-IP:8765/control` on the hosting computer. Open an app on the TV, then use **Add current app** to save its shortcut. Saved shortcuts are local and excluded from Git. Minimize PowerShell, but keep it open and keep the computer awake.

## Watcher

Pressing Home on the TV remote opens Vizio Home first. The watcher checks every second and requires two seconds of stable Home state before requesting CleanVizio. TV/network latency adds to that delay. A 30-second manual-command hold and 60-second launch-attempt cooldown prevent repeated launches. It rechecks the TV state before launching and does not turn the TV on or change inputs.

The watcher starts paused. `Resume-CleanVizioWatcher` enables it; `Pause-CleanVizioWatcher` pauses it. `Restore-VizioHome` pauses the watcher and restores Home. `Stop-CleanVizio` stops the server.

## Data and customization

Sports use ESPN endpoints; some feeds can be unavailable and coverage is not guaranteed. Weather uses Open-Meteo. Premier League, Sky, and FotMob integrations are not implemented. Edit `live-data.js` for teams/location, `glass-ui.js` for the personal greeting and app ordering, and `glass.css` for appearance.

## Security and limitations

Use on a trusted home network only; do not forward ports to the internet. The browser interface uses local HTTP. TV HTTPS requests accept the TV's self-signed certificate. The server restricts peers and checks action nonces/origins. Pairing tokens stay in process memory. Closing PowerShell loses that in-memory token; pairing again is needed unless you have retained it separately.

Automatic background startup and protected persistent token storage are planned for a dedicated host, not implemented in this version. GitHub hosts the source code; GitHub Pages cannot run this Node.js server or reach your TV.

## References and assets

- SmartCast pairing/API research: https://github.com/exiva/Vizio_SmartCast_API
- Temporary launch research: https://github.com/vindeckyy/smartcast-backdoor
- Design inspiration: https://github.com/nthnclrk/CleanFrame
- Weather: https://open-meteo.com/
- Some brand vectors originate from Simple Icons and Wikimedia Commons. Brand names and logos belong to their respective owners; this project is unaffiliated with them. No blanket license grant for third-party artwork is implied.

No project license has been selected yet.
