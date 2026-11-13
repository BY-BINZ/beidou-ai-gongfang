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
import { cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { useTopNavLinks } from '../use-top-nav-links'

afterEach(() => {
  cleanup()
})

function navLinks(headerNavModules?: Record<string, unknown>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (headerNavModules) {
    client.setQueryData(['status'], { HeaderNavModules: headerNavModules })
  }
  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }
  return renderHook(() => useTopNavLinks(), { wrapper: Wrapper }).result
    .current
}

describe('useTopNavLinks — 北斗AI工坊 navigation', () => {
  it('shows the Beidou ecosystem links after Home and before Console', () => {
    const links = navLinks()
    expect(links.map((link) => link.title)).toEqual([
      'Home',
      'Infinite Canvas',
      'Resource Hub',
      'Console',
      'Model Square',
      'Rankings',
      'Docs',
      'Contact Us',
    ])
    expect(links[1]).toMatchObject({
      href: 'https://www.beidouku.com/canvas',
      external: true,
    })
    expect(links[2]).toMatchObject({
      href: 'https://www.beidouku.com',
      external: true,
    })
  })

  it('labels the about page as Contact Us and links it to /about', () => {
    const links = navLinks()
    expect(
      links.find((link) => link.title === 'Contact Us')
    ).toMatchObject({ href: '/about' })
  })

  it('has no ComfyUI entry: Beidou has no node repo yet', () => {
    const links = navLinks()
    expect(
      links.some(
        (link) =>
          /comfyui/i.test(link.title) || /comfyui/i.test(link.href)
      )
    ).toBe(false)
  })

  it('keeps the Beidou links when every built-in module is disabled', () => {
    const links = navLinks({
      home: false,
      console: false,
      pricing: { enabled: false, requireAuth: false },
      rankings: { enabled: false, requireAuth: false },
      docs: false,
      about: false,
    })
    expect(links).toEqual([
      {
        title: 'Infinite Canvas',
        href: 'https://www.beidouku.com/canvas',
        external: true,
      },
      {
        title: 'Resource Hub',
        href: 'https://www.beidouku.com',
        external: true,
      },
    ])
  })
})
