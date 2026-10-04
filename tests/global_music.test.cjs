const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8')
const controls = fs.readFileSync('src/app/components/GlobalMusicControls.tsx', 'utf8')

test('global music controls share root audio provider across routes', () => {
  assert.match(layout, /<AudioProvider>[\s\S]*<GlobalMusicControls\s*\/>[\s\S]*\{children\}[\s\S]*<\/AudioProvider>/)
  assert.match(controls, /useAudio\(\)/)
  assert.match(controls, /aria-label="Music settings"/)
  assert.match(controls, /aria-label="Music volume"/)
  assert.match(controls, /aria-label=\{playing \? 'Pause music' : 'Play music'\}/)
  assert.match(controls, /aria-label=\{muted \? 'Unmute music' : 'Mute music'\}/)
})
