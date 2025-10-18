import { useState } from 'react';
import moment from 'moment';
import {Typography, Container} from '@mui/material';


function App() {
  const [webcalUrl, setWebcalUrl] = useState('');
  const [daysForward, setDaysForward] = useState('7');
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;


  const fetchAndParseCalendar = async () => {
    setError('');
    setEvents([]);
    setLoading(true);

    // Convert webcal to https
    const icsUrl = webcalUrl.replace(/^webcal:\/\//, 'https://');

    try {
      // Fetch ICS file
      const response = await fetch(icsUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      const icsData = await response.text();

      // Parse ICS data
      let jcalData;
      try {
        jcalData = window.ICAL.parse(icsData);
      } catch (parseErr) {
        throw new Error('Invalid ICS data format');
      }
      const comp = new window.ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      // Current time and time range in user's local timezone
      const now = moment().startOf('day');
      const endDateRange = moment().add(parseInt(daysForward), 'days').endOf('day');

      const parsedEvents: {summary: string, start: string, discordTimestamp: string, description: string}[] = [];

      vevents.forEach((vevent) => {
        const event = new window.ICAL.Event(vevent);
        
        // Handle non-recurring events
        const startDate = event.startDate ? moment(event.startDate.toJSDate()) : null;
        const endDate = event.endDate ? moment(event.endDate.toJSDate()) : startDate;

        if (startDate && startDate.isValid() && startDate.isBetween(now, endDateRange, null, '[]')) {
          parsedEvents.push({
            summary: event.summary || 'No title',
            start: startDate.format('DD-MM-YYYY HH:mm'),
            discordTimestamp: `<t:${startDate.unix()}:F>`,
            description: event.description || 'No description',
          });
        }

        // Handle recurring events
        if (event.isRecurring()) {
          const iterator = event.iterator();
          let next;
          while ((next = iterator.next()) && moment(next.toJSDate()).isBefore(endDateRange)) {
            const occurrenceStart = moment(next.toJSDate());

            if (occurrenceStart.isValid() && occurrenceStart.isBetween(now, endDateRange, null, '[]')) {
              parsedEvents.push({
                summary: event.summary || 'No title',
                start: occurrenceStart.format('YYYY-MM-DD HH:mm'),
                discordTimestamp: `<t:${occurrenceStart.unix()}:F>`,
                description: event.description || 'No description',
              });
            }
          }
        }
      });

      // Sort events by start date
      parsedEvents.sort((a, b) => moment(a.start).diff(moment(b.start)));
      setEvents(parsedEvents);
    } catch (err) {
      setError(`Error fetching or parsing calendar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!webcalUrl) {
      setError('Please enter a valid webcal URL');
      return;
    }
    fetchAndParseCalendar();
  };

  return (
    <div className="container">
      <h1 className="title">Webcal Event Parser</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="webcalUrl">Webcal URL</label>
          <input
            id="webcalUrl"
            type="text"
            value={webcalUrl}
            onChange={(e) => setWebcalUrl(e.target.value)}
            placeholder="webcal://example.com/calendar.ics"
            className="input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="daysForward">Days Forward</label>
          <select
            id="daysForward"
            value={daysForward}
            onChange={(e) => setDaysForward(e.target.value)}
            className="input"
          >
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="button">
          {loading ? 'Loading...' : 'Fetch Events'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="events">
        <h2 className="subtitle">Events</h2>
        {events.length === 0 && !error && !loading && (
          <p>No events found for the selected period.</p>
        )}
        {events.map((event, index) => (
          <Container maxWidth = "md">
          <div key={index} className="event">
            <Typography variant ="h5"><strong>Description:</strong> {event.summary}</Typography>
            <p><strong>Start:</strong> {event.start}</p>
            <p><strong>Discord Timestamp:</strong> {event.discordTimestamp}</p>
            <p><strong>Category:</strong> {event.description}</p>
          </div>
          </Container>
        ))}
      </div>
    </div>
  );
}

export default App;