# CleanVizio

A personal, locally hosted home screen for a Vizio SmartCast TV: app shortcuts, remote navigation, a rotating sports ticker, Clemson weather, and a time-based greeting.

The computer serves the interface over the home network. The TV renders it; no HDMI cable is required. This is a temporary app launch, not a firmware installation or permanent replacement for Vizio Home. Compatibility has only been tested on a VFD40M-0810.

## Personal preferences and contributor guidance

Preserve these preferences when updating this project:

| Region | Followed teams and sports |
| --- | --- |
| Atlanta, Georgia, USA | Hawks (NBA), Falcons (NFL), Braves (MLB) |
| Clemson, South Carolina, USA | Football, men's basketball, women's basketball, baseball, softball, men's soccer only |
| Manchester, England | Manchester United |
| Brighton and Hove, England | Brighton & Hove Albion |
| Wimbledon, London, England | AFC Wimbledon |

Use each team's correct sport, league, and competition feeds. English clubs should include their league and cup fixtures wherever ESPN supplies them. Do not add Clemson women's soccer, volleyball, or women's lacrosse. Team locations identify the teams and competitions; they do not determine the viewer's displayed time zone or weather.

### Home location, weather, and time

- Home display location: Clemson, South Carolina. Being away from home does not automatically change the TV's location or followed teams.
- Weather: Open-Meteo for Clemson (34.6834, -82.8374), in Fahrenheit, including conditions, feels-like temperature, and daily high/low.
- Display time zone: `America/New_York` for the clock, date, greetings, fixtures, and refresh timestamps, regardless of the TV or host computer's system time zone.
- "EST" means local Eastern Time here: EST in winter and EDT during daylight saving time. Do not hard-code UTC-5 year-round.
- Convert timestamped fixtures to Eastern Time, including the date when conversion crosses midnight. Do not treat UK kickoff times as Eastern times or use a fixed UK-to-US offset; daylight-saving transition dates differ.
- Preserve TBD or postponed status instead of inventing a kickoff time.
- If the installation moves permanently, update the weather coordinates, visible city label, weather query time zone, and all display time zones together. Keep favorites unless the owner requests changes. Automatic location detection is not implemented.

### Sports priorities

Upcoming fixtures (opponent, date, kickoff time) are the priority. Live scores are optional; the owner watches the matches. Prefer ESPN for the followed sports, and verify feed coverage before adding another provider. Do not introduce a paid API dependency without an explicit request.

The current implementation still supports Live, Upcoming, and Recent views and retains its existing refresh intervals. Slower fixture-only polling is a future change, not implemented by these preference notes.

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
