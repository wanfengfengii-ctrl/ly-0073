import { ref, computed, watch, onUnmounted } from 'vue'
import type { VoiceSettings } from '@/types/tutorial'

const STORAGE_KEY = 'knot-tutorial-voice-settings'

function loadStoredSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    enabled: true,
    rate: 1,
    pitch: 1,
    volume: 1,
    voiceName: null,
  }
}

export function useSpeech() {
  const isSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
  const settings = ref<VoiceSettings>(loadStoredSettings())
  const isSpeaking = ref(false)
  const isPaused = ref(false)
  const availableVoices = ref<SpeechSynthesisVoice[]>([])
  const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)
  const lastSpokenText = ref('')

  watch(
    settings,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {}
    },
    { deep: true },
  )

  function loadVoices() {
    if (!isSupported.value) return
    availableVoices.value = window.speechSynthesis.getVoices()
  }

  if (isSupported.value) {
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }

  const selectedVoice = computed(() => {
    if (!settings.value.voiceName) return null
    return availableVoices.value.find((v) => v.name === settings.value.voiceName) || null
  })

  function pickDefaultVoice(): SpeechSynthesisVoice | null {
    if (availableVoices.value.length === 0) return null
    const zh = availableVoices.value.find(
      (v) => v.lang && (v.lang.toLowerCase().startsWith('zh') || v.lang.includes('CN')),
    )
    return zh || availableVoices.value[0] || null
  }

  function stop() {
    if (!isSupported.value) return
    window.speechSynthesis.cancel()
    isSpeaking.value = false
    isPaused.value = false
    currentUtterance.value = null
  }

  function pause() {
    if (!isSupported.value || !isSpeaking.value) return
    window.speechSynthesis.pause()
    isPaused.value = true
  }

  function resume() {
    if (!isSupported.value || !isPaused.value) return
    window.speechSynthesis.resume()
    isPaused.value = false
  }

  function speak(text: string, onEnd?: () => void) {
    if (!isSupported.value || !settings.value.enabled) {
      onEnd?.()
      return
    }
    if (!text || text.trim() === '') {
      onEnd?.()
      return
    }
    stop()
    lastSpokenText.value = text
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = settings.value.rate
    utter.pitch = settings.value.pitch
    utter.volume = settings.value.volume
    utter.lang = 'zh-CN'
    const voice = selectedVoice.value || pickDefaultVoice()
    if (voice) {
      utter.voice = voice
      utter.lang = voice.lang
    }
    utter.onstart = () => {
      isSpeaking.value = true
      isPaused.value = false
    }
    utter.onend = () => {
      isSpeaking.value = false
      isPaused.value = false
      currentUtterance.value = null
      onEnd?.()
    }
    utter.onerror = () => {
      isSpeaking.value = false
      isPaused.value = false
      currentUtterance.value = null
    }
    currentUtterance.value = utter
    window.speechSynthesis.speak(utter)
  }

  function setEnabled(v: boolean) {
    settings.value.enabled = v
    if (!v) stop()
  }

  function setRate(v: number) {
    settings.value.rate = Math.max(0.5, Math.min(2, v))
  }

  function setPitch(v: number) {
    settings.value.pitch = Math.max(0.5, Math.min(2, v))
  }

  function setVolume(v: number) {
    settings.value.volume = Math.max(0, Math.min(1, v))
  }

  function setVoice(name: string | null) {
    settings.value.voiceName = name
  }

  function resetSettings() {
    settings.value = {
      enabled: true,
      rate: 1,
      pitch: 1,
      volume: 1,
      voiceName: null,
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isSupported,
    settings,
    isSpeaking,
    isPaused,
    availableVoices,
    selectedVoice,
    speak,
    stop,
    pause,
    resume,
    setEnabled,
    setRate,
    setPitch,
    setVolume,
    setVoice,
    resetSettings,
    loadVoices,
  }
}
