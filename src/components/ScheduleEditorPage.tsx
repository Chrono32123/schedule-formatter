import React, { useState } from 'react';
import moment from 'moment';
import {
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Autocomplete,
  Container,
  Paper,
  FormControlLabel,
  Switch,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ParsedEvent } from '../App';

interface CreateEventFormData {
  title: string;
  startDateTime: string;
  endDateTime: string;
  category: string;
  isRecurring: boolean;
}

interface FormErrors {
  title?: string;
  startDateTime?: string;
  endDateTime?: string;
  category?: string;
  general?: string;
}

interface ScheduleEditorPageProps {
  onClose: () => void;
  onSave: (events: ParsedEvent[], channelName?: string, profilePictureUrl?: string | null, profileRingColor?: string) => void;
  searchCategories: (query: string) => Promise<Array<{ id: string; name: string }>>;
  fetchCategoryImages: (events: ParsedEvent[]) => Promise<ParsedEvent[]>;
  initialEvents?: ParsedEvent[];
  initialChannelName?: string;
  initialProfilePictureUrl?: string | null;
  publishToTwitch?: (events: ParsedEvent[]) => Promise<{ success: boolean; message: string }>;
  isUserAuthenticated?: boolean;
}

export const ScheduleEditorPage: React.FC<ScheduleEditorPageProps> = ({
  onClose,
  onSave,
  searchCategories,
  fetchCategoryImages,
  initialEvents,
  initialChannelName,
  initialProfilePictureUrl,
  publishToTwitch,
  isUserAuthenticated,
}) => {
  const [formData, setFormData] = useState<CreateEventFormData>({
    title: '',
    startDateTime: '',
    endDateTime: '',
    category: '',
    isRecurring: false,
  });

  const [channelName, setChannelName] = useState(initialChannelName || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(initialProfilePictureUrl || null);
  const [profileRingColor, setProfileRingColor] = useState('#9146FF');
  const [events, setEvents] = useState<ParsedEvent[]>(initialEvents || []);
  const [errors, setErrors] = useState<FormErrors>({});
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const editingSchedule = (initialEvents && initialEvents.length > 0);

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
    const dateFormat = 'MM-DD-YYYY hh:mm A';

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
      isRecurring: formData.isRecurring,
    };

    if (editingEventIndex !== null) {
      setEvents((prev) => {
        const updated = [...prev];
        updated[editingEventIndex] = newEvent;
        return updated;
      });
      setEditingEventIndex(null);
    } else {
      setEvents((prev) => [...prev, newEvent]);
    }
    
    setFormData({
      title: '',
      startDateTime: '',
      endDateTime: '',
      category: '',
      isRecurring: false,
    });
    setErrors({});
  };

  const handleEditEvent = (index: number) => {
    const event = events[index];
    if (event) {
      const dateFormat = 'MM-DD-YYYY hh:mm A';
      
      const dateObj = moment(event.start, dateFormat);
      const endObj = moment(event.end, dateFormat);
      
      setFormData({
        title: event.summary,
        startDateTime: dateObj.isValid() ? dateObj.format('YYYY-MM-DDTHH:mm') : '',
        endDateTime: endObj.isValid() ? endObj.format('YYYY-MM-DDTHH:mm') : '',
        category: event.description.slice(0, -1),
        isRecurring: event.isRecurring || false,
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
      isRecurring: false,
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
    onClose();
  };

  const handlePublish = async () => {
    if (!publishToTwitch) return;
    setIsPublishing(true);
    setPublishMessage(null);
    const result = await publishToTwitch(events);
    setPublishMessage({ type: result.success ? 'success' : 'error', text: result.message });
    setIsPublishing(false);
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#1a1a1a',
        overflowY: 'auto',
      }}
    >
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <IconButton
            onClick={onClose}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(145, 70, 255, 0.1)',
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 'bold', flex: 1 }}>
            {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
          </Typography>
        </Box>

        <Paper sx={{ p: 3, backgroundColor: '#242424', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* General Error Message */}
            {errors.general && (
              <Typography sx={{ color: '#ff6b6b', fontSize: '0.875rem' }}>
                {errors.general}
              </Typography>
            )}

            {/* Channel Name and Profile Picture */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Channel Name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                fullWidth
                disabled={isUserAuthenticated}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
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
                }}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  style={{ display: 'none' }}
                  id="profile-picture-input"
                  disabled={isUserAuthenticated}
                />
                <Box
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isUserAuthenticated) return;
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
                    p: 2,
                    border: '2px dashed #9146FF',
                    borderRadius: '8px',
                    backgroundColor: '#1a1a1a',
                    cursor: isUserAuthenticated ? 'not-allowed' : 'pointer',
                    opacity: isUserAuthenticated ? 0.5 : 1,
                    minWidth: 180,
                    '&:hover': {
                      borderColor: isUserAuthenticated ? '#9146FF' : '#646cff',
                      backgroundColor: isUserAuthenticated ? '#1a1a1a' : '#2a2a2a',
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
                            width: 100,
                            height: 100,
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
                            width: 28,
                            height: 28,
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
                      <Typography sx={{ color: '#9146FF', fontWeight: 'bold', fontSize: '2rem' }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: '50px',
                  height: '50px',
                  borderRadius: '8px',
                  border: '2px solid #646cff',
                  overflow: 'hidden',
                  cursor: isUserAuthenticated ? 'not-allowed' : 'pointer',
                  opacity: isUserAuthenticated ? 0.5 : 1,
                  '&:hover': {
                    borderColor: isUserAuthenticated ? '#646cff' : '#9146FF',
                  },
                }}
              >
                <input
                  type="color"
                  value={profileRingColor}
                  onChange={(e) => setProfileRingColor(e.target.value)}
                  disabled={isUserAuthenticated}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    cursor: isUserAuthenticated ? 'not-allowed' : 'pointer',
                    margin: 0,
                    padding: 0,
                  }}
                />
              </Box>
              <TextField
                label="Ring Color"
                value={profileRingColor}
                onChange={(e) => setProfileRingColor(e.target.value)}
                placeholder="#9146FF"
                fullWidth
                disabled={isUserAuthenticated}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
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
                }}
              />
            </Box>

            {/* Event Form Section */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                {editingEventIndex !== null ? 'Edit Event' : 'Add Event'}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Event Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  fullWidth
                  error={!!errors.title}
                  helperText={errors.title}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#1a1a1a',
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
                          backgroundColor: '#1a1a1a',
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

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
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
                        backgroundColor: '#1a1a1a',
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
                        backgroundColor: '#1a1a1a',
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

                {/* Recurring Toggle */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
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
                  label="Recurring Event"
                  sx={{
                    color: '#ffffff',
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.95rem',
                    },
                  }}
                />

                <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleAddEvent}
                    sx={{
                      backgroundColor: '#9146FF',
                      color: '#ffffff',
                      px: 3,
                      py: 1.5,
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
                        px: 3,
                        py: 1.5,
                        '&:hover': {
                          borderColor: '#7a3bb8',
                          backgroundColor: 'rgba(145, 70, 255, 0.1)',
                        },
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Events List */}
            {events.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Events ({events.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {events.map((event, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        backgroundColor: '#1a1a1a',
                        borderRadius: '8px',
                        border: '1px solid #646cff',
                        '&:hover': {
                          backgroundColor: '#2a2a2a',
                          borderColor: '#9146FF',
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              color: '#ffffff',
                              fontWeight: 'bold',
                              fontSize: '1rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {event.summary}
                          </Typography>
                          {event.isRecurring && (
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 1,
                                py: 0.25,
                                borderRadius: '4px',
                                backgroundColor: 'rgba(145, 70, 255, 0.2)',
                                border: '1px solid #9146FF',
                              }}
                            >
                              <Typography
                                sx={{
                                  color: '#9146FF',
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                🔄 RECURRING
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Typography
                          sx={{
                            color: '#9146FF',
                            fontSize: '0.875rem',
                            mt: 0.5,
                          }}
                        >
                          {event.start}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                        <IconButton
                          size="medium"
                          onClick={() => handleEditEvent(index)}
                          sx={{
                            color: '#9146FF',
                            '&:hover': {
                              backgroundColor: 'rgba(145, 70, 255, 0.1)',
                            },
                          }}
                          title="Edit event"
                        >
                          ✏️
                        </IconButton>
                        <IconButton
                          size="medium"
                          onClick={() => handleDeleteEvent(index)}
                          sx={{
                            color: '#ff6b6b',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            },
                          }}
                          title="Delete event"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #646cff' }}>
              {publishMessage && (
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: publishMessage.type === 'success' ? '#4caf50' : '#f44336',
                      textAlign: 'center',
                      p: 2,
                      backgroundColor: publishMessage.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                      borderRadius: 1,
                    }}
                  >
                    {publishMessage.text}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button
                  onClick={onClose}
                  variant="outlined"
                  sx={{
                    color: '#ffffff',
                    borderColor: '#646cff',
                    px: 3,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: 'rgba(100, 108, 255, 0.1)',
                      borderColor: '#9146FF',
                    },
                  }}
                >
                  Cancel
                </Button>
                
                {isUserAuthenticated && publishToTwitch && (
                  <Button
                    onClick={handlePublish}
                    variant="outlined"
                    disabled={events.length === 0 || isPublishing}
                    sx={{
                      borderColor: '#9146FF',
                      color: '#9146FF',
                      px: 3,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: 'rgba(145, 70, 255, 0.1)',
                        borderColor: '#7a3bb8',
                      },
                      '&:disabled': {
                        borderColor: '#505050',
                        color: '#888888',
                      },
                    }}
                  >
                    {isPublishing ? 'Syncing...' : 'Sync to Twitch'}
                  </Button>
                )}
                
                <Button
                  onClick={handleSave}
                  variant="contained"
                  disabled={events.length === 0}
                  sx={{
                    backgroundColor: '#9146FF',
                    color: '#ffffff',
                    px: 3,
                    py: 1.5,
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
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

function calculateDuration(start: Date, end: Date): string {
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const roundedHours = Math.round(hours * 10) / 10;
  return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
}
