import { useState, useEffect } from 'react';
import moment from 'moment';
import { Typography, Container, TextField, Select, Button, Box, MenuItem, Tabs, Tab, InputLabel, Switch, FormControlLabel, FormControl } from '@mui/material';
import axios from 'axios';
import './App.css';
import Footer from './Footer';

interface ParsedEvent {
  summary: string;
  start: string;
  discordTimestamp: string;
  description: string;
  categoryImage?: string | null;
  unixTimestamp: number;
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
  const [twitchUsername, setTwitchUsername] = useState('');
  const [daysForward, setDaysForward] = useState('7');
  const [dateFormat, setDateFormat] = useState('MM-DD-YYYY hh:mm A');
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID || '';
  const clientSecret = import.meta.env.VITE_TWITCH_CLIENT_SECRET || '';
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenExpiry, setTokenExpiry] = useState<number>(0);
  const [copyButtonText, setCopyButtonText] = useState('Copy to Clipboard');
  const [timestampFormat, setTimestampFormat] = useState('F');
  const [previewMode, setPreviewMode] = useState(false);

  const currentTime = moment();
  const timestampFormats = {
    t: currentTime.format('h:mm A'), // Short time
    T: currentTime.format('h:mm:ss A'), // Long time
    d: currentTime.format('MM/DD/YYYY'), // Short date
    D: currentTime.format('MMMM D, YYYY'), // Long date
    f: currentTime.format('MMMM D, YYYY h:mm A'), // Short date/time
    F: currentTime.format('dddd, MMMM D, YYYY h:mm A'), // Long date/time
    R: 'now', // Relative (simplified as "now" for current time)
  };

   const formatDiscordTimestamp = (discordTimestamp: string): string => {
    const match = discordTimestamp.match(/<t:(\d+):([a-zA-Z])>/);
    if (!match) return discordTimestamp; // Fallback to raw if invalid
    const [, unixTimestamp, style] = match;
    const timestamp = moment.unix(parseInt(unixTimestamp));
    switch (style) {
      case 't': return timestamp.format('h:mm A');
      case 'T': return timestamp.format('h:mm:ss A');
      case 'd': return timestamp.format('MM/DD/YYYY');
      case 'D': return timestamp.format('MMMM D, YYYY');
      case 'f': return timestamp.format('MMMM D, YYYY h:mm A');
      case 'F': return timestamp.format('dddd, MMMM D, YYYY h:mm A');
      case 'R': return timestamp.fromNow();
      default: return discordTimestamp;
    }
  };

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
      setTokenExpiry(Date.now() + (expires_in * 1000));
      console.log('Token fetched successfully');
    } catch (err) {
      console.error('Token fetch failed:', err.response?.data || err.message);
    }
  };

  useEffect(() => {
    if (!clientId || !clientSecret) {
      setError('Missing Twitch Client-ID/Secret! Add to .env');
      return;
    }
    fetchAccessToken();

    const interval = setInterval(() => {
      if (Date.now() > tokenExpiry - 60000) {
        fetchAccessToken();
      }
    }, 1500000);

    return () => clearInterval(interval);
  }, [clientId, clientSecret]);

  useEffect(() => {
  if (events.length > 0) {
    const updatedEvents = events
      .map((event) => {
        const startMoment = moment.unix(event.unixTimestamp);
        if (!startMoment.isValid()) {
          console.warn(`Invalid date for event: ${event.summary}`);
          return event; // Return unchanged if invalid
        }
        return {
          ...event,
          start: startMoment.format(dateFormat), // Reformat with new dateFormat
        };
      })
      // .sort((a, b) => moment(a.start, dateFormat).diff(moment(b.start, dateFormat))); // Re-sort events
    setEvents(updatedEvents);
  }
}, [dateFormat]);

const fetchBroadcasterId = async (username: string): Promise<string | null> => {
  if (!accessToken || !clientId) return null;
  try {
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data?.[0]?.id || null;
  } catch (err) {
    console.error('Failed to fetch broadcaster ID:', err);
    setError(`Invalid Twitch username: ${username}`);
    return null;
  }
};
  
  const extractCategory = (description: string): string | null => {
    return description.slice(0, -1);
  };

  const fetchAndParseCalendar = async (useTwitchMode = false) => {
    setError('');
    setEvents([]);
    setLoading(true);


    let icsUrl: string;

    if (useTwitchMode && twitchUsername) {
      const broadcasterId = await fetchBroadcasterId(twitchUsername);
      if (!broadcasterId) return; // Error already set
      icsUrl = `https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=${broadcasterId}`;
    } else {
      icsUrl = webcalUrl.replace(/^webcal:\/\//, 'https://');
    }

    // Fetch ICS (your existing fetch + ICAL.parse works unchanged!)
    const response = await fetch(icsUrl, { 
      mode: 'cors',
      headers: useTwitchMode ? {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      } : {},
    });

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

        if (startDate && startDate.isValid() && startDate.isBetween(now, endDateRange, null, '[]')) {
          parsedEvents.push({
            summary: event.summary || 'No title',
            start: startDate.format(dateFormat),
            discordTimestamp: `<t:${startDate.unix()}:${timestampFormat}>`,
            description: event.description || 'No description',
            unixTimestamp: startDate.unix()
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
                discordTimestamp: `<t:${occurrenceStart.unix()}:${timestampFormat}>`,
                description: event.description || 'No description',
                unixTimestamp: occurrenceStart.unix()
              });
            }
          }
        }
      });

      parsedEvents.sort((a, b) => moment(a.start, dateFormat).diff(moment(b.start, dateFormat)));

      if (!clientId) {
        setEvents(parsedEvents);
        return;
      }

      const enrichedEvents: ParsedEvent[] = await Promise.all(
        parsedEvents.map(async (event) => {
          const category = extractCategory(event.description);

          if (!category) {
            return { ...event, categoryImage: null };
          }

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
                await fetchAccessToken();
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
        })
      );

      setEvents(enrichedEvents);
    } catch (err) {
      setError(`Error fetching or parsing calendar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

// Updated handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const twitchMode = !!twitchUsername; // Auto-detect mode
  if (!twitchUsername && !webcalUrl) {
    setError('Enter Twitch username or webcal URL');
    return;
  }
  await fetchAndParseCalendar(twitchMode);
};

  const copyToClipboard = () => {
    const compactText = events
      .map((event) => `${event.discordTimestamp} ${event.summary} - ${extractCategory(event.description)}`)
      .join('\n');
    navigator.clipboard.writeText(compactText)
      .then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy to Clipboard!') ,2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        setError('Failed to copy events to clipboard');
      });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="md" className="container">
      <Box className="page-wrapper">
      <Typography variant="h4" className="title">
        Easy Stream Schedule Tool
      </Typography>
      <Box component="form" onSubmit={handleSubmit} className="form-container">
        <Box className="form-group">
          <TextField
            id="twitchUsername"
            label="Your Twitch Username"
            value={twitchUsername}
            onChange={(e) => setTwitchUsername(e.target.value)}
            placeholder="e.g., shroud"
            className="form-input"
            fullWidth
          />
        </Box>
        <Typography variant="h5" className="form-input" sx={{ mb: 2 }}>- OR -</Typography>
        <Box className="form-group">
          <TextField
            id="webcalUrl"
            label="Stream Schedule Calendar URL"
            variant="outlined"
            value={webcalUrl}
            onChange={(e) => setWebcalUrl(e.target.value)}
            placeholder="webcal://example.com/calendar.ics"
            className="form-input"
            fullWidth
            />
        </Box>
        <Typography variant="h5" className="form-input" sx={{ mb: 2, alignSelf: 'flex-start' }}>Options</Typography>
        <Box className="form-group">
          <FormControl>
            <InputLabel className="select-label" id="days-forward-label">Number of Days to Find</InputLabel>
            <Select
              id="daysForward"
              value={daysForward}
              labelId="days-forward-label"
              label="Number of Days to Find"
              onChange={(e) => setDaysForward(e.target.value)}
              className="form-input"
              fullWidth
              >
              <MenuItem value="7">7 Days</MenuItem>
              <MenuItem value="14">14 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box className="form-group">
          <FormControl>
            <InputLabel className="select-label" id="date-format-label">Date Format</InputLabel>
          <Select
            id="dateFormat"
            value={dateFormat}
            label="Date Format"
            labelId='Date Format'
            onChange={(e) => setDateFormat(e.target.value)}
            className="form-input"
            fullWidth
            >
            <MenuItem value="MM-DD-YYYY hh:mm A">MM-DD-YYYY hh:mm A</MenuItem>
            <MenuItem value="DD-MM-YYYY hh:mm A">DD-MM-YYYY hh:mm A</MenuItem>
          </Select>
          </FormControl>
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
      {error && <Typography>{error}</Typography>}
      {events.length >0 && (
        <Box className="results-container">
          <Box className="tabs">
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="Detailed List" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Discord Format" id="tab-1" aria-controls="tabpanel-1" />
          </Tabs>
          <TabPanel value={tabValue} index={0}>
            <Box className="events">
              <Typography variant="h5" className="subtitle">
                Upcoming Streams
              </Typography>
              {events.length === 0 && !error && !loading && (
                <Typography sx={{ textAlign: 'center'}}>
                  No events found for the selected period.
                </Typography>
              )}
              {events.map((event: ParsedEvent, index) => (
                <Box key={index} className="event-container">
                  <div className="event">
                    <div className="event-details">
                      <Typography variant="h6" sx={{fontSize: '32px'}}>
                        <strong>{event.summary}</strong>
                      </Typography>
                      <Typography sx={{fontSize: '24px'}}><strong>Category:</strong> {extractCategory(event.description)}</Typography>
                      <Typography sx={{fontSize: '24px'}}><strong>Start:</strong> {event.start}</Typography>
                    </div>
                    {event.categoryImage && (
                      <img
                      className="event-image"
                      src={event.categoryImage}
                      alt={`Category: ${extractCategory(event.description) || 'Unknown'}`}
                      width="50"
                      height="70"
                      />
                    )}
                  </div>
                </Box>
              ))}
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" className="subtitle">
                Discord Formatted Stream Schedule
            </Typography>
            <Box className="compact-events">
              {events.length === 0 && !error && !loading && (
                <Typography sx={{ textAlign: 'center' }}>
                  No events found for the selected period.
                </Typography>
              )}
              <Box sx={{display: 'inline', justifyContent: 'center', mb: 2}}>
              <FormControl>
              <InputLabel className="select-label" id="discord-format-label">Discord Timestamp Format</InputLabel>
              <Select
                fullWidth
                className = "form-input"
                id="discordTimeStampFormat" 
                labelId='Discord Timestamp Format'
                value={timestampFormat}
                label="Discord Timestamp Format"
                onChange={(e) => {
                  setTimestampFormat(e.target.value);
                  setEvents(events.map(item => ({
                    ...item,
                    discordTimestamp: item.discordTimestamp.replace(/:[a-zA-Z]>$/, `:${e.target.value}>`)
                  })));
                }}>
                <MenuItem value="F">Long Date/Time ({timestampFormats.F})</MenuItem>
                <MenuItem value="f">Short Date/Time ({timestampFormats.f})</MenuItem>
                <MenuItem value="t">Short Time ({timestampFormats.t})</MenuItem>
                <MenuItem value="T">Long Time ({timestampFormats.T})</MenuItem>
                <MenuItem value="d">Short Date ({timestampFormats.d})</MenuItem>
                <MenuItem value="D">Long Date ({timestampFormats.D})</MenuItem>
                <MenuItem value="R">Relative ({timestampFormats.R})</MenuItem>
                </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9146FF',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9146FF',
                      },
                    }}
                    />
                  }
                  label="Preview Toggle"
                  />
                </Box>
              {events.map((event: ParsedEvent, index) => (
                <Box key={index} className="compact-event">
                  <Typography>
                    {previewMode ? formatDiscordTimestamp(event.discordTimestamp) : event.discordTimestamp} {event.summary} - {extractCategory(event.description)}
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
                    {copyButtonText}
                  </Button>
                </Box>
              )}
            </Box>
          </TabPanel>
          </Box>
        </Box>
      )}
      </Box>
      <Footer />
      </Container>
    );
}

export default App;