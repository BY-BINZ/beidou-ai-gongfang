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
import { Clapperboard, RefreshCw, Shirt, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Merchant-facing showcase for the hero: what a commercial photographer
// picks for each category, plus the three recharge plans. No code — the
// audience is e-commerce merchants, not developers. Model names are
// commercial names (proper nouns, not translated); the reasons are.
const PICKS = [
  {
    name: 'Qwen Image 3.0',
    reasonKey: 'Best at lingerie and lace reproduction',
    icon: <Shirt className='size-4 text-rose-500' />,
  },
  {
    name: 'Nano Banana 2.1',
    reasonKey: 'Strongest at model outfit swaps and identity consistency',
    icon: <RefreshCw className='size-4 text-amber-500' />,
  },
  {
    name: 'GPT Image 2.6 Sunburst',
    reasonKey: 'Most precise at complex instructions and product retouching',
    icon: <Wand2 className='size-4 text-sky-500' />,
  },
  {
    name: 'Seedance 2.5',
    reasonKey: 'Flagship video quality',
    icon: <Clapperboard className='size-4 text-violet-500' />,
  },
]

const PLANS = [
  { key: '¥99 Starter', highlight: false },
  { key: '¥2980 Standard', highlight: true },
  { key: '¥10000 Large', highlight: false },
]

interface HeroShowcaseProps {
  className?: string
}

export function HeroShowcase(props: HeroShowcaseProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`border-border/40 bg-card/60 w-full max-w-md rounded-2xl border p-6 shadow-lg backdrop-blur ${props.className ?? ''}`}
    >
      <p className='text-muted-foreground mb-1 text-[11px] font-medium tracking-widest uppercase'>
        {t('Photographer picks')}
      </p>
      <h3 className='mb-5 text-base font-semibold'>
        {t('Only the strongest model in each category')}
      </h3>

      <ul className='space-y-4'>
        {PICKS.map((pick) => (
          <li key={pick.name} className='flex items-start gap-3'>
            <span className='border-border/40 bg-muted/40 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border'>
              {pick.icon}
            </span>
            <span className='min-w-0'>
              <span className='block text-sm font-medium'>{pick.name}</span>
              <span className='text-muted-foreground block text-xs leading-relaxed'>
                {t(pick.reasonKey)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className='border-border/40 my-5 border-t' />

      <p className='text-muted-foreground mb-3 text-xs font-medium'>
        {t('Three plans · top up via WeChat')}
      </p>
      <Link to='/about' className='flex flex-wrap gap-2'>
        {PLANS.map((plan) => (
          <span
            key={plan.key}
            className={
              plan.highlight
                ? 'rounded-full border border-[#7AA2FF]/50 bg-[#7AA2FF]/10 px-3 py-1.5 text-xs font-semibold text-[#3D5AFE] dark:text-[#A9C1FF]'
                : 'border-border/50 bg-muted/40 text-muted-foreground rounded-full border px-3 py-1.5 text-xs font-medium'
            }
          >
            {t(plan.key)}
          </span>
        ))}
      </Link>
      <p className='text-muted-foreground mt-4 text-center text-[11px]'>
        {t('Pay as you go · failed calls are not charged')}
      </p>
    </div>
  )
}
