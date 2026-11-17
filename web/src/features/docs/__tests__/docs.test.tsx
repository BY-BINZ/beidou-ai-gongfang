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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DocsContent } from '../components/docs-content'
import { DOC_SECTIONS } from '../content'

// jsdom has no IntersectionObserver; the docs sidebar scroll-spy drives off
// it, so install a controllable stand-in that records the callback.
type SpyCallback = (entries: IntersectionObserverEntry[]) => void

let spyCallback: SpyCallback | null = null
const observedTargets: Element[] = []

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds: ReadonlyArray<number> = []

  constructor(callback: IntersectionObserverCallback) {
    spyCallback = (entries) => callback(entries, this)
  }

  observe(target: Element): void {
    observedTargets.push(target)
  }

  unobserve(target: Element): void {
    const index = observedTargets.indexOf(target)
    if (index >= 0) observedTargets.splice(index, 1)
  }

  disconnect(): void {
    observedTargets.length = 0
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

const originalIntersectionObserver = globalThis.IntersectionObserver

beforeEach(() => {
  spyCallback = null
  observedTargets.length = 0
  globalThis.IntersectionObserver = MockIntersectionObserver
})

afterEach(() => {
  globalThis.IntersectionObserver = originalIntersectionObserver
})

function spyEntry(target: Element, top: number): IntersectionObserverEntry {
  return {
    target,
    isIntersecting: true,
    boundingClientRect: { top } as DOMRect,
    intersectionRatio: 1,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    time: 0,
  }
}

function sidebarLink(sectionId: string): HTMLAnchorElement {
  const nav = screen.getByRole('navigation', { name: 'Docs' })
  const link = nav.querySelector(`a[href="#${sectionId}"]`)
  if (!link) throw new Error(`missing sidebar link for ${sectionId}`)
  return link as HTMLAnchorElement
}

describe('Docs page', () => {
  it('renders the guide title and every section', () => {
    render(<DocsContent />)
    expect(screen.getByRole('heading', { name: 'Docs' })).toBeVisible()
    for (const section of DOC_SECTIONS) {
      expect(screen.getByRole('heading', { name: section.title })).toBeVisible()
    }
  })

  it('links the sidebar to each section', () => {
    render(<DocsContent />)
    const nav = screen.getByRole('navigation', { name: 'Docs' })
    for (const section of DOC_SECTIONS) {
      expect(nav.querySelector(`a[href="#${section.id}"]`)).not.toBeNull()
    }
  })

  it('shows the relay base URL in the quickstart section', () => {
    render(<DocsContent />)
    expect(
      screen.getAllByText(/api\.beidouku\.com\/v1/).length
    ).toBeGreaterThan(0)
  })

  it('shows the async failure codes', () => {
    render(<DocsContent />)
    expect(screen.getByText('CONTENT_MODERATION')).toBeVisible()
    expect(screen.getByText('INSUFFICIENT_BALANCE')).toBeVisible()
  })
})

describe('Docs sidebar', () => {
  it('gives every sidebar link a hover background', () => {
    render(<DocsContent />)
    // The first section starts out current, so it hovers to a deeper
    // primary tint; the rest hover to the muted background.
    expect(sidebarLink(DOC_SECTIONS[0].id)).toHaveClass('hover:bg-primary/15')
    for (const section of DOC_SECTIONS.slice(1)) {
      expect(sidebarLink(section.id)).toHaveClass('hover:bg-muted')
    }
  })

  it('marks the first section current on load and observes every section', () => {
    render(<DocsContent />)
    expect(sidebarLink(DOC_SECTIONS[0].id)).toHaveAttribute(
      'aria-current',
      'true'
    )
    expect(observedTargets).toHaveLength(DOC_SECTIONS.length)
    for (const section of DOC_SECTIONS) {
      expect(observedTargets).toContain(
        document.querySelector(`#${section.id}`)
      )
    }
  })

  it('moves the current highlight to the section in view', () => {
    render(<DocsContent />)
    const video = document.querySelector('#video')
    if (!video) throw new Error('missing video section')
    act(() => {
      spyCallback?.([spyEntry(video, 100)])
    })
    expect(sidebarLink('video')).toHaveAttribute('aria-current', 'true')
    expect(sidebarLink('video')).toHaveClass('bg-primary/10', 'text-primary')
    expect(sidebarLink('quickstart')).not.toHaveAttribute('aria-current')
    expect(sidebarLink('quickstart')).not.toHaveClass('bg-primary/10')
  })

  it('keeps the previous highlight when no section is in view', () => {
    render(<DocsContent />)
    const video = document.querySelector('#video')
    if (!video) throw new Error('missing video section')
    act(() => {
      spyCallback?.([spyEntry(video, 100)])
    })
    act(() => {
      spyCallback?.([{ ...spyEntry(video, 100), isIntersecting: false }])
    })
    expect(sidebarLink('video')).toHaveAttribute('aria-current', 'true')
  })
})
