import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App component', () => {
  it('renders inputs and fetch button', () => {
    render(<App />)

    // Inputs
    const twitchInput = screen.getByLabelText(/Your Twitch Username/i)
    const webcalInput = screen.getByLabelText(/Stream Schedule Calendar URL/i)
    expect(twitchInput).toBeInTheDocument()
    expect(webcalInput).toBeInTheDocument()

    // Button
    const fetchBtn = screen.getByRole('button', { name: /Fetch Events/i })
    expect(fetchBtn).toBeInTheDocument()
  })

  it('allows typing into the twitch username field', () => {
    render(<App />)
    const twitchInput = screen.getByLabelText(/Your Twitch Username/i) as HTMLInputElement
    fireEvent.change(twitchInput, { target: { value: 'testuser' } })
    expect(twitchInput.value).toBe('testuser')
  })

  it('shows an error when submitting empty form', async () => {
    render(<App />)
    const fetchBtn = screen.getByRole('button', { name: /Fetch Events/i })
    fireEvent.click(fetchBtn)

    // The app may show different error messages depending on env; check for either expected variants
    const err = screen.queryByText(/Enter Twitch username or webcal URL|Missing Twitch Client-ID\/Secret! Add to \.env/i)
    expect(err).toBeTruthy()
  })
})
