<div align="center">
  <h1>
    <img src="src/assets/stream_share_logo.svg" alt="Stream Share Logo" width="50" style="vertical-align: middle;"/>
    Stream Share
  </h1>
  
  **Create simple, shareable stream schedule images in seconds – no design tools needed.**
</div>

---

## What is Stream Share?

Stream Share is a web tool that transforms your Livestream schedule into a shareable images and Discord-ready timestamps. Whether you're a streamer, moderator, or community manager, Stream Share makes it easy to keep your audience informed about upcoming streams across all platforms.

**Perfect for:**
- Streamers who want to share their schedule on social media
- Community managers coordinating multiple channels
- Anyone who wants visual flair without design software

## How It Works

Stream Share gives you two ways to create your schedule, then converts it into shareable formats:

1. **Schedule Images** – Polished PNG graphics perfect for Twitter, Instagram, or Discord announcements
2. **Discord Timestamps** – Copy-paste formatted timestamps that automatically adjust to each viewer's timezone

### Quick Start

**Option 1: Use your Twitch schedule**

1. Set up your schedule on your [Twitch Dashboard](https://dashboard.twitch.tv) (**Settings → Channel → Schedule**)
2. Visit [Stream Share](https://chrono32123.github.io/schedule-formatter/)
3. Enter your Twitch username
4. Choose your export format:
   - **Copy Discord Timestamps** – Click to copy formatted text for Discord
   - **Generate Image** – Download a PNG to share anywhere

**Option 2: Create your own schedule**

1. Visit [Stream Share](https://chrono32123.github.io/schedule-formatter/)
2. Click **"Create Schedule"** to manually add events
3. Enter stream titles, dates, times, and categories
4. Export as images or Discord timestamps
5. **NEW:** If logged in, publish your custom schedule directly to Twitch!

Perfect for non-Twitch streamers or anyone who doesn't use Twitch's calendar feature!

## Features

✨ **Automatic Game Icons** – Stream Share fetches game box art from Twitch for visual appeal  
🕐 **Timezone Support** – Discord timestamps automatically adjust for every viewer  
📅 **Week View** – Shows your next 7 days of scheduled streams  
🎨 **Clean Design** – Professional-looking output without any design work  
🔄 **Always in Sync** – Pull the latest schedule whenever you need it  
🔐 **Privacy First** – Login with Twitch to access your schedule. All data stays in your browser  
📤 **Publish to Twitch** – Create custom schedules and publish them directly to your Twitch channel

## Privacy & Data Usage

Stream Share respects your privacy:

- **No server storage** – Your Twitch login token is stored only in your browser's localStorage
- **Minimal permissions** – We only request access to your public profile information
- **What we access**:
  - Your username and profile picture (for display purposes)
  - Your public stream schedule (to generate images and timestamps)
  - Game/category information (for box art)
- **What we DON'T access**:
  - Private messages or chat
  - Subscriber information
  - Financial data
  - Stream keys or settings
- **Data deletion** – Click "Logout" to remove all cached data from your browser

All processing happens client-side in your browser. We never send your personal information to any third-party servers.

## Tips

- **For best results**, include stream titles, categories, and times in your Twitch schedule
- **Update frequently** – Generate new images as your schedule changes
- **Share everywhere** – Use images for Twitter/Instagram and timestamps for Discord
- **No account needed** – Just your public Twitch username

## Contributing

Contributions are welcome! This is an open-source project built with React, TypeScript, and Vite. Check out the [project repository](https://github.com/Chrono32123/schedule-formatter) to get started.

### Development Setup

To run Stream Share locally, you'll need to set up Twitch API credentials:

1. **Create a Twitch Application**:
   - Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
   - Click "Register Your Application"
   - Fill in the required fields:
     - **Name**: Choose a name for your app (e.g., "Stream Share Local Dev")
     - **OAuth Redirect URLs**: Add `http://localhost:5173/schedule-formatter/` (or your local dev URL)
     - **Category**: Choose "Website Integration"
   - Click "Create"
   - Copy your **Client ID** and generate a **Client Secret**

2. **Configure Environment Variables**:
   Create a `.env` file in the project root with:
   ```env
   VITE_TWITCH_CLIENT_ID=your_client_id_here
   VITE_TWITCH_CLIENT_SECRET=your_client_secret_here
   VITE_TWITCH_REDIRECT_URI=http://localhost:5173/schedule-formatter/
   ```

3. **Install and Run**:
   ```bash
   npm install
   npm run dev
   ```

**Note**: The Client Secret is only needed for server-side token generation. For production deployments, consider using a backend service to handle client credentials flow securely.

### User Authentication

Stream Share now supports Twitch login! Users can authenticate with their Twitch account to:
- Automatically load their own schedule without entering a username
- Access their schedule with proper permissions
- Stay logged in across sessions (token is cached in localStorage)

The authentication uses OAuth 2.0 implicit flow, which is secure for client-side applications and doesn't require exposing client secrets.

## Support

Have questions or issues? Feel free to [open an issue](https://github.com/Chrono32123/schedule-formatter/issues) on GitHub.

**Enjoying Stream Share?** Consider supporting the development:

<a href='https://ko-fi.com/chrono_media' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>



## Join the Discord!

If you'd like to provide feedback or share ideas for this project, join The Continuum Discord and take the @StreamShare-Updates role to get access to the feedback channels!

<a href="https://discord.com/invite/HSKUEjk5K7" target="_blank"><img src="https://img.shields.io/badge/Join-The%20Continuum-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join The Continuum Discord"></a>

---

<div align="center">
  Made with ❤️ for the streaming community
</div>
