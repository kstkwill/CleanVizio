# CleanVizio

A customizable, locally hosted home screen for a Vizio SmartCast TV: app shortcuts, remote navigation, a rotating sports ticker, local weather, and a time-based greeting.

The computer serves the interface over the home network. The TV renders it; no HDMI cable is required. This is a temporary app launch, not a firmware installation or permanent replacement for Vizio Home. Compatibility has only been tested on a VFD40M-0810.

## Make it yours

Before using CleanVizio, choose the sports and teams you want to follow, your weather location, and your display time zone. The included configuration is a starting example, not a required set of favorites.

These settings currently require editing the source files; there is no setup wizard or automatic location detection.

### Choose your sports and teams

1. In `live-data.js`, edit the `feeds` array. Each entry contains a display name, sport label, and ESPN team endpoint path. Keep only the teams and sports you want, using the correct ESPN identifiers for each.
2. In `live-ui.js`, update `favoriteNames` so the team filter matches the display names in your feeds. Keep `All teams` as the first option.
3. Update the coverage description in `live-ui.js` to describe your selections. If replacing team-specific feed validation in `live-data.js`, update that validation to match the new team.
4. Restart the host and check that your selected teams return the expected fixtures. League and cup coverage depends on ESPN's available data.

The sports panel includes Upcoming, Live, and Recent views. Use Upcoming for opponents, dates, and kickoff times.

### Set your weather location

- In the `weather()` function in `live-data.js`, replace the Open-Meteo request's `latitude` and `longitude` with your location's coordinates.
- In `glass-page.js`, change the visible weather city label to match.
- The current display uses Fahrenheit. If changing the request's temperature unit, also update the unit labels in `live-ui.js`.
- Set the weather request's `timezone` to your chosen local time zone so daily forecasts use the correct local date.

Weather includes current conditions, temperature, feels-like temperature, and daily high/low. It uses the configured location, not the location of the teams you follow.

### Set your time zone

Replace the default `America/New_York` time zone with your own IANA time-zone name, such as `America/Chicago` or `Europe/London`, in:

- `glass-ui.js`: clock, date, and greeting.
- `live-ui.js`: fixture times and refresh timestamps; update the displayed `ET` and `EST/EDT` labels as well.
- `clean-vizio.js`: the built-in page's clock and date.
- `live-data.js`: the weather request's time zone (URL-encoded when used in the URL).

Use a named time zone so daylight-saving changes are handled automatically. For example, `America/New_York` uses EST in winter and EDT in summer. Fixture timestamps should be converted to the viewer's time zone, including any date change, rather than shifted by a fixed number of hours.

Restart CleanVizio and reload the TV page after changing these settings.

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

Sports use ESPN endpoints; some feeds can be unavailable and coverage is not guaranteed. Weather uses Open-Meteo. Dedicated Premier League, Sky, and FotMob integrations are not implemented; football coverage comes from ESPN. Follow the setup instructions above to choose teams, weather location, and time zone. Edit `glass-ui.js` for the greeting and app ordering, and `glass.css` for appearance.

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
