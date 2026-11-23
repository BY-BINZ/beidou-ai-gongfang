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
import { act, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '@/i18n/locales/en.json'
import zh from '@/i18n/locales/zh.json'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { RechargeFormCard } from '../recharge-form-card'

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

const topupInfoDisabled = {
  enable_online_topup: false,
  enable_stripe_topup: false,
  pay_methods: [],
  min_topup: 1,
  stripe_min_topup: 1,
  amount_options: [],
  discount: {},
}

function renderCard(topupInfo: typeof topupInfoDisabled) {
  render(
    <I18nextProvider i18n={i18n}>
      <RechargeFormCard
        topupInfo={topupInfo}
        presetAmounts={[]}
        selectedPreset={null}
        topupAmount={1}
        paymentAmount={1}
        priceRatio={1}
        calculating={false}
        paymentLoading={null}
        redemptionCode=''
        redeeming={false}
        onSelectPreset={vi.fn()}
        onTopupAmountChange={vi.fn()}
        onPaymentMethodSelect={vi.fn()}
        onRedemptionCodeChange={vi.fn()}
        onRedeem={vi.fn()}
      />
    </I18nextProvider>
  )
}

describe('RechargeFormCard manual WeChat top-up', () => {
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

  it('shows the manual top-up tiers, points and WeChat QR when no online payment is enabled', () => {
    renderCard(topupInfoDisabled)
    // Section heading.
    expect(screen.getByText('微信充值')).toBeVisible()
    // All five RMB tiers: amount + points. No USD anywhere.
    for (const [rmb, points] of [
      ['¥99', '1,500 积分'],
      ['¥500', '8,000 积分'],
      ['¥1,000', '17,000 积分'],
      ['¥2,980', '54,000 积分'],
      ['¥9,980', '200,000 积分'],
    ]) {
      expect(screen.getByText(rmb)).toBeVisible()
      expect(screen.getByText(points)).toBeVisible()
    }
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument()
    // ¥1,000 is the recommended tier.
    expect(screen.getByText('推荐')).toBeVisible()
    // Custom amount note.
    expect(
      screen.getByText(
        '自定义金额：¥99–¥9,980，人工充值，不走在线支付，与北斗库积分体系统一。'
      )
    ).toBeVisible()
    // WeChat QR + ID.
    expect(screen.getByAltText('微信支付')).toHaveAttribute(
      'src',
      'https://www.beidouku.com/uploads/slot-1794862042878-948f16b5.webp'
    )
    expect(screen.getByText('bing123023')).toBeVisible()
    // No online-topup notice.
    expect(
      screen.queryByText('尚未启用在线充值。请使用兑换码或联系管理员。')
    ).not.toBeInTheDocument()
  })

  it('hides the manual top-up section when online payment is enabled', () => {
    renderCard({ ...topupInfoDisabled, enable_online_topup: true })
    expect(screen.queryByText('微信充值')).not.toBeInTheDocument()
    expect(screen.queryByText('bing123023')).not.toBeInTheDocument()
  })

  it('translates the manual top-up heading and WeChat ID label to English', async () => {
    renderCard(topupInfoDisabled)
    await act(() => i18n.changeLanguage('en'))
    expect(screen.getByText('WeChat top-up')).toBeVisible()
    expect(screen.getByText('WeChat ID:')).toBeVisible()
  })
})
