import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import './shareSheet.css';
import { ParsedEvent } from '../App';
import { ScheduleTemplate } from '../types/template';
import { ALL_TEMPLATES } from '../templates/templates';
import { GenerateScheduleImageFromTemplate } from './ScheduleImage';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  imageDataUrl: string;
  filename: string;
  title: string;
  // Template support
  events?: ParsedEvent[];
  twitchUsername?: string;
  profileImageUrl?: string;
  extractCategory?: (desc: string) => string | null;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  open,
  onClose,
  imageDataUrl: initialImageDataUrl,
  filename,
  title,
  events,
  twitchUsername,
  profileImageUrl,
  extractCategory,
}) => {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [copyImgButtonText, setCopyImgButtonText] = useState('Copy Image');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string>(initialImageDataUrl);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Detect if we're on iOS or if Web Share API is available
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const hasShareAPI = !!navigator.share;
  const buttonLabel = (isIOS || hasShareAPI) && !navigator.clipboard?.write ? 'Share Image' : 'Copy Image';
  
  // Template support is available only if events and related props are provided
  const hasTemplateSupport = !!(events && twitchUsername && extractCategory);

  // Reset to initial image when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentImageDataUrl(initialImageDataUrl);
      setSelectedTemplateId('default');
    }
  }, [open, initialImageDataUrl]);
  
  // Regenerate image when template changes
  useEffect(() => {
    if (!hasTemplateSupport || !open) return;
    
    // If switching back to default, restore the initial image
    if (selectedTemplateId === 'default') {
      setCurrentImageDataUrl(initialImageDataUrl);
      return;
    }
    
    const regenerateImage = async () => {
      setIsGenerating(true);
      try {
        const selectedTemplate = ALL_TEMPLATES.find(t => t.id === selectedTemplateId);
        if (!selectedTemplate || !events || !twitchUsername || !extractCategory) return;
        
        const newImageUrl = await GenerateScheduleImageFromTemplate({
          template: selectedTemplate,
          events,
          eventCount: events.length,
          twitchUsername,
          daysForward: '7',
          profileImageUrl,
          extractCategory,
        });
        
        if (newImageUrl) {
          setCurrentImageDataUrl(newImageUrl);
        }
      } catch (error) {
        console.error('Failed to regenerate image with template:', error);
      } finally {
        setIsGenerating(false);
      }
    };
    
    regenerateImage();
  }, [selectedTemplateId, hasTemplateSupport, open, events, twitchUsername, profileImageUrl, extractCategory, initialImageDataUrl]);
  
  const downloadImage = () => {
    const link = document.createElement('a');
    const selectedTemplate = ALL_TEMPLATES.find(t => t.id === selectedTemplateId);
    const templateSuffix = selectedTemplateId !== 'default' ? `_${selectedTemplateId}` : '';
    link.download = filename.replace('.png', `${templateSuffix}.png`);
    link.href = currentImageDataUrl;
    link.click();
  };

  const copyImage = async () => {
    try {
      // Convert data URL to blob
      const response = await fetch(currentImageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/png' });
      
      // Check if we're in a secure context (HTTPS or localhost)
      const isSecureContext = window.isSecureContext;
      
      // On mobile/iOS, prefer Web Share API first as it's more reliable
      // But it only works in secure contexts (HTTPS or localhost)
      const canShare = isSecureContext && navigator.canShare ? navigator.canShare({ files: [file] }) : false;
      const hasShareAPI = typeof navigator.share === 'function';
      const isShareSupported = hasShareAPI && canShare;
      
      if (isShareSupported) {
        try {
          await navigator.share({
            files: [file],
            title: title,
          });
          setCopyImgButtonText('Shared!');
          setTimeout(() => setCopyImgButtonText(buttonLabel), 2000);
          return;
        } catch (shareErr: any) {
          // User cancelled the share, don't show an error
          if (shareErr.name === 'AbortError') {
            return;
          }
          console.warn('Web Share API failed, trying Clipboard API:', shareErr);
        }
      }
      
      // Try Clipboard API as fallback (works on desktop in secure contexts)
      if (isSecureContext && navigator.clipboard && ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopyImgButtonText('Copied!');
          setTimeout(() => setCopyImgButtonText(buttonLabel), 2000);
          return;
        } catch (clipboardErr) {
          console.warn('Clipboard API failed:', clipboardErr);
        }
      }
      
      // For non-secure contexts or when APIs aren't available
      // Automatically download with helpful feedback
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (!isSecureContext && (isIOS || hasShareAPI)) {
        // Show a one-time helpful message for development
        console.info('Share/Copy features require HTTPS. Downloading image instead. This will work properly when deployed.');
      }
      
      setCopyImgButtonText('Downloading...');
      downloadImage();
      setTimeout(() => setCopyImgButtonText(buttonLabel), 2000);
      
    } catch (err) {
      console.error('Failed to copy/share image:', err);
      // Silently fall back to download
      downloadImage();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth className="share-sheet-dialog">
      <DialogTitle className="share-sheet-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Share Your Schedule</Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent className="share-sheet-content">
        {/* Template Selection */}
        {hasTemplateSupport && (
          <Box className="template-selector-container" sx={{ mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="template-select-label">Template Style</InputLabel>
              <Select
                labelId="template-select-label"
                value={selectedTemplateId}
                label="Template Style"
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isGenerating}
              >
                <MenuItem value="default">Default</MenuItem>
                {ALL_TEMPLATES.filter(t => t.id !== 'default').map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} {template.description && `- ${template.description}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTemplateId !== 'default' && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                Preview updates automatically when you select a template
              </Typography>
            )}
          </Box>
        )}
        
        {/* Image Preview */}
        <Box className="image-preview-container" sx={{ position: 'relative' }}>
          {isGenerating && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1,
                borderRadius: 1,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <img src={currentImageDataUrl} alt="Schedule preview" className="image-preview" />
        </Box>

        {/* Share Buttons */}
        <Box className="share-buttons-container">
          <Typography variant="subtitle2" className="share-section-title">
            Download or Share Image:
          </Typography>

          <Box className="other-buttons">
            <Tooltip title="Download Image">
              <Button
                variant="outlined"
                className="other-button"
                onClick={downloadImage}
                startIcon={<DownloadIcon />}
                disabled={isGenerating}
              >
                Download Image
              </Button>
            </Tooltip>

            <Tooltip title={buttonLabel}>
              <Button
                variant="outlined"
                className="other-button"
                onClick={copyImage}
                startIcon={<CopyIcon />}
                disabled={isGenerating}
              >{copyImgButtonText}
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions className="share-sheet-actions">
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
