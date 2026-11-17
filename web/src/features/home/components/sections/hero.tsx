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
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { HeroShowcase } from '../hero-showcase'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

// Brand line: commercial-grade delivery, not price. No "cheaper than
// official" / "save X%" claims — Stargate sells on a commercial
// photographer's curation and output quality. No code on this page:
// the audience is e-commerce merchants, not developers.
const SELLING_POINTS = [
  {
    titleKey: 'Photographer-curated',
    descKey: 'Only the latest top models, picked one by one',
  },
  {
    titleKey: 'Best apparel reproduction',
    descKey:
      'Cut, fabric and lace — form, material and lighting kept consistent',
  },
  {
    titleKey: 'Studio-grade lighting',
    descKey: 'Even a warehouse snapshot gets studio lighting',
  },
]

export function Hero(props: HeroProps) {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 overflow-hidden px-6 pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-36 lg:pb-28'>
      {/* Radial gradient background */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-[0.12]'
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.14 265 / 80%) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.71 0.16 294 / 60%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 40% 80%, oklch(0.66 0.16 263 / 40%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      {/* Grid pattern */}
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black_20%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.08]'
      />

      <div className='mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-8'>
        {/* Left Column: Title, description, selling points and actions */}
        <div className='flex flex-col items-start text-left lg:col-span-6'>
          {/* Top Pill Badge */}
          <div
            className='landing-animate-fade-up mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#7AA2FF]/30 bg-[#7AA2FF]/10 px-3 py-1.5 text-[11px] font-medium text-[#3D5AFE] opacity-0 shadow-xs dark:border-[#7AA2FF]/30 dark:bg-[#7AA2FF]/10 dark:text-[#A9C1FF]'
            style={{ animationDelay: '0ms' }}
          >
            <span className='relative flex size-1.5'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7AA2FF] opacity-75' />
              <span className='relative inline-flex size-1.5 rounded-full bg-[#7AA2FF]' />
            </span>
            <span>
              {t('Curated by a commercial photographer · 178 models')}
            </span>
          </div>

          <h1
            className='landing-animate-fade-up text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.15] font-bold tracking-tight'
            style={{ animationDelay: '60ms' }}
          >
            {t('One key for 178 AI models.')}
            <br />
            <span className='bg-gradient-to-r from-[#7AA2FF] via-[#A78BFA] to-[#5B8DEF] bg-clip-text text-transparent'>
              {t('Commercial-grade delivery for e-commerce visuals.')}
            </span>
          </h1>
          <p
            className='landing-animate-fade-up text-muted-foreground/80 mt-5 max-w-xl text-base leading-relaxed opacity-0 md:text-[15px]'
            style={{ animationDelay: '120ms' }}
          >
            {t(
              "Stargate API is an aggregation platform where a commercial photographer hand-picks every model: the AI reads each garment's cut, fabric and design details, then generates model try-on shots, white-background images, detail shots and selling-point images — keeping the product's form, material and lighting consistent throughout. Output is stable and ready for commercial use."
            )}
          </p>

          <ul
            className='landing-animate-fade-up mt-7 space-y-2.5 opacity-0'
            style={{ animationDelay: '160ms' }}
          >
            {SELLING_POINTS.map((point) => (
              <li key={point.titleKey} className='flex items-start gap-2.5'>
                <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-[#7AA2FF]' />
                <span className='text-sm leading-relaxed'>
                  <span className='font-semibold'>{t(point.titleKey)}</span>
                  <span className='text-muted-foreground' aria-hidden>
                    {' — '}
                  </span>
                  <span className='text-muted-foreground'>
                    {t(point.descKey)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div
            className='landing-animate-fade-up mt-8 flex flex-wrap items-center gap-3 opacity-0'
            style={{ animationDelay: '180ms' }}
          >
            {props.isAuthenticated ? (
              <Button
                className='group h-11 rounded-lg px-5 text-sm font-medium'
                render={<Link to='/dashboard' />}
              >
                {t('Go to Dashboard')}
                <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
              </Button>
            ) : (
              <>
                <Button
                  className='group h-11 rounded-lg px-5 text-sm font-medium'
                  render={<Link to='/sign-up' />}
                >
                  {t('Get API Key')}
                  <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Button>
                <Button
                  variant='outline'
                  className='border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-5 text-sm font-medium'
                  render={<Link to='/pricing' />}
                >
                  {t('Browse Models')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: photographer-curated showcase (no code) */}
        <div
          className='landing-animate-fade-up flex w-full justify-center opacity-0 lg:col-span-6'
          style={{ animationDelay: '320ms' }}
        >
          <HeroShowcase className='mt-8 lg:mt-0' />
        </div>
      </div>
    </section>
  )
}
