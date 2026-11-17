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
import { describe, expect, it } from 'vitest'

import { DocsContent } from '../components/docs-content'
import { DOC_SECTIONS } from '../content'

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
