import { forwardRef } from 'react'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import { decodeLabelhash, isEncodedLabelhash, labelhash } from '@ensdomains/ensjs/utils/labels'
import { validateName } from '@ensdomains/ensjs/utils/validation'
import { Button, Dialog, Input, Typography, mq } from '@ensdomains/thorin'

import { isLabelTooLong } from '@app/utils/utils'

const Container = styled.div(
  ({ theme }) => css`
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    gap: ${theme.space['4']};

    & > div {
      text-align: center;
      max-width: ${theme.space['112']};
      margin: 0 auto;
    }

    ${mq.sm.min(css`
      gap: ${theme.space['6']};
      width: calc(80vw - 2 * ${theme.space['6']});
      max-width: ${theme.space['128']};
    `)}
  `,
)

const LabelsContainer = styled.form(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    gap: ${theme.space['1']};

    & > div > div > label {
      visibility: hidden;
      display: none;
    }
  `,
)

type Label = {
  label: string
  value: string
  disabled: boolean
}

export type FormData = {
  unknownLabels: {
    tld: string
    labels: Label[]
  }
}

type Props = UseFormReturn<FormData> & {
  onSubmit: (data: FormData) => void
  onConfirm: () => void
  onCancel: () => void
}

export const nameToFormData = (name: string = '') => {
  const labels = name.split('.')
  const tld = labels.pop() || ''
  return {
    unknownLabels: {
      tld,
      labels: labels.map((label) => {
        if (isEncodedLabelhash(label)) {
          return {
            label: decodeLabelhash(label),
            value: '',
            disabled: false,
          }
        }
        return {
          label,
          value: label,
          disabled: true,
        }
      }),
    },
  }
}

const validateLabel = (hash: string) => (label: string) => {
  if (!label) {
    return 'Label is required'
  }
  if (isLabelTooLong(label)) {
    return 'Label is too long'
  }
  try {
    if (!validateName(label) || label.indexOf('.') !== -1) throw new Error()
  } catch {
    return 'Invalid label'
  }
  if (hash !== labelhash(label)) {
    return 'Label is incorrect'
  }
  return true
}

export const UnknownLabelsForm = forwardRef<HTMLFormElement, Props>(
  (
    {
      register,
      formState,
      control,
      handleSubmit,
      getFieldState,
      getValues,
      onSubmit,
      onConfirm,
      onCancel,
    },
    ref,
  ) => {
    const { t } = useTranslation('transactionFlow')

    const { fields: labels } = useFieldArray({
      control,
      name: 'unknownLabels.labels',
    })

    const unknownLabelsCount = getValues('unknownLabels.labels').filter(
      ({ disabled }) => !disabled,
    ).length
    const dirtyLabelsCount =
      formState.dirtyFields.unknownLabels?.labels?.filter(({ value }) => value).length || 0

    const hasErrors = Object.keys(formState.errors).length > 0
    const isComplete = dirtyLabelsCount === unknownLabelsCount
    const canConfirm = !hasErrors && isComplete

    return (
      <>
        <Dialog.Heading title={t('input.unknownLabels.title')} />
        <Container>
          <Typography>{t('input.unknownLabels.subtitle')}</Typography>
          <LabelsContainer
            ref={ref}
            onSubmit={handleSubmit(onSubmit)}
            data-testid="unknown-labels-form"
          >
            {labels.map(({ label, value, disabled }, inx) => (
              <Input
                // eslint-disable-next-line react/no-array-index-key
                key={`${inx}-${label}`}
                placeholder={label}
                label={label}
                suffix={inx === labels.length - 1 ? `.${getValues(`unknownLabels.tld`)}` : '.'}
                disabled={disabled}
                defaultValue={value}
                error={getFieldState(`unknownLabels.labels.${inx}.value`).error?.message}
                spellCheck={false}
                autoCorrect="off"
                autoComplete="off"
                data-testid={`unknown-label-input-${label}`}
                {...(disabled
                  ? {}
                  : register(`unknownLabels.labels.${inx}.value`, {
                      validate: validateLabel(label),
                    }))}
              />
            ))}
          </LabelsContainer>
        </Container>
        <Dialog.Footer
          leading={
            <Button colorStyle="accentSecondary" onClick={onCancel}>
              {t('action.cancel', { ns: 'common' })}
            </Button>
          }
          trailing={
            <Button data-testid="unknown-labels-confirm" onClick={onConfirm} disabled={!canConfirm}>
              {t('action.confirm', { ns: 'common' })}
            </Button>
          }
        />
      </>
    )
  },
)
