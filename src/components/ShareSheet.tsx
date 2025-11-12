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
  const [copyImgButtonText, setCopyImgButtonText] = useState('Copy Image to Clipboard');

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
      
      // Copy image blob to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]).then(() => {
                setCopyImgButtonText('Copied!');
        setTimeout(() => setCopyImgButtonText('Copy to Clipboard!') ,2000);
      });
    } catch (err) {
      console.error('Failed to copy image:', err);
      alert('Failed to copy image to clipboard');
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
            Download or Copy Image:
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

            <Tooltip title="Copy Image to Clipboard">
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
