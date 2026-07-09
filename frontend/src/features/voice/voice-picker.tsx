import { useEffect, useMemo } from 'react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAudioChannel } from '@/features/audio-channel/audio-channel'

import { useVoice } from './use-voice'
import { useVoices } from './use-voices'

export function VoicePicker() {
  const { data } = useVoices()
  const { voice, setVoice } = useVoice()
  const channel = useAudioChannel()

  const voices = useMemo(() => data?.voices ?? [], [data])
  const known = useMemo(
    () => new Set(voices.map((entry) => entry.id)),
    [voices],
  )
  const resolved =
    (voice && known.has(voice) ? voice : null) ??
    (data && known.has(data.default) ? data.default : null) ??
    voices[0]?.id ??
    null

  useEffect(() => {
    if (voice !== null && resolved !== null && voice !== resolved) {
      setVoice(resolved)
    }
  }, [voice, resolved, setVoice])

  if (!data || voices.length === 0 || resolved === null) {
    return null
  }

  const selected = resolved
  const accents = [...new Set(voices.map((entry) => entry.accent))]

  function handleChange(next: string) {
    channel.stop()
    setVoice(next)
  }

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger aria-label="Reference voice" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {accents.map((accent) => (
          <SelectGroup key={accent}>
            <SelectLabel>{accent}</SelectLabel>
            {voices
              .filter((entry) => entry.accent === accent)
              .map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label} ({entry.gender})
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
