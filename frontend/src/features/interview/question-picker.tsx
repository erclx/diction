import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReferenceButton } from '@/features/reference-audio/reference-button'

import { collapseLineBreaks } from './interview-question'
import type { InterviewQuestion } from './interview-question'

interface QuestionPickerProps {
  questions: readonly InterviewQuestion[]
  selectedIndex: number | null
  disabled: boolean
  onSelect: (index: number) => void
}

function categoriesOf(
  questions: readonly InterviewQuestion[],
): readonly string[] {
  return [...new Set(questions.map((question) => question.category))]
}

export function QuestionPicker({
  questions,
  selectedIndex,
  disabled,
  onSelect,
}: QuestionPickerProps) {
  const selected = selectedIndex === null ? null : questions[selectedIndex]
  const rehearsalAnswer = selected
    ? collapseLineBreaks(selected.scripted_answer)
    : ''

  function handleChange(value: string) {
    onSelect(Number(value))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick a question</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Select
          value={selectedIndex === null ? '' : String(selectedIndex)}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <SelectTrigger aria-label="Interview question" className="w-full">
            <SelectValue placeholder="Choose a question" />
          </SelectTrigger>
          <SelectContent>
            {categoriesOf(questions).map((category) => (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {questions.map((question, index) =>
                  question.category === category ? (
                    <SelectItem key={index} value={String(index)}>
                      {question.question}
                    </SelectItem>
                  ) : null,
                )}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {selected ? (
          <div className="flex flex-col gap-4">
            <p className="font-serif text-lg leading-relaxed">
              {selected.question}
            </p>

            {selected.keyword_beats.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Beats to hit
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {selected.keyword_beats.map((beat) => (
                    <li
                      key={beat}
                      className="rounded-full border bg-muted/40 px-3 py-1 text-sm"
                    >
                      {beat}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Answer to rehearse
                </h3>
                {rehearsalAnswer ? (
                  <ReferenceButton
                    text={rehearsalAnswer}
                    label="Hear the model answer"
                  />
                ) : null}
              </div>
              <p className="rounded-lg border bg-muted/40 p-3 text-left text-sm leading-relaxed">
                {rehearsalAnswer}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a question to see its beats and the answer to rehearse.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
