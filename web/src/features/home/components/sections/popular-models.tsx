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

// Model names and prices are the real upstream names and the station's
// selling prices (CNY, dapaoai 充值 column per the 2026-11-14 decision).
// Source: BEIDOU-PRICING-CONFIG.md, from the full live read of
// api.dapaoai.com/pricing on 2026-11-14 07:00 (Recharge mode, /1M unit).
// Two homepage models were delisted from that page and replaced with
// current ones: qwen3-max -> gpt-6.1-sol, grok-4.1 -> grok-4.6.
// kimi-k3 was removed from the homepage (2026-11-17, owner decision):
// it is not in APIMODELS and not in the relay's 178 models, so it cannot
// be called.
// The Doubao Seedance video models have no simple per-second price
// (dynamic upstream expression), so they show as dynamic.
// Prices are stored as numbers (CNY) and rendered as both CNY and points
// (points = ¥ / usdExchangeRate * customCurrencyExchangeRate), so the
// homepage always matches the station's configured display rates.
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
    { name: 'banana2-official-1k', priceCny: 0.5 },
    { name: 'banana2-official-2k', priceCny: 0.8 },
    { name: 'banana2-official-4k', priceCny: 1.2 },
    { name: 'bananaPRO', priceCny: 0.48 },
    { name: 'gemini-nano-banana-2.1', priceCny: 0.18 },
  ]

  const videoModels = [
    { name: 'doubao-seedance-2.5', priceCny: null },
    { name: 'doubao-seedance-2.0', priceCny: null },
    { name: 'wan3.0-video', priceCny: 0.7 },
    { name: 'wan3.0-video-official 720P', priceCny: 0.75 },
    { name: 'wan3.0-video-official 1080P', priceCny: 1.6 },
    { name: 'wan3.0-fast', priceCny: 0.45 },
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
                      {formatCnyDual(m.priceCny)} / {t('per image')}
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
                        : `${formatCnyDual(m.priceCny)} / ${t('per second')}`}
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
