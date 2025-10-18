import { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { Typography, Container, TextField, Select, Button, Box, MenuItem, Tabs, Tab } from '@mui/material';
import axios from 'axios';
import { Label } from '@mui/icons-material';

interface ParsedEvent {
  summary: string;
  start: string;
  discordTimestamp: string;
  description: string;
  categoryImage?: string | null;
}

// Custom TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [webcalUrl, setWebcalUrl] = useState('');
  const [daysForward, setDaysForward] = useState('7');
  const [dateFormat, setDateFormat] = useState('MM-DD-YYYY HH:mm A');
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID || '';
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenExpiry, setTokenExpiry] = useState<number>(0);

  const fetchAccessToken = async () => {
  if (!clientId || !clientSecret) {
    console.error('Missing Client-ID or Secret in .env');
    return;
  }

  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
    });

    const { access_token, expires_in } = response.data;
    setAccessToken(access_token);
    setTokenExpiry(Date.now() + (expires_in * 1000)); // ms expiry
    console.log('Token fetched successfully');
  } catch (err) {
    console.error('Token fetch failed:', err.response?.data || err.message);
  }
};

// Env for secret (add after clientId line)
const clientSecret = import.meta.env.VITE_TWITCH_CLIENT_SECRET || '';

  useEffect(() => {
    if (!clientId || !clientSecret) {
      setError('Missing Twitch Client-ID/Secret! Add to .env');
      return;
    }
    fetchAccessToken(); // Initial fetch

    // Refresh logic: Poll every 25 mins (or on expiry)
    const interval = setInterval(() => {
      if (Date.now() > tokenExpiry - 60000) { // Refresh 1 min early
        fetchAccessToken();
      }
    }, 1500000); // 25 min interval

    return () => clearInterval(interval);
  }, [clientId, clientSecret]);

  const extractCategory = (description: string): string | null => {
    return description.slice(0, -1); //removes punctuation from category/description.
  };

  const fetchAndParseCalendar = async () => {
    setError('');
    setEvents([]);
    setLoading(true);

    const icsUrl = webcalUrl.replace(/^webcal:\/\//, 'https://');

    try {
      const response = await fetch(icsUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      const icsData = await response.text();

      let jcalData;
      try {
        jcalData = window.ICAL.parse(icsData);
      } catch (parseErr) {
        throw new Error('Invalid ICS data format');
      }
      const comp = new window.ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      const now = moment().startOf('day');
      const endDateRange = moment().add(parseInt(daysForward), 'days').endOf('day');

      const parsedEvents: ParsedEvent[] = [];

      vevents.forEach((vevent) => {
        const event = new window.ICAL.Event(vevent);
        const startDate = event.startDate ? moment(event.startDate.toJSDate()) : null;
        const endDate = event.endDate ? moment(event.endDate.toJSDate()) : startDate;

        if (startDate && startDate.isValid() && startDate.isBetween(now, endDateRange, null, '[]')) {
          parsedEvents.push({
            summary: event.summary || 'No title',
            start: startDate.format(dateFormat),
            discordTimestamp: `<t:${startDate.unix()}:F>`,
            description: event.description || 'No description',
          });
        }

        if (event.isRecurring()) {
          const iterator = event.iterator();
          let next;
          while ((next = iterator.next()) && moment(next.toJSDate()).isBefore(endDateRange)) {
            const occurrenceStart = moment(next.toJSDate());
            if (occurrenceStart.isValid() && occurrenceStart.isBetween(now, endDateRange, null, '[]')) {
              parsedEvents.push({
                summary: event.summary || 'No title',
                start: occurrenceStart.format(dateFormat),
                discordTimestamp: `<t:${occurrenceStart.unix()}:F>`,
                description: event.description || 'No description',
              });
            }
          }
        }
      });

      parsedEvents.sort((a, b) => moment(a.start).diff(moment(b.start)));

      if (!clientId) {
        setEvents(parsedEvents);
        return;
      }

      const enrichedEvents: ParsedEvent[] = await Promise.all(
        parsedEvents.map(async (event) => {
          const category = extractCategory(event.description);

          // Skip if no description/category.
          if (!category) {
            return { ...event, categoryImage: null };
          }

          // Skip if no token
          if (!accessToken) {
            console.warn('No access token yet—skipping images');
            return { ...event, categoryImage: null };
          }

          try {
            const apiUrl = `https://api.twitch.tv/helix/games?name=${encodeURIComponent(category)}`;
            console.log(`Fetching "${category}" with token`);

            const response = await fetch(apiUrl, {
              headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (!response.ok) {
              const errorText = await response.text();
              if (response.status === 401) {
                console.error('401: Token invalid—refetching...', errorText);
                await fetchAccessToken(); // Retry once
                return { ...event, categoryImage: null };
              }
              throw new Error(`API: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const boxArtUrl = data.data[0].box_art_url
                ?.replace('{width}', '272')
                ?.replace('{height}', '380');
              return { ...event, categoryImage: boxArtUrl || null };
            }
          } catch (err) {
            console.error(`Error for "${category}":`, err);
          }

          return { ...event, categoryImage: null };
          }));

      setEvents(enrichedEvents);
    } catch (err) {
      setError(`Error fetching or parsing calendar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webcalUrl) {
      setError('Please enter a valid webcal URL');
      return;
    }
    fetchAndParseCalendar();
  };

// NEW: Copy compact events to clipboard
  const copyToClipboard = () => {
    const compactText = events
      .map((event) => `${event.discordTimestamp} ${event.summary} - ${event.description}`)
      .join('\n');
    navigator.clipboard.writeText(compactText)
      .then(() => {
        alert('Events copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        setError('Failed to copy events to clipboard');
      });
  };

  // NEW: Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="md" className="container">
      <Typography variant="h4" className="title">
        Easy Stream Schedule Tool
      </Typography>
      <Box component="form" onSubmit={handleSubmit} className="form-container">
        <Box className="form-group">
          <TextField
            id="webcalUrl"
            label="Webcal URL"
            variant="outlined"
            value={webcalUrl}
            onChange={(e) => setWebcalUrl(e.target.value)}
            placeholder="webcal://example.com/calendar.ics"
            className="form-input"
            fullWidth
          />
        </Box>
        <Box className="form-group">
          <Select
            id="daysForward"
            value={daysForward}
            onChange={(e) => setDaysForward(e.target.value)}
            className="form-input"
            displayEmpty
            renderValue={(value) => (value ? `${value} Days` : 'Select Days')}
            fullWidth
          >
            <MenuItem value="7">7 Days</MenuItem>
            <MenuItem value="14">14 Days</MenuItem>
          </Select>
        </Box>
        <Box className="form-group">
          <Select
            id = "dateFormat"
            label="Date Format: "
            value = {dateFormat}
            onChange = {(e) => setDateFormat(e.target.value)}
            className = "input"
          >
            <MenuItem value="MM-DD-YYYY HH:mm A">MM-DD-YYYY HH:mm A</MenuItem>
            <MenuItem value="DD-MM-YYYY HH:mm A">DD-MM-YYYY HH:mm A</MenuItem>
          </Select>
        </Box>
        <Box sx={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
          <Button
            type="submit"
            disabled={loading}
            variant="contained"
            className="button"
          >
            {loading ? 'Loading...' : 'Fetch Events'}
          </Button>
        </Box>
      </Box>
      {error && <Typography className="error">{error}</Typography>}
      <Box className="tabs">
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Detailed View" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Compact View" id="tab-1" aria-controls="tabpanel-1" />
        </Tabs>
        <TabPanel value={tabValue} index={0}>
          <Box className="events">
            <Typography variant="h5" className="subtitle">
              Upcoming Streams
            </Typography>
            {events.length === 0 && !error && !loading && (
              <Typography sx={{ textAlign: 'center' }}>
                No events found for the selected period.
              </Typography>
            )}
            {events.map((event: ParsedEvent, index) => (
              <Box key={index} className="event">
                <Box className="event-content">
                <Typography variant="h6">
                  <strong>{event.summary}</strong> 
                </Typography>
                <Typography><strong>Start:</strong> {event.start}</Typography>
                <Typography><strong>Category:</strong> {event.description}</Typography>
                {event.categoryImage && (
                  <img
                    className="event-img"
                    src={event.categoryImage}
                    alt={`Category: ${extractCategory(event.description) || 'Unknown'}`}
                    width="50"
                    height="70"
                  />
                )}
                </Box>
              </Box>
            ))}
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Box className="compact-events">
            <Typography variant="h5" className="subtitle">
              Discord Formatted Stream Schedule
            </Typography>
            {events.length === 0 && !error && !loading && (
              <Typography sx={{ textAlign: 'center' }}>
                No events found for the selected period.
              </Typography>
            )}
            {events.map((event: ParsedEvent, index) => (
              <Box key={index} className="compact-event">
                <Typography>
                  {event.discordTimestamp} {event.summary} - {event.description}
                </Typography>
              </Box>
            ))}
            {events.length > 0 && (
              <Box className="copy-button-container">
                <Button
                  variant="contained"
                  className="button"
                  onClick={copyToClipboard}
                >
                  Copy to Clipboard
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Box>
    </Container>
  );
}

export default App;