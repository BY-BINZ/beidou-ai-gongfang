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
import { useQuery } from '@tanstack/react-query'
import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { RichContent } from '@/components/rich-content'
import { Skeleton } from '@/components/ui/skeleton'
import { isHttpUrl, isLikelyHtml } from '@/lib/content-format'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getAboutContent } from './api'

function EmptyAboutState() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <div className='flex min-h-[60vh] items-center justify-center p-8'>
      <div className='max-w-2xl space-y-6 text-center'>
        <div className='flex justify-center'>
          <Construction className='text-muted-foreground h-24 w-24' />
        </div>
        <div className='space-y-2'>
          <h2 className='text-2xl font-bold'>{t('No About Content Set')}</h2>
          <p className='text-muted-foreground'>
            {t(
              'The administrator has not configured any about content yet. You can set it in the settings page, supporting HTML or URL.'
            )}
          </p>
        </div>
        <div className='space-y-4 text-sm'>
          <p>
            {t('New API Project Repository:')}{' '}
            <a
              href='https://github.com/QuantumNous/new-api'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('https://github.com/QuantumNous/new-api')}
            </a>
          </p>
          <p className='text-muted-foreground'>
            <a
              href='https://github.com/QuantumNous/new-api'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('NewAPI')}
            </a>{' '}
            © {currentYear}{' '}
            <a
              href='https://github.com/QuantumNous'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('QuantumNous')}
            </a>{' '}
            {t('| Based on')}{' '}
            <a
              href='https://github.com/songquanpeng/one-api'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('One API')}
            </a>{' '}
            © 2023{' '}
            <a
              href='https://github.com/songquanpeng'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('JustSong')}
            </a>
          </p>
          <p className='text-muted-foreground'>
            {t('This project must be used in compliance with the')}{' '}
            <a
              href='https://github.com/QuantumNous/new-api/blob/main/LICENSE'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('AGPL v3.0 License')}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

const STARGATE_RECHARGE_TIERS = [
  { rmb: '¥99', points: '1,500 积分', label: '入门体验', desc: '约 125 张 4K 成片 · 与北斗库一致' },
  { rmb: '¥500', points: '8,000 积分', label: '标准算力', desc: '中小店铺高频上新首选' },
  { rmb: '¥1,000', points: '17,000 积分', label: '进阶常用', desc: '高频出图高性价比档', recommended: true },
  { rmb: '¥2,980', points: '54,000 积分', label: '商业团队', desc: '成熟店铺与视觉工作室' },
  { rmb: '¥9,980', points: '200,000 积分', label: '企业定制', desc: '大额算力池 · 最低单价' },
]

function StargateRechargePage() {
  return (
    <div className='mx-auto max-w-4xl px-4 py-10'>
      <div className='border-border/60 bg-card rounded-2xl border p-6 shadow-sm sm:p-8'>
        <span className='bg-primary/10 text-primary mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider'>
          星门 API · ASTRAPORT
        </span>
        <h1 className='text-primary text-2xl font-bold sm:text-3xl'>充值</h1>
        <p className='text-muted-foreground mt-2 text-sm'>
          星门 API · 一个 key 接通文字、图片、视频模型，与北斗库积分体系统一。充值、开户、售后都直接找我们，人工对接。
        </p>

        <div className='mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5'>
          <div className='mb-3 text-sm font-semibold'>微信充值 · 加微信付款</div>
          <div className='flex flex-wrap items-start gap-5'>
            <div className='text-center'>
              <img
                src='https://www.beidouku.com/uploads/slot-1794862042878-948f16b5.webp'
                alt='微信支付'
                className='h-auto w-36 rounded-lg border bg-white p-1'
              />
              <div className='text-muted-foreground mt-1.5 text-xs'>扫码加微信付款</div>
            </div>
            <div className='min-w-0 flex-1 space-y-2 text-sm'>
              <p>
                微信号：
                <span className='font-bold text-[#07C160]'>bing123023</span>
                <span className='text-muted-foreground'>（加微信请备注“API 中转”）</span>
              </p>
              <p className='text-muted-foreground leading-relaxed'>
                加微信 → 说明要充多少档位 → 微信付款 → 我们手动把积分余额加到你的账号里，到账后微信通知你。
              </p>
            </div>
          </div>
        </div>

        <div className='mt-7'>
          <div className='mb-3 flex flex-wrap items-baseline justify-between gap-2'>
            <h2 className='text-base font-semibold'>充值套餐（与北斗库积分体系统一）</h2>
            <span className='text-muted-foreground text-xs'>积分永久有效 · 按量计费 · 失败不扣费</span>
          </div>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
            {STARGATE_RECHARGE_TIERS.map((tier) => (
              <div
                key={tier.rmb}
                className={
                  tier.recommended
                    ? 'border-primary bg-primary/5 relative rounded-xl border-2 p-4 text-center shadow-xs'
                    : 'border-border/70 bg-background/60 rounded-xl border p-4 text-center'
                }
              >
                {tier.recommended ? (
                  <span className='bg-primary text-primary-foreground mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold'>
                    推荐
                  </span>
                ) : (
                  <span className='text-muted-foreground mb-1.5 inline-block text-[11px] font-medium'>
                    {tier.label}
                  </span>
                )}
                <div className='text-xl font-bold'>{tier.rmb}</div>
                <div className='text-primary mt-1 text-sm font-bold'>{tier.points}</div>
                <div className='text-muted-foreground mt-1.5 text-[11px] leading-snug'>{tier.desc}</div>
              </div>
            ))}
          </div>
          <p className='text-muted-foreground mt-3 text-xs'>
            自定义金额：¥99–¥9,980，人工充值，不走在线支付；充多少、得多少积分，加微信时确认。
          </p>
        </div>

        <div className='border-border/60 bg-muted/30 mt-6 rounded-xl border p-5'>
          <h3 className='mb-2.5 text-sm font-semibold'>怎么用</h3>
          <ol className='text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm'>
            <li>本站注册账号</li>
            <li>加微信充值，管理员手动加款到账</li>
            <li>在“令牌”页创建一个 API key</li>
            <li>
              在 BD Studio 系统设置 → API 选择「星门API」，接口地址填{' '}
              <code className='text-primary font-mono'>https://api.beidouku.com/v1</code>，填入你的 key 即可实时查看星门积分
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export function About() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['about-content'],
    queryFn: async () => requireServerSuccess(await getAboutContent()),
  })

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0
  const isLegacyStaticRecharge =
    hasContent &&
    (rawContent.includes('27,400') || rawContent.includes('82,200') || rawContent.includes('ASTRAPORT'))
  const isUrl = hasContent && isHttpUrl(rawContent)
  const contentIsHtml = hasContent && isLikelyHtml(rawContent)

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto flex max-w-4xl flex-col gap-4 py-12'>
          <Skeleton className='h-8 w-[45%]' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-[90%]' />
          <Skeleton className='h-4 w-[80%]' />
        </div>
      </PublicLayout>
    )
  }

  if (!hasContent || isLegacyStaticRecharge) {
    return (
      <PublicLayout>
        <StargateRechargePage />
      </PublicLayout>
    )
  }

  if (isUrl) {
    return (
      <PublicLayout showMainContainer={false}>
        <iframe
          src={rawContent}
          className='h-[calc(100vh-3.5rem)] w-full border-0'
          title={t('About')}
          sandbox='allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts'
        />
      </PublicLayout>
    )
  }

  if (contentIsHtml) {
    return (
      <PublicLayout showMainContainer={false}>
        <RichContent
          mode='html'
          htmlVariant='isolated'
          content={rawContent}
          className='prose-neutral dark:prose-invert max-w-none'
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-8'>
        <RichContent
          mode='markdown'
          content={rawContent}
          className='prose-neutral dark:prose-invert max-w-none'
        />
      </div>
    </PublicLayout>
  )
}
