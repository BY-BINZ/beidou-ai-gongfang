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

interface PopularModelsProps {
  className?: string
}

// Model names and prices are the real upstream names and the station's
// reference prices (CNY). The live price list is the Model Square page;
// the per-second price of the Doubao Seedance models is dynamic upstream.
export function PopularModels(_props: PopularModelsProps) {
  const { t } = useTranslation()

  const textModels = [
    { name: 'claude-opus-5', input: '¥1.8', output: '¥9' },
    { name: 'gemini-3.1-pro-preview', input: '¥1.3', output: '¥7.75' },
    { name: 'deepseek-v4-pro', input: '¥2.7', output: '¥8.1' },
    { name: 'qwen3-max', input: '¥1.5', output: '¥5.6' },
    { name: 'grok-4.1', input: '¥3.75', output: '¥18.75' },
    { name: 'kimi-k3', input: '¥1.8', output: '¥7.5' },
  ]

  const imageModels = [
    { name: 'banana2-official-1k', price: '¥0.08' },
    { name: 'banana2-official-2k', price: '¥0.12' },
    { name: 'banana2-official-4k', price: '¥0.18' },
    { name: 'bananaPRO', price: '¥0.08' },
    { name: 'gemini-nano-banana-2.1', price: '¥0.18' },
  ]

  const videoModels = [
    { name: 'doubao-seedance-2.5', price: null },
    { name: 'doubao-seedance-2.0', price: null },
    { name: 'wan3.0-video', price: '¥0.7' },
    { name: 'wan3.0-video-official 720P', price: '¥0.75' },
    { name: 'wan3.0-video-official 1080P', price: '¥1.6' },
    { name: 'wan3.0-fast', price: '¥0.45' },
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
                      {t('Input')} {m.input} / {t('Output')} {m.output} ·{' '}
                      {t('per 1M tokens')}
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
                  <li
                    key={m.name}
                    className='flex items-baseline justify-between gap-2'
                  >
                    <span className='text-sm font-medium'>{m.name}</span>
                    <span className='text-muted-foreground shrink-0 text-xs'>
                      {m.price} {t('per image')}
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
                  <li
                    key={m.name}
                    className='flex items-baseline justify-between gap-2'
                  >
                    <span className='text-sm font-medium'>{m.name}</span>
                    <span className='text-muted-foreground shrink-0 text-xs'>
                      {m.price
                        ? `${m.price} ${t('per second')}`
                        : t('Dynamic pricing')}
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
