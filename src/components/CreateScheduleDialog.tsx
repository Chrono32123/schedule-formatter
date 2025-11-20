import React, { useState } from 'react';
import moment from 'moment';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Autocomplete,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ParsedEvent } from '../App';

interface CreateEventFormData {
  title: string;
  startDateTime: string;
  endDateTime: string;
  category: string;
}

interface FormErrors {
  title?: string;
  startDateTime?: string;
  endDateTime?: string;
  category?: string;
  general?: string;
}

interface CreateScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (events: ParsedEvent[], channelName?: string, profilePictureUrl?: string | null, profileRingColor?: string) => void;
  searchCategories: (query: string) => Promise<Array<{ id: string; name: string }>>;
  fetchCategoryImages: (events: ParsedEvent[]) => Promise<ParsedEvent[]>;
  initialEvents?: ParsedEvent[];
  initialChannelName?: string;
  initialProfilePictureUrl?: string | null;
}

export const CreateScheduleDialog: React.FC<CreateScheduleDialogProps> = ({
  open,
  onClose,
  onSave,
  searchCategories,
  fetchCategoryImages,
  initialEvents,
  initialChannelName,
  initialProfilePictureUrl,
}) => {
  const [formData, setFormData] = useState<CreateEventFormData>({
    title: '',
    startDateTime: '',
    endDateTime: '',
    category: '',
  });

  const [channelName, setChannelName] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profileRingColor, setProfileRingColor] = useState('#9146FF');
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<boolean>(false);

  // Initialize state when dialog opens with existing events
  React.useEffect(() => {
    if (open) {
      if (initialEvents && initialEvents.length > 0) {
        setEvents(initialEvents);
        setChannelName(initialChannelName || '');
        setProfilePictureUrl(initialProfilePictureUrl || null);
        setEditingSchedule(true);
      } else {
        setEvents([]);
        setChannelName('');
        setProfilePictureUrl(null);
      }
      setProfileRingColor('#9146FF');
      setFormData({
        title: '',
        startDateTime: '',
        endDateTime: '',
        category: '',
      });
      setEditingEventIndex(null);
      setErrors({});
    }
  }, [open, initialEvents, initialChannelName, initialProfilePictureUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for start date - auto-set end date to 1 hour later if end date is empty
    if (name === 'startDateTime' && value && !formData.endDateTime) {
      const startMoment = moment(value);
      if (startMoment.isValid()) {
        const endMoment = startMoment.clone().add(1, 'hour');
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          endDateTime: endMoment.format('YYYY-MM-DDTHH:mm'),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePictureUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategorySearch = async (query: string) => {
    if (!query.trim()) {
      setCategoryOptions([]);
      return;
    }
    setCategoryLoading(true);
    try {
      const results = await searchCategories(query);
      setCategoryOptions(results);
    } catch (err) {
      console.error('Failed to search categories:', err);
      setCategoryOptions([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }
    if (!formData.startDateTime) {
      newErrors.startDateTime = 'Start date/time is required';
    }
    if (!formData.endDateTime) {
      newErrors.endDateTime = 'End date/time is required';
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (formData.startDateTime && formData.endDateTime) {
      const startMoment = new Date(formData.startDateTime);
      const endMoment = new Date(formData.endDateTime);
      if (startMoment >= endMoment) {
        newErrors.endDateTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddEvent = () => {
    if (!validateForm()) {
      return;
    }

    const startMoment = moment(formData.startDateTime);
    const endMoment = moment(formData.endDateTime);
    const dateFormat = 'MM-DD-YYYY hh:mm A'; // Standardized to match Twitch format

    const newEvent: ParsedEvent = {
      summary: formData.title,
      start: startMoment.format(dateFormat),
      end: endMoment.format(dateFormat),
      duration: calculateDuration(startMoment.toDate(), endMoment.toDate()),
      discordTimestamp: `<t:${startMoment.unix()}:F>`,
      description: formData.category + '\u200b',
      categoryImage: null,
      unixTimestamp: startMoment.unix(),
      endUnixTimestamp: endMoment.unix(),
    };

    if (editingEventIndex !== null) {
      // Update existing event
      setEvents((prev) => {
        const updated = [...prev];
        updated[editingEventIndex] = newEvent;
        return updated;
      });
      setEditingEventIndex(null);
    } else {
      // Add new event
      setEvents((prev) => [...prev, newEvent]);
    }
    
    setFormData({
      title: '',
      startDateTime: '',
      endDateTime: '',
      category: '',
    });
    setErrors({});
  };

  const handleEditEvent = (index: number) => {
    const event = events[index];
    if (event) {
      // Parse dates using standardized Twitch format
      const dateFormat = 'MM-DD-YYYY hh:mm A';
      
      const dateObj = moment(event.start, dateFormat);
      const endObj = moment(event.end, dateFormat);
      
      setFormData({
        title: event.summary,
        startDateTime: dateObj.isValid() ? dateObj.format('YYYY-MM-DDTHH:mm') : '',
        endDateTime: endObj.isValid() ? endObj.format('YYYY-MM-DDTHH:mm') : '',
        category: event.description.slice(0, -1), // Remove the zero-width space
      });
      setEditingEventIndex(index);
    }
  };

  const handleCancelEdit = () => {
    setEditingEventIndex(null);
    setFormData({
      title: '',
      startDateTime: '',
      endDateTime: '',
      category: '',
    });
    setErrors({});
  };

  const handleDeleteEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
    if (editingEventIndex === index) {
      handleCancelEdit();
    }
  };

  const handleSave = async () => {
    if (events.length === 0) {
      setErrors({ general: 'Please add at least one event' });
      return;
    }
    
    const enrichedEvents = await fetchCategoryImages(events);
    onSave(enrichedEvents, channelName || undefined, profilePictureUrl, profileRingColor);
    setEvents([]);
    setFormData({
      title: '',
      startDateTime: '',
      endDateTime: '',
      category: '',
    });
    setChannelName('');
    setProfilePictureUrl(null);
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    // Only reset form fields, not events (they're managed by parent via initialEvents)
    setFormData({
      title: '',
      startDateTime: '',
      endDateTime: '',
      category: '',
    });
    setEditingEventIndex(null);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#1a1a1a', color: '#ffffff', pb: 2, textAlign: 'center' }}>
        Create Your Own Schedule
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: '#1a1a1a', pt: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* General Error Message */}
          {errors.general && (
            <Typography sx={{ color: '#ff6b6b', fontSize: '0.875rem' }}>
              {errors.general}
            </Typography>
          )}

          {/* Channel Name and Profile Picture - Optional Section */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <TextField
              label="Channel Name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#242424',
                  '& fieldset': {
                    borderColor: '#646cff',
                  },
                  '&:hover fieldset': {
                    borderColor: '#9146FF',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#ffffff',
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  color: '#ffffff',
                },
              }}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                style={{ display: 'none' }}
                id="profile-picture-input"
              />
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setProfilePictureUrl(event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  p: 1,
                  border: '2px dashed #9146FF',
                  borderRadius: '8px',
                  backgroundColor: '#1a1a1a',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#646cff',
                    backgroundColor: '#242424',
                  },
                }}
                component="label"
                htmlFor="profile-picture-input"
              >
                {profilePictureUrl ? (
                  <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={profilePictureUrl}
                        alt="Profile"
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '12px',
                          border: `3px solid ${profileRingColor}`,
                          objectFit: 'cover',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          setProfilePictureUrl(null);
                        }}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: '#ff6b6b',
                          color: '#ffffff',
                          width: 24,
                          height: 24,
                          padding: 0,
                          '&:hover': {
                            backgroundColor: '#ff5252',
                          },
                        }}
                        title="Remove picture"
                      >
                        ✕
                      </IconButton>
                    </Box>
                    <Typography sx={{ color: '#ffffff', fontSize: '0.75rem', textAlign: 'center' }}>
                      Click or drag to change
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Typography sx={{ color: '#9146FF', fontWeight: 'bold' }}>
                      📸
                    </Typography>
                    <Typography sx={{ color: '#ffffff', fontSize: '0.875rem', textAlign: 'center' }}>
                      Drag profile picture here or click to browse
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* Profile Ring Color Picker */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                position: 'relative',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '2px solid #646cff',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                '&:hover': {
                  borderColor: '#9146FF',
                },
              }}
            >
              <input
                type="color"
                value={profileRingColor}
                onChange={(e) => setProfileRingColor(e.target.value)}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  margin: 0,
                  padding: 0,
                }}
              />
            </Box>
            <TextField
              label="Ring Color"
              value={profileRingColor}
              onChange={(e) => setProfileRingColor(e.target.value)}
              size="small"
              placeholder="#9146FF"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#242424',
                  '& fieldset': {
                    borderColor: '#646cff',
                  },
                  '&:hover fieldset': {
                    borderColor: '#9146FF',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#ffffff',
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  color: '#ffffff',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>

          {/* Input Form - Event Title */}
          <TextField
            label="Event Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            fullWidth
            error={!!errors.title}
            helperText={errors.title}
            className="form-input"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#242424',
                '& fieldset': {
                  borderColor: '#646cff',
                },
                '&:hover fieldset': {
                  borderColor: '#9146FF',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#ffffff',
              },
              '& .MuiOutlinedInput-input': {
                color: '#ffffff',
              },
              '& .MuiFormHelperText-root': {
                color: '#ff6b6b',
              },
            }}
          />

          <Autocomplete
            freeSolo
            options={categoryOptions}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : option.name
            }
            loading={categoryLoading}
            onInputChange={(_, value) => {
              setFormData((prev) => ({
                ...prev,
                category: value || '',
              }));
              if (errors.category) {
                setErrors((prev) => ({
                  ...prev,
                  category: undefined,
                }));
              }
              handleCategorySearch(value || '');
            }}
            onChange={(_, value) => {
              if (value && typeof value === 'object' && 'name' in value) {
                setFormData((prev) => ({
                  ...prev,
                  category: value.name,
                }));
              }
            }}
            inputValue={formData.category}
            noOptionsText={categoryLoading ? 'Searching...' : 'Type to search categories'}
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label="Category"
                error={!!errors.category}
                helperText={errors.category}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#242424',
                    '& fieldset': {
                      borderColor: '#646cff',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9146FF',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#ffffff',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#ffffff',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ff6b6b',
                  },
                  '& .MuiAutocomplete-listbox': {
                    backgroundColor: '#242424',
                    color: '#ffffff',
                  },
                }}
              />
            )}
            sx={{
              '& .MuiAutocomplete-paper': {
                backgroundColor: '#242424',
              },
              '& .MuiAutocomplete-option': {
                backgroundColor: '#242424 !important',
                color: '#ffffff !important',
                '&[aria-selected="true"]': {
                  backgroundColor: '#9146FF !important',
                },
                '&:hover': {
                  backgroundColor: '#9146FF !important',
                },
              },
            }}
          />

          {/* Date/Time Inputs - Side by Side on desktop, stacked on mobile */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', px: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              label="Start Date/Time"
              name="startDateTime"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#242424',
                  '& fieldset': {
                    borderColor: '#646cff',
                  },
                  '&:hover fieldset': {
                    borderColor: '#9146FF',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#ffffff',
                },
                '& .MuiOutlinedInput-input': {
                  color: '#ffffff',
                },
                '& .MuiFormHelperText-root': {
                  color: '#ff6b6b',
                },
              }}
              error={!!errors.startDateTime}
              helperText={errors.startDateTime}
            />

            <TextField
              label="End Date/Time"
              name="endDateTime"
              type="datetime-local"
              value={formData.endDateTime}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#242424',
                  '& fieldset': {
                    borderColor: '#646cff',
                  },
                  '&:hover fieldset': {
                    borderColor: '#9146FF',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#ffffff',
                },
                '& .MuiOutlinedInput-input': {
                  color: '#ffffff',
                },
                '& .MuiFormHelperText-root': {
                  color: '#ff6b6b',
                },
              }}
              error={!!errors.endDateTime}
              helperText={errors.endDateTime}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignSelf: 'flex-start', mt: 0.5 }}>
            <Button
              variant="contained"
              onClick={handleAddEvent}
              sx={{
                backgroundColor: '#9146FF',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#7a3bb8',
                },
              }}
            >
              {editingEventIndex !== null ? 'Update Event' : 'Add Event'}
            </Button>
            {editingEventIndex !== null && (
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                sx={{
                  borderColor: '#9146FF',
                  color: '#9146FF',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  '&:hover': {
                    borderColor: '#7a3bb8',
                    color: '#7a3bb8',
                  },
                }}
              >
                Cancel
              </Button>
            )}
          </Box>

          {/* Events List */}
          {events.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 1, fontSize: '1rem', fontWeight: 'bold' }}>
                Events ({events.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {events.map((event, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      backgroundColor: '#242424',
                      borderRadius: '8px',
                      border: '1px solid #646cff',
                      '&:hover': {
                        backgroundColor: '#2a2a2a',
                        borderColor: '#9146FF',
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '0.95rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.summary}
                      </Typography>
                      <Typography
                        sx={{
                          color: '#9146FF',
                          fontSize: '0.85rem',
                          mt: 0.25,
                        }}
                      >
                        {event.start}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditEvent(index)}
                        sx={{
                          color: '#9146FF',
                          '&:hover': {
                            backgroundColor: 'rgba(145, 70, 255, 0.1)',
                          },
                          padding: '6px',
                        }}
                        title="Edit event"
                      >
                        ✏️
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteEvent(index)}
                        sx={{
                          color: '#ff6b6b',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                          },
                          padding: '6px',
                        }}
                        title="Delete event"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: '#1a1a1a', p: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          sx={{
            color: '#ffffff',
            borderColor: '#646cff',
            border: '1px solid',
            '&:hover': {
              backgroundColor: 'rgba(100, 108, 255, 0.1)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={events.length === 0}
          sx={{
            backgroundColor: '#9146FF',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#7a3bb8',
            },
            '&:disabled': {
              backgroundColor: '#505050',
              color: '#888888',
            },
          }}
        >
          {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

function calculateDuration(start: Date, end: Date): string {
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const roundedHours = Math.round(hours * 10) / 10;
  return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
}
