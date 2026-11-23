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

import { Hero } from '../hero'

async function renderHero(isAuthenticated = false) {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <Hero isAuthenticated={isAuthenticated} />,
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

describe('Hero', () => {
  it('leads with commercial-grade delivery, not price', async () => {
    await renderHero()
    expect(
      screen.getByText('Curated by a commercial photographer · 178 models')
    ).toBeInTheDocument()
    expect(screen.getByText('One key for 178 AI models.')).toBeInTheDocument()
    expect(
      screen.getByText('Commercial-grade delivery for e-commerce visuals.')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Stargate API is an aggregation platform where a commercial photographer hand-picks every model: the AI reads each garment's cut, fabric and design details, then generates model try-on shots, white-background images, detail shots and selling-point images — keeping the product's form, material and lighting consistent throughout. Output is stable and ready for commercial use."
      )
    ).toBeInTheDocument()
    // No cheap / save / discount wording anywhere on the hero.
    expect(screen.queryByText(/cheap/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/save/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/discount/i)).not.toBeInTheDocument()
  })

  it('lists the three photographer selling points', async () => {
    await renderHero()
    expect(screen.getByText('Photographer-curated')).toBeInTheDocument()
    expect(
      screen.getByText('Only the latest top models, picked one by one')
    ).toBeInTheDocument()
    expect(screen.getByText('Best apparel reproduction')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cut, fabric and lace — form, material and lighting kept consistent'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Studio-grade lighting')).toBeInTheDocument()
    expect(
      screen.getByText('Even a warehouse snapshot gets studio lighting')
    ).toBeInTheDocument()
  })

  it('shows the photographer picks and recharge plans, with no code', async () => {
    await renderHero()
    expect(
      screen.getByText('Only the strongest model in each category')
    ).toBeInTheDocument()
    expect(screen.getByText('Photographer picks')).toBeInTheDocument()
    expect(screen.getByText('Google Gemini 3.8 Flash')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Best at prompt engineering, copywriting and storyboard analysis'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Nano Banana 2.1')).toBeInTheDocument()
    expect(screen.getByText('GPT Image 2.6 Sunburst')).toBeInTheDocument()
    expect(screen.getByText('Seedance 2.5')).toBeInTheDocument()
    expect(screen.getByText('Flagship video quality')).toBeInTheDocument()
    expect(
      screen.getByText('Three plans · top up via WeChat')
    ).toBeInTheDocument()
    expect(screen.getByText('¥99 Starter')).toBeInTheDocument()
    expect(screen.getByText('¥1000 Standard')).toBeInTheDocument()
    expect(screen.getByText('¥2980 Team')).toBeInTheDocument()
    expect(screen.getByText('¥9980 Enterprise')).toBeInTheDocument()
    expect(
      screen.getByText('Pay as you go · failed calls are not charged')
    ).toBeInTheDocument()
    // The old terminal demo is gone: no code snippet anywhere on the hero.
    expect(screen.queryByText(/curl/i)).not.toBeInTheDocument()
    expect(screen.queryByText('/v1/chat/completions')).not.toBeInTheDocument()
    expect(screen.queryByText('application/json')).not.toBeInTheDocument()
  })

  it('links Get API Key to sign-up and Browse Models to pricing', async () => {
    await renderHero()
    expect(screen.getByRole('button', { name: /Get API Key/ })).toHaveAttribute(
      'href',
      '/sign-up'
    )
    expect(
      screen.getByRole('button', { name: /Browse Models/ })
    ).toHaveAttribute('href', '/pricing')
  })

  it('shows Go to Dashboard when authenticated', async () => {
    await renderHero(true)
    expect(
      screen.getByRole('button', { name: /Go to Dashboard/ })
    ).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByText('Get API Key')).not.toBeInTheDocument()
  })
})
