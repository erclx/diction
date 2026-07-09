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

  if (!data) {
    return null
  }

  const selected = voice ?? data.default
  const accents = [...new Set(data.voices.map((entry) => entry.accent))]

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
            {data.voices
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
