import { runCommand, makeTrackId, fetchAlbumArtFromDeezer } from './utils.js';
import { estimateProgress } from './progress.js';

const SMTC_SCRIPT = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($Op, $T) { $sp = $asTask.MakeGenericMethod($T); $t = $sp.Invoke($null, @($Op)); $t.Wait(-1) | Out-Null; $t.Result }
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
try {
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $sessions = $mgr.GetSessions()
  $result = $null
  foreach ($s in $sessions) {
    $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    if (-not $props.Title) { continue }
    $pb = $s.GetPlaybackInfo()
    $tl = $s.GetTimelineProperties()
    try { $dur = [math]::Round($tl.EndTime.TotalMilliseconds) } catch { $dur = 0 }
    try { $pos = [math]::Round($tl.Position.TotalMilliseconds) } catch { $pos = 0 }
    $result = @{
      playbackStatus = "$($pb.PlaybackStatus)"
      sourceApp = "$($s.SourceAppUserModelId)"
      title    = "$($props.Title)"
      artist   = "$($props.Artist)"
      album    = "$($props.AlbumTitle)"
      positionMs = $pos
      durationMs = $dur
    }
    break
  }
  if ($result) { ConvertTo-Json $result -Depth 5 -Compress } else { Write-Output 'null' }
} catch { Write-Output 'null' }
`;

export async function getCurrentTrackWindows() {
  const fetchStartedAt = Date.now();
  const raw = await runCommand('powershell', ['-NoProfile', '-NonInteractive', '-Command', SMTC_SCRIPT]);
  if (!raw) return null;
  const elapsed = Date.now() - fetchStartedAt;
  const lines = raw.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const data = JSON.parse(trimmed);
      if (!data || data === 'null' || !data.title) return null;
      const trackId = makeTrackId(data.title, data.artist);
      let albumArtUrl = '';
      try { albumArtUrl = await fetchAlbumArtFromDeezer(data.title, data.artist); } catch {}
      return {
        isPlaying: data.playbackStatus === 'Playing',
        trackId,
        trackName: data.title,
        artistName: data.artist,
        albumName: data.album || '',
        progressMs: estimateProgress('windows::smtc', data.positionMs + elapsed, data.playbackStatus, trackId, data.durationMs),
        durationMs: Math.max(0, data.durationMs || 0),
        albumArtUrl,
        rawProgressMs: data.positionMs,
        sourceApp: data.sourceApp || '',
      };
    } catch (err) {
      console.warn('[Windows] Error parseando salida SMTC:', err.message);
    }
  }
  return null;
}
