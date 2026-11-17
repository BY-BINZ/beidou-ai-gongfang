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
import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import en from '@/i18n/locales/en.json'
import zh from '@/i18n/locales/zh.json'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { WalletStatsCard } from '../wallet-stats-card'

// Station display: custom currency "积分", 1 USD = 200 points,
// USD exchange rate 7.3 (1 point = $0.005 = ¥0.0365).
const STARGATE_CURRENCY = {
  ...DEFAULT_CURRENCY_CONFIG,
  quotaDisplayType: 'CUSTOM' as const,
  customCurrencySymbol: '积分',
  customCurrencyExchangeRate: 200,
  usdExchangeRate: 7.3,
}

const i18n = createInstance()

describe('WalletStatsCard balance', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'zh',
      fallbackLng: false,
      nsSeparator: false,
      resources: { en, zh },
      interpolation: { escapeValue: false },
    })
    useSystemConfigStore
      .getState()
      .setConfig({ currency: { ...STARGATE_CURRENCY } })
  })

  afterEach(() => {
    useSystemConfigStore
      .getState()
      .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
  })

  it('shows the balance as points and RMB together', () => {
    // 12,500,000 quota units = 5,000 points = ¥182.5 (dual display trims
    // the trailing zero).
    render(
      <I18nextProvider i18n={i18n}>
        <WalletStatsCard
          user={{
            id: 1,
            username: 'buyer',
            quota: 12_500_000,
            used_quota: 0,
            request_count: 0,
            aff_quota: 0,
            aff_history_quota: 0,
            aff_count: 0,
            group: 'default',
          }}
        />
      </I18nextProvider>
    )
    expect(screen.getByText('积分 5,000 · ¥182.5')).toBeVisible()
    expect(screen.getByText('当前余额')).toBeVisible()
  })
})
