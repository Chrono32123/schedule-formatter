import React, { useState, useEffect } from 'react';
import moment, { max } from 'moment';
import { Typography, Container, TextField, Select, Button, Box, MenuItem, Tabs, Tab, InputLabel, Switch, FormControlLabel, FormControl } from '@mui/material';
import axios from 'axios';
import './App.css';
import Footer from './Footer';
import { GenerateScheduleImage, ScheduleImageTemplate } from './components/ScheduleImage';
import { ShareSheet } from './components/ShareSheet';
import { CreateScheduleDialog } from './components/CreateScheduleDialog';
import logoSvg from './assets/stream_share_logo.svg';
import { formatStartEndDates } from './utils/dateFormatting';


export interface ParsedEvent {
  summary: string;
  start: string;
  end?: string | null;
  duration?: string | null;
  discordTimestamp: string;
  description: string;
  categoryImage?: string | null;
  unixTimestamp: number;
  endUnixTimestamp?: number | null;
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
      className="tab-panel-wrapper"
      {...other}
    >
      {value === index && <>{children}</>}
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
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [createScheduleDialogOpen, setCreateScheduleDialogOpen] = useState(false);
  const [scheduleImageDataUrl, setScheduleImageDataUrl] = useState<string>('');
  const [showEndDate, setShowEndDate] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [profileRingColor, setProfileRingColor] = useState('#9146FF');


  const imageSize = { width: 1080, height: 1350 };
  const maxEvents = 7;
  const eventsForImage = events.slice(0, maxEvents);
  const eventCount = eventsForImage.length;

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

  const formatDiscordTimestampRange = (discordTimestamp: string, endUnixTimestamp: number | null | undefined, style: string): string => {
    if (!endUnixTimestamp) return formatDiscordTimestamp(discordTimestamp);

    const match = discordTimestamp.match(/<t:(\d+):([a-zA-Z])>/);
    if (!match) return discordTimestamp;
    const [, unixTimestamp] = match;
    
    const startTime = moment.unix(parseInt(unixTimestamp));
    const endTime = moment.unix(endUnixTimestamp);

    // Check if same day
    if (startTime.format('YYYY-MM-DD') === endTime.format('YYYY-MM-DD')) {
      // Same day: show start full timestamp and end time only
      const startFormatted = formatDiscordTimestamp(discordTimestamp);
      const endFormatted = endTime.format('h:mm A');
      return `${startFormatted} - ${endFormatted}`;
    } else {
      // Different days: show both full timestamps
      const startFormatted = formatDiscordTimestamp(discordTimestamp);
      const endDiscordTimestamp = `<t:${endUnixTimestamp}:${style}>`;
      const endFormatted = formatDiscordTimestamp(endDiscordTimestamp);
      return `${startFormatted} - ${endFormatted}`;
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
      const error = err as { response?: { data?: unknown } } | Error;
      console.error('Token fetch failed:', 'response' in error ? error.response?.data : (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const searchTwitchCategories = async (query: string): Promise<Array<{ id: string; name: string }>> => {
    try {
      if (!accessToken || !clientId || !query.trim()) {
        return [];
      }

      const response = await axios.get('https://api.twitch.tv/helix/search/categories', {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          query: query,
          first: 10,
        },
      });

      return response.data.data.map((game: { id: string; name: string }) => ({
        id: game.id,
        name: game.name,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Category search failed:', error.message);
      return [];
    }
  };

  const fetchCategoryImagesForEvents = async (eventsToEnrich: ParsedEvent[]): Promise<ParsedEvent[]> => {
    return Promise.all(
      eventsToEnrich.map(async (event) => {
        const category = extractCategory(event.description);

        if (!category) {
          return { ...event, categoryImage: null };
        }

        if (!accessToken) {
          console.warn('No access token—skipping category image');
          return { ...event, categoryImage: null };
        }

        try {
          const apiUrl = `https://api.twitch.tv/helix/games?name=${encodeURIComponent(category)}`;

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
          console.error(`Error fetching image for "${category}":`, err);
        }

        return { ...event, categoryImage: null };
      })
    );
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
          start: startMoment.format(dateFormat),
        };
      })
    setEvents(updatedEvents);
  }
}, [dateFormat]);

const fetchBroadcasterInfo = async (username: string) => {
  if (!accessToken || !clientId) return;

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) throw new Error('Twitch API error');
    const json = await res.json();
    const user = json.data?.[0];
    if (user) {
      setProfileImageUrl(user.profile_image_url || '');
      return user.id;
    }
  } catch (e) {
    console.error(e);
  }
  return null;
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
      const broadcasterId = useTwitchMode ? await fetchBroadcasterInfo(twitchUsername) :  null;
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
        jcalData = (window as unknown as { ICAL: { parse: (data: string) => unknown } }).ICAL.parse(icsData);
      } catch (parseErr) {
        throw new Error('Invalid ICS data format');
      }
      const comp = new (window as unknown as { ICAL: { Component: new (data: unknown) => unknown } }).ICAL.Component(jcalData);
      const vevents = (comp as { getAllSubcomponents: (type: string) => unknown[] }).getAllSubcomponents('vevent');

      const now = moment().startOf('day');
      const endDateRange = moment().add(parseInt(daysForward), 'days').endOf('day');

      const parsedEvents: ParsedEvent[] = [];

      vevents.forEach((vevent: unknown) => {
        const event = new (window as unknown as { ICAL: { Event: new (data: unknown) => { summary?: string; description?: string; startDate?: { toJSDate: () => Date }; endDate?: { toJSDate: () => Date }; isRecurring: () => boolean; iterator: () => { next: () => unknown } } } }).ICAL.Event(vevent);
        const startDate = event.startDate ? moment(event.startDate.toJSDate()) : null;
        const endDate = event.endDate ? moment(event.endDate.toJSDate()) : null;
        const duration = endDate?.diff(startDate, 'hours')

        if (startDate && startDate.isValid() && startDate.isBetween(now, endDateRange, null, '[]')) {
          parsedEvents.push({
            summary: event.summary || 'No title',
            start: startDate.format(dateFormat),
            end: endDate ? endDate.format(dateFormat) : null,
            duration: duration ? duration + (duration && duration > 1 ? ' hours' : ' hour') : null, // Updated duration for display.
            discordTimestamp: `<t:${startDate.unix()}:${timestampFormat}>`,
            description: event.description || 'No description',
            unixTimestamp: startDate.unix(),
            endUnixTimestamp: endDate ? endDate.unix() : null
          });
        }

        if (event.isRecurring()) {
          const iterator = event.iterator() as { next: () => { toJSDate: () => Date } | null };
          let next;
          while ((next = iterator.next()) && moment(next.toJSDate()).isBefore(endDateRange)) {
            const occurrenceStart = moment(next.toJSDate());
            const occurrenceEnd = event.endDate ? moment(event.endDate.toJSDate()).add(occurrenceStart.diff(startDate)) : null;
            if (occurrenceStart.isValid() && occurrenceStart.isBetween(now, endDateRange, null, '[]')) {
              parsedEvents.push({
                summary: event.summary || 'No title',
                start: occurrenceStart.format(dateFormat),
                end: occurrenceEnd ? moment(occurrenceEnd).format(dateFormat) : null,
                duration: occurrenceEnd ? occurrenceEnd?.diff(occurrenceStart, 'hours') + (occurrenceEnd?.diff(occurrenceStart, 'hours') && occurrenceEnd?.diff(occurrenceStart, 'hours') > 1 ? ' hours' : ' hour') : null,
                discordTimestamp: `<t:${occurrenceStart.unix()}:${timestampFormat}>`,
                description: event.description || 'No description',
                unixTimestamp: occurrenceStart.unix(),
                endUnixTimestamp: occurrenceEnd ? occurrenceEnd.unix() : null
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
      const error = err instanceof Error ? err : new Error(String(err));
      setError(`Error fetching or parsing calendar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

// Updated handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!twitchUsername) {
    setError('Enter Twitch username');
    return;
  }
  await fetchAndParseCalendar(true);
};

const handleReset = () => {
  setWebcalUrl('');
  setTwitchUsername('');
  setEvents([]);
  setError('');
  setTabValue(0);
  setShareSheetOpen(false);
  setCreateScheduleDialogOpen(false);
  setScheduleImageDataUrl('');
  setShowEndDate(false);
  setShowDuration(false);
  setIsCustomSchedule(false);
  setProfileImageUrl('');
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
      <Box className="header-with-logo">
        <img src={logoSvg} alt="Stream Share" className="logo" />
        <Typography variant="h4" className="title">
          Stream Share
        </Typography>
      </Box>
      <Box component="form" onSubmit={handleSubmit} className="form-container">
        <Box className="form-group">
          <TextField
            id="twitchUsername"
            label="Your Twitch Username"
            value={twitchUsername}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^a-zA-Z0-9_ ]/g, '');
+              setTwitchUsername(sanitized.trim());
            }}
            placeholder="e.g., shroud"
            className="form-input"
            fullWidth
          />
        </Box>
        <Typography variant="h5" className="form-input" sx={{ mb: 2 }}>- OR -</Typography>
        <Box className="form-group">
          <Button
            variant="contained"
            onClick={() => setCreateScheduleDialogOpen(true)}
            fullWidth
            sx={{ 
              py: 1.5,
              backgroundColor: '#9146FF',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#7a3bb8',
              },
            }}
          >
            {events.length > 0 ? 'Edit Your Schedule' : 'Create Your Own Schedule'}
          </Button>
        </Box>
        <Typography variant="h5" className="form-input options-heading">Options</Typography>
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
        <Box className="form-group">
          <FormControlLabel
            control={
              <Switch
                checked={showEndDate}
                onChange={(e) => setShowEndDate(e.target.checked)}
                className="preview-switch"
              />
            }
            label="Show End Date"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showDuration}
                onChange={(e) => setShowDuration(e.target.checked)}
                className="preview-switch"
              />
            }
            label="Show Duration"
          />
          <FormControlLabel
            control={
              <Switch
                checked={lightMode}
                onChange={(e) => setLightMode(e.target.checked)}
                className="preview-switch"
              />
            }
            label="Light Mode"
          />
        </Box>
        <Box className="button-container">
          <Button
            type="submit"
            disabled={loading || !twitchUsername}
            variant="contained"
            className="button"
            >
            {loading ? 'Loading...' : 'Fetch Events'}
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            variant="outlined"
            className="button"
            >
            Reset
          </Button>
        </Box>
      </Box>
      {error && <Typography>{error}</Typography>}
      {events.length >0 && (
        <Box className="results-container">
          <Box className="tabs">
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="Preview & Export" id="tab-0" />
            <Tab label="Discord Format" id="tab-1" />
          </Tabs>
          <TabPanel value={tabValue} index={0}>
            <Box className="events">
              <Typography variant="h5" className="subtitle">
                Upcoming Streams
              </Typography>
              {events.length === 0 && !error && !loading && (
                <Typography className="centered-text">
                  No events found for the selected period.
                </Typography>
              )}
              {eventsForImage.map((event: ParsedEvent, index) => {
                const { startDisplay, endDisplay } = formatStartEndDates(event.start, event.end, dateFormat);
                return (
                <Box key={index} className="event-container">
                  <div className="event">
                    <div className="event-details">
                      <Typography variant="h6" className="event-title">
                        <strong>{event.summary}</strong>
                      </Typography>
                      <Typography className="event-info"><strong>Playing:</strong> {extractCategory(event.description)}</Typography>
                      {!showEndDate &&(
                        <Typography className="event-info">{startDisplay}</Typography>
                      )}
                      {showEndDate && endDisplay && (
                        <Typography className="event-info">{startDisplay} - {endDisplay}</Typography>
                      )}
                      {showDuration && event.duration && (
                        <Typography className="event-info"><strong>Duration:</strong> {event.duration}</Typography>
                      )}
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
                );
              })}
              <Box className="export-button-container">
                <Button
                  variant="contained"
                  className="button generate-image-btn"
                  onClick={async () => {
                    const imageUrl = await GenerateScheduleImage({
                      events,
                      eventCount,
                      twitchUsername,
                      daysForward,
                      profileImageUrl,
                      extractCategory,
                      size: imageSize,
                      showEndDate,
                      showDuration,
                      dateFormat,
                      lightMode,
                      profileRingColor
                    });
                    if (imageUrl) {
                      setScheduleImageDataUrl(imageUrl);
                      setShareSheetOpen(true);
                    }
                  }}
                >
                  Share Schedule
                </Button>
              </Box>
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" className="subtitle">
                Discord Formatted Stream Schedule
            </Typography>
            <Box className="compact-events">
              {events.length === 0 && !error && !loading && (
                <Typography className="centered-text">
                  No events found for the selected period.
                </Typography>
              )}
              <Box className="discord-controls-wrapper">
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
                <MenuItem value="F"><span className="menu-label">Long Date/Time</span> <span className="menu-example">({timestampFormats.F})</span></MenuItem>
                <MenuItem value="f"><span className="menu-label">Short Date/Time</span> <span className="menu-example">({timestampFormats.f})</span></MenuItem>
                <MenuItem value="t"><span className="menu-label">Short Time</span> <span className="menu-example">({timestampFormats.t})</span></MenuItem>
                <MenuItem value="T"><span className="menu-label">Long Time</span> <span className="menu-example">({timestampFormats.T})</span></MenuItem>
                <MenuItem value="d"><span className="menu-label">Short Date</span> <span className="menu-example">({timestampFormats.d})</span></MenuItem>
                <MenuItem value="D"><span className="menu-label">Long Date</span> <span className="menu-example">({timestampFormats.D})</span></MenuItem>
                <MenuItem value="R"><span className="menu-label">Relative</span> <span className="menu-example">({timestampFormats.R})</span></MenuItem>
                </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                    className="preview-switch"
                    />
                  }
                  label="Preview Toggle"
                  />
                </Box>
              {events.map((event: ParsedEvent, index) => {
                let timeString = event.discordTimestamp;
                
                // If end timestamp exists and showEndDate is enabled, append it to the time string
                if (showEndDate && event.endUnixTimestamp) {
                  // Check if same day
                  const startTime = moment.unix(parseInt(event.discordTimestamp.match(/<t:(\d+):/)?.[1] || '0'));
                  const endTime = moment.unix(event.endUnixTimestamp);
                  
                  let endDiscordTimestamp;
                  if (startTime.format('YYYY-MM-DD') === endTime.format('YYYY-MM-DD')) {
                    // Same day: use only time format (:t)
                    endDiscordTimestamp = `<t:${event.endUnixTimestamp}:t>`;
                  } else {
                    // Different days: use full format
                    endDiscordTimestamp = `<t:${event.endUnixTimestamp}:${timestampFormat}>`;
                  }
                  timeString = `${timeString} - ${endDiscordTimestamp}`;
                }
                
                // Apply preview mode formatting if enabled
                const displayTime = previewMode ? timeString.split(' - ').map(ts => formatDiscordTimestamp(ts.trim())).join(' - ') : timeString;
                
                return (
                <Box key={index} className="compact-event">
                  <Typography>
                    {displayTime} {event.summary} - {extractCategory(event.description)} {showDuration && event.duration ? `- ${event.duration}` : ''}
                  </Typography>
                </Box>
                );
              })}
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
          {events.length > 0 && (
            <ScheduleImageTemplate
              events={eventsForImage}
              eventCount={eventsForImage.length}
              twitchUsername={twitchUsername}
              daysForward={daysForward}
              profileImageUrl={profileImageUrl}
              extractCategory={extractCategory}
              size={imageSize}
              showEndDate={showEndDate}
              showDuration={showDuration}
              dateFormat={dateFormat}
              lightMode={lightMode}
              profileRingColor={profileRingColor}
            />
          )}
          </Box>
        </Box>
      )}
      </Box>
      <Footer />
      <ShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        imageDataUrl={scheduleImageDataUrl}
        filename={`${twitchUsername || 'schedule'}_${imageSize.width}x${imageSize.height}.png`}
        title={`${twitchUsername}'s Stream Schedule`}
      />
      <CreateScheduleDialog
        open={createScheduleDialogOpen}
        onClose={() => setCreateScheduleDialogOpen(false)}
        onSave={(customEvents, channelName, profilePictureUrl, ringColor) => {
          setEvents(customEvents);
          setIsCustomSchedule(true);
          if (channelName) {
            setTwitchUsername(channelName);
          }
          if (profilePictureUrl) {
            setProfileImageUrl(profilePictureUrl);
          }
          if (ringColor) {
            setProfileRingColor(ringColor);
          }
          setCreateScheduleDialogOpen(false);
        }}
        searchCategories={searchTwitchCategories}
        fetchCategoryImages={fetchCategoryImagesForEvents}
        initialEvents={events}
        initialChannelName={twitchUsername}
        initialProfilePictureUrl={profileImageUrl}
      />
      </Container>
    );
}

export default App;