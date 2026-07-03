import { runCommand, makeTrackId } from './utils.js';
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
    $result = @{
      playbackStatus = "$($pb.PlaybackStatus)"
      sourceApp = "$($s.SourceAppUserModelId)"
      title    = "$($props.Title)"
      artist   = "$($props.Artist)"
      album    = "$($props.AlbumTitle)"
      positionMs = [math]::Round($tl.Position.TotalMilliseconds)
      durationMs = [math]::Round($tl.EndTime.TotalMilliseconds)
    }
    break
  }
  if ($result) { ConvertTo-Json $result -Depth 5 -Compress } else { Write-Output 'null' }
} catch { Write-Output 'null' }
`;

export async function getCurrentTrackWindows() {
  const raw = await runCommand('powershell', ['-NoProfile', '-NonInteractive', '-Command', SMTC_SCRIPT]);
  if (!raw) return null;
  const lines = raw.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const data = JSON.parse(trimmed);
      if (!data || data === 'null' || !data.title) return null;
      const trackId = makeTrackId(data.title, data.artist);
      return {
        isPlaying: data.playbackStatus === 'Playing',
        trackId,
        trackName: data.title,
        artistName: data.artist,
        albumName: data.album || '',
        progressMs: estimateProgress('windows::smtc', data.positionMs, data.playbackStatus, trackId, data.durationMs),
        durationMs: data.durationMs || 0,
        albumArtUrl: '',
      };
    } catch {}
  }
  return null;
}
