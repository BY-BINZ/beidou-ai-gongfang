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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { cn } from '@/lib/utils'

import { DOC_SECTIONS, type DocBlock } from '../content'

/**
 * Stable, content-derived key for a doc block. Blocks have no ids, and
 * the list is static, so a short content fingerprint is a unique key.
 */
function docBlockKey(block: DocBlock): string {
  switch (block.kind) {
    case 'p':
      return `p:${block.text.slice(0, 40)}`
    case 'note':
      return `note:${block.text.slice(0, 40)}`
    case 'list':
      return `list:${block.items.join('|').slice(0, 40)}`
    case 'table':
      return `table:${block.headers.join(',')}:${block.rows[0]?.join(',') ?? ''}`
    case 'code':
      return `code:${block.lang}:${block.code.slice(0, 40)}`
  }
}

function DocBlockView(props: { block: DocBlock }) {
  const block = props.block
  switch (block.kind) {
    case 'p':
      return <p className='text-muted-foreground leading-7'>{block.text}</p>
    case 'note':
      return (
        <div className='border-primary/40 bg-primary/5 rounded-lg border-l-4 px-4 py-3 text-sm leading-6'>
          {block.text}
        </div>
      )
    case 'list':
      return (
        <ul className='text-muted-foreground list-disc space-y-1 pl-5 leading-7'>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className='overflow-x-auto rounded-lg border'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-muted/60 border-b text-left'>
                {block.headers.map((header) => (
                  <th key={header} className='px-3 py-2 font-medium'>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={row.join('|')}
                  className={cn(rowIndex > 0 && 'border-t')}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cell}
                      className={cn(
                        'px-3 py-2 align-top leading-6',
                        cellIndex === 0 && 'font-mono text-xs break-all'
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'code':
      return (
        <div className='relative overflow-hidden rounded-lg border'>
          <div className='bg-muted/60 flex items-center justify-between border-b px-3 py-1.5'>
            <span className='text-muted-foreground text-xs'>{block.lang}</span>
            <CopyButton
              value={block.code}
              className='size-6'
              iconClassName='size-3.5'
            />
          </div>
          <pre className='bg-muted/30 overflow-x-auto p-4 text-[13px] leading-6'>
            <code>{block.code}</code>
          </pre>
        </div>
      )
  }
}

/**
 * The API access guide itself, without the public page chrome. Kept
 * separate from the layout wrapper so the guide can be tested without a
 * router or server status.
 */
export function DocsContent() {
  const { t } = useTranslation()
  // The page loads at the top, so the first section starts out current.
  const [activeSection, setActiveSection] = useState(DOC_SECTIONS[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        // The section nearest the top of the viewport is the one being read.
        visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        )
        const top = visible[0]
        if (top) setActiveSection(top.target.id)
      },
      // The band starts below the fixed header and covers the top part of
      // the viewport, so the highlight follows the section just read.
      { rootMargin: '-96px 0px -55% 0px' }
    )
    for (const section of DOC_SECTIONS) {
      const element = document.querySelector(`#${section.id}`)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <div className='mx-auto flex max-w-6xl gap-8'>
      <aside className='sticky top-24 hidden h-fit w-48 shrink-0 lg:block'>
        <nav aria-label={t('Docs')} className='flex flex-col gap-1'>
          {DOC_SECTIONS.map((section) => {
            const isActive = section.id === activeSection
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {section.title}
              </a>
            )
          })}
        </nav>
      </aside>
      <div className='min-w-0 flex-1 space-y-10 pb-12'>
        <header className='space-y-2'>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('Docs')}</h1>
          <p className='text-muted-foreground leading-7'>
            星门 API 是 OpenAI 兼容接口：一个 Key
            调用文字、图片、视频、音频模型。本指南与上游 APIMODELS
            的文档同步，接口与参数一致。
          </p>
        </header>
        {DOC_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-label={section.title}
            className='scroll-mt-24 space-y-4'
          >
            <h2 className='text-xl font-semibold tracking-tight'>
              {section.title}
            </h2>
            {section.blocks.map((block) => (
              <DocBlockView key={docBlockKey(block)} block={block} />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
