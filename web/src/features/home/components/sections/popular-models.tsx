/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'
import { getCurrencyDisplay } from '@/lib/currency'

interface PopularModelsProps {
  className?: string
}

// Pure points display (no RMB ¥ shown anywhere).
// Image models use real APIMODELS 1K upstream USD costs × 300 (= 2x profit
// even on the ¥9,980 enterprise tier, 2.7x on ¥99 tier). 2K / 4K scale up
// according to user selection in the canvas or API call.
export function PopularModels(_props: PopularModelsProps) {
  const { t } = useTranslation()
  const { config } = getCurrencyDisplay()
  const unitLabel = config.customCurrencySymbol || '积分'

  const formatPoints = (pts: number): string => {
    const clean = Number.isInteger(pts)
      ? String(pts)
      : Number(pts.toFixed(3)).toString()
    return `${clean} ${unitLabel}`
  }

  // Text models: pure points per 1K tokens.
  const textModels = [
    { name: 'gemini-3.8-flash', inputPtsPer1K: 0.06, outputPtsPer1K: 0.28 },
    { name: 'gpt-6.1-sol', inputPtsPer1K: 0.03, outputPtsPer1K: 0.13 },
    { name: 'grok-4.6', inputPtsPer1K: 0.05, outputPtsPer1K: 0.15 },
    { name: 'claude-opus-5', inputPtsPer1K: 0.2, outputPtsPer1K: 1.0 },
    { name: 'deepseek-v4-pro', inputPtsPer1K: 0.3, outputPtsPer1K: 0.9 },
  ]

  // Image models: 1K default low-entry pure points (real APIMODELS USD × 300).
  const imageModels = [
    { name: 'gpt-image-2.6-sunburst', points: 6 },
    { name: 'gpt-image-2.6-flare', points: 6 },
    { name: 'nano-banana-2-1', points: 7 },
    { name: 'gpt-image-2', points: 8 },
    { name: 'gemini-3.1-flash-image-preview', points: 15 },
  ]

  // Video models: 720P default pure points per second.
  const videoModels = [
    { name: 'kling-4.0-flash', points: 11 },
    { name: 'grok-imagine-video-1.5', points: 11 },
    { name: 'grok-video-3-10s', points: 13 },
    { name: 'kling-4.0', points: 17 },
    { name: 'wan-3.0-video', points: 20 },
  ]

  return (
    <section className='border-border/40 relative z-10 border-t px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 text-center md:mb-20'>
          <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
            {t('Popular Models')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('Text, image and video — the models merchants actually use')}
          </h2>
        </AnimateInView>

        <div className='grid gap-6 md:grid-cols-3'>
          <AnimateInView animation='fade-up'>
            <div className='border-border/40 bg-card/60 h-full rounded-xl border p-5'>
              <h3 className='mb-4 text-base font-semibold'>
                {t('Text Models')}
              </h3>
              <ul className='space-y-3'>
                {textModels.map((m) => (
                  <li key={m.name} className='flex flex-col gap-0.5'>
                    <span className='text-sm font-medium'>{m.name}</span>
                    <span className='text-muted-foreground text-xs'>
                      {t('Input')} {formatPoints(m.inputPtsPer1K)} /{' '}
                      {t('{{unit}} tokens', { unit: '1K' })}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {t('Output')} {formatPoints(m.outputPtsPer1K)} /{' '}
                      {t('{{unit}} tokens', { unit: '1K' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateInView>

          <AnimateInView animation='fade-up' delay={100}>
            <div className='border-border/40 bg-card/60 h-full rounded-xl border p-5'>
              <h3 className='mb-4 text-base font-semibold'>
                {t('Image Models')}
              </h3>
              <ul className='space-y-3'>
                {imageModels.map((m) => (
                  <li key={m.name} className='flex flex-col gap-0.5'>
                    <span className='text-sm font-medium'>{m.name}</span>
                    <span className='text-muted-foreground text-xs'>
                      {formatPoints(m.points)} / {t('per image')} · 1K
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateInView>

          <AnimateInView animation='fade-up' delay={200}>
            <div className='border-border/40 bg-card/60 h-full rounded-xl border p-5'>
              <h3 className='mb-4 text-base font-semibold'>
                {t('Video Models')}
              </h3>
              <ul className='space-y-3'>
                {videoModels.map((m) => (
                  <li key={m.name} className='flex flex-col gap-0.5'>
                    <span className='text-sm font-medium'>{m.name}</span>
                    <span className='text-muted-foreground text-xs'>
                      {formatPoints(m.points)} / {t('per second')} · 720P
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateInView>
        </div>

        <AnimateInView className='mt-10 text-center' animation='fade-up'>
          <p className='text-muted-foreground mb-5 text-xs'>
            {t(
              'Prices shown are indicative; see the Model Square for the live price list.'
            )}
          </p>
          <Button
            variant='outline'
            className='border-border/50 hover:border-border hover:bg-muted/50 group rounded-lg'
            render={<Link to='/pricing' />}
          >
            {t('View Model Square')}
            <ArrowRight className='ml-1 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5' />
          </Button>
        </AnimateInView>
      </div>
    </section>
  )
}
