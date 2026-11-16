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
import { type SVGProps } from 'react'

import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='stargate-logo'
      viewBox='0 0 64 64'
      xmlns='http://www.w3.org/2000/svg'
      height='24'
      width='24'
      className={cn('size-6', className)}
      {...props}
    >
      <title>星门 API</title>
      <defs>
        <linearGradient id='stargate' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#7AA2FF' />
          <stop offset='1' stopColor='#A78BFA' />
        </linearGradient>
      </defs>
      <rect x='2' y='2' width='60' height='60' rx='14' fill='#0B1026' />
      <circle
        cx='32'
        cy='33'
        r='15'
        fill='none'
        stroke='url(#stargate)'
        strokeWidth='5'
      />
      <path
        d='M32 21 L34.6 30.4 L44 33 L34.6 35.6 L32 45 L29.4 35.6 L20 33 L29.4 30.4 Z'
        fill='#FFFFFF'
      />
      <path
        d='M23 45 L13 57'
        stroke='url(#stargate)'
        strokeWidth='4'
        strokeLinecap='round'
      />
      <path
        d='M41 45 L51 57'
        stroke='url(#stargate)'
        strokeWidth='4'
        strokeLinecap='round'
      />
      <path
        d='M15 13 L16 16 L19 17 L16 18 L15 21 L14 18 L11 17 L14 16 Z'
        fill='#A78BFA'
      />
      <path
        d='M25 7 L26 10 L29 11 L26 12 L25 15 L24 12 L21 11 L24 10 Z'
        fill='#7AA2FF'
      />
    </svg>
  )
}
