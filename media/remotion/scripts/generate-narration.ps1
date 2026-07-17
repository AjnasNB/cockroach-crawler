$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Speech

$project = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $PSScriptRoot 'narration.json'
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$available = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$voiceNames = @($available.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name })
$available.Dispose()

if ($voiceNames -notcontains $config.voice) {
  throw "Required local voice '$($config.voice)' is unavailable. Installed voices: $($voiceNames -join ', ')"
}
foreach ($compositionProperty in $config.compositions.PSObject.Properties) {
  $compositionName = $compositionProperty.Name
  $composition = $compositionProperty.Value
  $outputDirectory = Join-Path $project "public\audio\$compositionName"
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

  for ($index = 0; $index -lt $composition.scenes.Count; $index++) {
    $scene = $composition.scenes[$index]
    $fileName = 'scene-{0:D2}.wav' -f ($index + 1)
    $outputPath = Join-Path $outputDirectory $fileName
    $synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
    try {
      $synth.SelectVoice($config.voice)
      $synth.Rate = [int]$config.rate
      $synth.Volume = 100
      $synth.SetOutputToWaveFile($outputPath)
      $synth.Speak([string]$scene.text)
    }
    finally {
      $synth.Dispose()
    }
    Write-Output "Generated $compositionName/$fileName"
  }
}
