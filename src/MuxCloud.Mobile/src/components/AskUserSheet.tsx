import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { formatClock, questionSecondsLeft } from '@/lib/questions';
import type { MuxQuestion } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/palette';
import { Sheet } from './Sheet';
import { Button, Field, Notice, T } from './ui';

/** What the user chose: labels of the picked options, optional free text, or a skip. */
export interface QuestionAnswer {
  answers: string[];
  other: string;
  skip: boolean;
}

/**
 * The desktop's ask_user dialog: the model's question with 2 to 4 options (one, or several when MultiSelect), a free-text
 * Other answer, and Skip. Closing the sheet leaves the question pending; the conversation shows a banner to reopen it.
 * Unanswered questions time out on the machine and the model picks a default, so the remaining time is shown.
 */
export function AskUserSheet({
  question,
  visible,
  onClose,
  onAnswer,
}: {
  question: MuxQuestion | null;
  visible: boolean;
  onClose: () => void;
  onAnswer: (q: MuxQuestion, answer: QuestionAnswer) => Promise<void>;
}) {
  const { t } = useTranslation();
  const p = useTheme();
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // A new question starts with nothing picked (adjusted during render, not in an effect).
  const [seen, setSeen] = useState(question?.questionId);
  if (question?.questionId !== seen) {
    setSeen(question?.questionId);
    setPicked([]);
    setOther('');
  }

  useEffect(() => {
    if (!visible || !question?.timeoutSeconds) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible, question?.timeoutSeconds]);

  if (!question) return null;
  const left = questionSecondsLeft(question, now);
  const toggle = (label: string) =>
    setPicked((list) =>
      question.multiSelect ? (list.includes(label) ? list.filter((x) => x !== label) : [...list, label]) : list[0] === label ? [] : [label],
    );
  const canSubmit = picked.length > 0 || other.trim().length > 0;
  const send = async (skip: boolean) => {
    setBusy(true);
    try {
      await onAnswer(question, { answers: skip ? [] : picked, other: skip ? '' : other.trim(), skip });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title={t('mobile.ask.title')}
      onClose={onClose}
      footer={
        <>
          <Button title={t('mobile.ask.submit')} busy={busy} disabled={!canSubmit} onPress={() => void send(false)} />
          {question.allowSkip ? <Button title={t('mobile.ask.skip')} kind="secondary" disabled={busy} onPress={() => void send(true)} /> : null}
        </>
      }
    >
      <T style={{ fontWeight: '600' }} selectable>
        {question.question}
      </T>
      <T variant="small">{question.multiSelect ? t('mobile.ask.pickSeveral') : t('mobile.ask.pickOne')}</T>
      <View style={{ gap: spacing.sm }} accessibilityRole={question.multiSelect ? undefined : 'radiogroup'}>
        {question.options.map((o) => {
          const on = picked.includes(o.label);
          return (
            <Pressable
              key={o.label}
              onPress={() => toggle(o.label)}
              accessibilityRole={question.multiSelect ? 'checkbox' : 'radio'}
              accessibilityState={question.multiSelect ? { checked: on } : { selected: on }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: on ? p.accent : p.line,
                backgroundColor: on ? p.accentSoft : p.panel,
                minHeight: 52,
              }}
            >
              <Ionicons
                name={question.multiSelect ? (on ? 'checkbox' : 'square-outline') : on ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={on ? p.accent : p.muted}
              />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: on ? '600' : '400' }}>{o.label}</T>
                {o.description ? <T variant="small">{o.description}</T> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {question.allowOther ? (
        <Field label={t('mobile.ask.other')} hint={t('mobile.ask.otherHint')} value={other} onChangeText={setOther} multiline grow />
      ) : null}
      {left !== null ? <Notice tone={left < 60 ? 'warning' : 'info'} text={t('mobile.ask.timeout', { time: formatClock(left) })} /> : null}
    </Sheet>
  );
}
