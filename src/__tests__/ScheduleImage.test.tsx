import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScheduleImageTemplate } from '../components/ScheduleImage'
import { ParsedEvent } from '../App'

describe('ScheduleImageTemplate', () => {
  it('renders events and header', () => {
    const events: ParsedEvent[] = [
      {
        summary: 'Test Stream 1',
        start: '2025-11-04 10:00 AM',
        discordTimestamp: '<t:1:F>',
        description: 'GameA',
        unixTimestamp: 1700000000,
      },
      {
        summary: 'Test Stream 2 with a longer title',
        start: '2025-11-05 12:00 PM',
        discordTimestamp: '<t:2:F>',
        description: 'GameB',
        unixTimestamp: 1700003600,
      },
    ]

    render(
      <ScheduleImageTemplate
        events={events}
        eventCount={events.length}
        twitchUsername={'tester'}
        daysForward={'7'}
        profileImageUrl={''}
        extractCategory={(d) => d}
        size={{ width: 1080, height: 1350 }}
      />
    )

    // Header text
    expect(screen.getByText(/tester'?s Stream Schedule/i)).toBeInTheDocument()

    // Event summaries
    expect(screen.getByText('Test Stream 1')).toBeInTheDocument()
    expect(screen.getByText('Test Stream 2 with a longer title')).toBeInTheDocument()

    // Events container exists
    const container = document.querySelector('.schedule-image-events')
    expect(container).toBeTruthy()
  })
})
