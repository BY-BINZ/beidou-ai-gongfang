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
import { formatDualCurrencyFromUSD, getCurrencyDisplay } from '@/lib/currency'

interface PopularModelsProps {
  className?: string
}

// Model names and prices are the relay's own selling prices, so the
// homepage always shows what a customer actually pays here.
// Source: the relay's live model_pricing snapshot (2026-11-17 fill,
// 1 point = $0.005, $1 = ¥7.3). Display rule (owner, 2026-11-18):
// show the cheap default, not the expensive tier — image models are
// the 1K (default) price, nothing over ¥0.5 per image, no 4K; video
// models are the 720P (default) per-second price, cheapest big-brand
// models first. Text prices are per 1M tokens in the source table;
// display per 1K.
export function PopularModels(_props: PopularModelsProps) {
  const { t } = useTranslation()

  // Convert a CNY selling price to a dual display "¥X · 积分 Y".
  const formatCnyDual = (cny: number): string => {
    const { config } = getCurrencyDisplay()
    const usd = cny / config.usdExchangeRate
    return formatDualCurrencyFromUSD(usd, {
      digitsLarge: 4,
      digitsSmall: 4,
      abbreviate: false,
      cnyFirst: true,
    })
  }

  // Text prices are per 1M tokens in the source table; display per 1K.
  const textModels = [
    { name: 'claude-opus-5', inputCnyPer1M: 7.2, outputCnyPer1M: 36 },
    { name: 'gemini-3.1-pro-preview', inputCnyPer1M: 5.2, outputCnyPer1M: 31 },
    { name: 'deepseek-v4-pro', inputCnyPer1M: 10.8, outputCnyPer1M: 32.4 },
    { name: 'gpt-6.1-sol', inputCnyPer1M: 0.9, outputCnyPer1M: 4.5 },
    { name: 'grok-4.6', inputCnyPer1M: 1.5, outputCnyPer1M: 5.2 },
  ]

  const imageModels = [
    { name: 'gpt-image-2.5-flare', priceCny: 0.08 },
    { name: 'doubao-seedream-5-5', priceCny: 0.26 },
    { name: 'gpt-image-2.6-sunburst', priceCny: 0.3 },
    { name: 'qwen3-image', priceCny: 0.4 },
    { name: 'nano-banana-2-1', priceCny: 0.5 },
  ]

  const videoModels = [
    { name: 'kling-4.0-flash', priceCny: 0.37 },
    { name: 'grok-imagine-video-1.5', priceCny: 0.37 },
    { name: 'grok-video-3-10s', priceCny: 0.44 },
    { name: 'kling-4.0', priceCny: 0.58 },
    { name: 'wan-3.0-video', priceCny: 0.7 },
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
                      {t('Input')} {formatCnyDual(m.inputCnyPer1M / 1000)} /{' '}
                      {t('{{unit}} tokens', { unit: '1K' })}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {t('Output')} {formatCnyDual(m.outputCnyPer1M / 1000)} /{' '}
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
                      {formatCnyDual(m.priceCny)} / {t('per image')} · 1K
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
                      {m.priceCny == null
                        ? t('Dynamic pricing')
                        : `${formatCnyDual(m.priceCny)} / ${t('per second')} · 720P`}
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
