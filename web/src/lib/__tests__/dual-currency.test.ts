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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { formatCNYFromUSD, formatDualCurrencyFromUSD } from '@/lib/currency'
import { formatDualQuota } from '@/lib/format'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

// Station display: custom currency "积分", 1 USD = 200 points,
// USD exchange rate 7.3 (1 point = $0.005 = ¥0.0365).
const STARGATE_CURRENCY = {
  ...DEFAULT_CURRENCY_CONFIG,
  quotaDisplayType: 'CUSTOM' as const,
  customCurrencySymbol: '积分',
  customCurrencyExchangeRate: 200,
  usdExchangeRate: 7.3,
}

describe('dual currency display (points + CNY)', () => {
  beforeEach(() => {
    useSystemConfigStore
      .getState()
      .setConfig({ currency: { ...STARGATE_CURRENCY } })
  })

  afterEach(() => {
    useSystemConfigStore
      .getState()
      .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
  })

  it('formats a USD amount as CNY using the exchange rate', () => {
    expect(formatCNYFromUSD(1)).toBe('¥7.3')
    expect(formatCNYFromUSD(0.5)).toBe('¥3.65')
  })

  it('formats a USD amount as points first then CNY', () => {
    expect(formatDualCurrencyFromUSD(1)).toBe('积分 200 · ¥7.3')
  })

  it('formats a USD amount as CNY first then points when cnyFirst', () => {
    expect(formatDualCurrencyFromUSD(1, { cnyFirst: true })).toBe(
      '¥7.3 · 积分 200'
    )
  })

  it('formats quota as points + CNY (balance example)', () => {
    // 39,984.1 points = $199.9205 = 99,960,250 quota units.
    expect(formatDualQuota(99_960_250)).toBe('积分 39,984.1 · ¥1,459.42')
  })

  it('formats a per-image price as CNY + points (banana example)', () => {
    // $0.0685 per image -> ¥0.5001 (0.0685 x 7.3) and 13.7 points.
    // The CNY shows the exact conversion of the stored USD price;
    // it is not rounded to a "nice" ¥0.50 because the USD price itself
    // is the stored value.
    expect(
      formatDualCurrencyFromUSD(0.0685, {
        digitsLarge: 4,
        digitsSmall: 4,
        abbreviate: false,
        cnyFirst: true,
      })
    ).toBe('¥0.5001 · 积分 13.7')
  })

  it('returns a dash for null or NaN input', () => {
    expect(formatCNYFromUSD(null)).toBe('-')
    expect(formatDualCurrencyFromUSD(undefined)).toBe('-')
    expect(formatDualCurrencyFromUSD(Number.NaN)).toBe('-')
  })
})
