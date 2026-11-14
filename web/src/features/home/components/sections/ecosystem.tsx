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
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

interface EcosystemProps {
  className?: string
}

export function Ecosystem(_props: EcosystemProps) {
  const { t } = useTranslation()

  const items = [
    {
      name: t('Beidou AI Website'),
      desc: t('Visual, video and canvas — the Beidou website'),
      href: 'https://www.beidouku.com',
    },
    {
      name: t('Infinite Canvas'),
      desc: t('Infinite-canvas creation'),
      href: 'https://www.beidouku.com/canvas',
    },
    {
      name: t('Beidou Canvas App'),
      desc: t('Desktop infinite canvas'),
      href: 'https://www.beidouku.com/canvas',
    },
    {
      name: t('Consulting & Training'),
      desc: t('AI training and workflows for business'),
      href: 'https://www.beidouku.com/consulting',
    },
  ]

  return (
    <section className='border-border/40 relative z-10 border-t px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 text-center md:mb-20'>
          <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
            {t('Beidou Ecosystem')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('One account, the whole Beidou family')}
          </h2>
        </AnimateInView>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {items.map((item, i) => (
            <AnimateInView key={item.name} delay={i * 100} animation='fade-up'>
              <a
                href={item.href}
                target='_blank'
                rel='noopener noreferrer'
                className='border-border/40 bg-card/60 hover:border-primary/40 group flex h-full flex-col rounded-xl border p-5 transition-colors'
              >
                <span className='mb-4 flex size-10 items-center justify-center rounded-lg bg-[#171410] text-lg font-bold text-[#C9A227]'>
                  北
                </span>
                <span className='mb-1 flex items-center gap-1 text-base font-semibold'>
                  {item.name}
                  <ArrowUpRight className='text-muted-foreground size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
                </span>
                <span className='text-muted-foreground text-sm leading-relaxed'>
                  {item.desc}
                </span>
              </a>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
