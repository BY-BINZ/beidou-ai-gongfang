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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

import { PublicHeader } from '../public-header'

async function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // Seeded query data stays fresh (5 minute staleTime), so the header
  // renders from cache and never hits the network in tests.
  client.setQueryData(STATUS_QUERY_KEY, { announcements_enabled: false })
  client.setQueryData(['notice'], { success: true, data: '' })
  const router = createRouter({
    routeTree: createRootRoute({ component: () => <PublicHeader /> }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function headerNav(): HTMLElement {
  const nav = document.querySelector('header nav')
  if (!nav) throw new Error('missing header nav')
  return nav as HTMLElement
}

function headerWrapper(): HTMLElement {
  const wrapper = document.querySelector('header > div')
  if (!wrapper) throw new Error('missing header wrapper')
  return wrapper as HTMLElement
}

function setScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  setScrollY(0)
})

describe('PublicHeader scrolled state', () => {
  it('renders the full-width bar at the top of the page', async () => {
    setScrollY(0)
    await renderHeader()
    expect(headerNav()).toHaveClass('h-16')
    expect(headerNav()).not.toHaveClass('border-b')
    expect(headerWrapper()).toHaveClass('max-w-7xl', 'pt-0')
  })

  it('stays a solid full-width bar when scrolled, never a floating pill', async () => {
    setScrollY(0)
    await renderHeader()
    act(() => {
      setScrollY(100)
      window.dispatchEvent(new Event('scroll'))
    })
    // Opaque bar with a bottom border: no page content can show through
    // or above it.
    expect(headerNav()).toHaveClass('bg-background', 'border-b', 'h-14')
    expect(headerNav()).not.toHaveClass(
      'bg-background/60',
      'rounded-2xl',
      'ring-[0.5px]'
    )
    // Same full width as the unscrolled bar: no shrink, no top gap.
    expect(headerWrapper()).toHaveClass('max-w-7xl', 'pt-0')
    expect(headerWrapper()).not.toHaveClass('max-w-[52rem]', 'pt-3')
  })
})
