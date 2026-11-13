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
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Ecosystem } from '../ecosystem'
import { PopularModels } from '../popular-models'

function BeidouSections() {
  return (
    <>
      <Ecosystem />
      <PopularModels />
    </>
  )
}

async function renderSections() {
  const router = createRouter({
    routeTree: createRootRoute({ component: BeidouSections }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

describe('Beidou home sections', () => {
  it('ecosystem shows the four Beidou destinations with their links', async () => {
    await renderSections()
    expect(
      screen.getByRole('heading', {
        name: 'One account, the whole Beidou family',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Beidou Ecosystem')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Beidou AI Website/ })
    ).toHaveAttribute('href', 'https://www.beidouku.com')
    expect(
      screen.getByRole('link', { name: /Infinite Canvas/ })
    ).toHaveAttribute('href', 'https://www.beidouku.com/canvas')
    expect(
      screen.getByRole('link', { name: /Beidou Canvas App/ })
    ).toHaveAttribute('href', 'https://www.beidouku.com/canvas')
    expect(
      screen.getByRole('link', { name: /Consulting & Training/ })
    ).toHaveAttribute('href', 'https://www.beidouku.com/consulting')
  })

  it('popular models lists real upstream model names with reference prices', async () => {
    await renderSections()
    expect(
      screen.getByRole('heading', {
        name: 'Text, image and video — the models merchants actually use',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Popular Models')).toBeInTheDocument()
    // Text models: per-1M-token input/output prices.
    expect(screen.getByText('claude-opus-5')).toBeInTheDocument()
    expect(screen.getByText('gemini-3.1-pro-preview')).toBeInTheDocument()
    // Image models: per-image prices.
    expect(screen.getByText('banana2-official-1k')).toBeInTheDocument()
    expect(screen.getByText('bananaPRO')).toBeInTheDocument()
    // Two image models share the ¥0.08 per-image price.
    expect(screen.getAllByText(/¥0\.08 per image/)).toHaveLength(2)
    // Video models: per-second prices, dynamic ones labelled as such.
    expect(screen.getByText('wan3.0-video')).toBeInTheDocument()
    expect(screen.getByText(/¥0\.7 per second/)).toBeInTheDocument()
    expect(screen.getAllByText('Dynamic pricing')).toHaveLength(2)
    // The footnote points to the live price list, not the static numbers.
    // (The Button renders its link with role="button".)
    expect(
      screen.getByRole('button', { name: /View Model Square/ })
    ).toHaveAttribute('href', '/pricing')
  })
})
