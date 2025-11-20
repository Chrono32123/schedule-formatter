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
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import './shareSheet.css';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  imageDataUrl: string;
  filename: string;
  title: string;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  open,
  onClose,
  imageDataUrl,
  filename,
  title,
}) => {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [copyImgButtonText, setCopyImgButtonText] = useState('Copy Image');
  
  // Detect if we're on iOS or if Web Share API is available
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const hasShareAPI = !!navigator.share;
  const buttonLabel = (isIOS || hasShareAPI) && !navigator.clipboard?.write ? 'Share Image' : 'Copy Image';

  const downloadImage = () => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = imageDataUrl;
    link.click();
  };

  const copyImage = async () => {
    try {
      // Convert data URL to blob
      const response = await fetch(imageDataUrl);
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
        {/* Image Preview */}
        <Box className="image-preview-container">
          <img src={imageDataUrl} alt="Schedule preview" className="image-preview" />
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
