import { Box, Typography, Link } from '@mui/material';
import './App.css'; // Reuse App.css for styling

const Footer = () => {
  return (
    <Box component="footer" className="footer">
      <Typography variant="body2" color="white" align="center">
        © {new Date().getFullYear()} Stream Schedule Tool -PREVIEW by Chrono.
        Built with help from {' '}
        <Link href="https://grok.com" target="_blank" rel="noopener" color="#9146FF"> Grok</Link>
      </Typography>
    </Box>
  );
};

export default Footer;