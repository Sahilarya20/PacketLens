const AppType = {
  UNKNOWN: 'Unknown',
  HTTP: 'HTTP',
  HTTPS: 'HTTPS',
  DNS: 'DNS',
  GOOGLE: 'Google',
  YOUTUBE: 'YouTube',
  FACEBOOK: 'Facebook',
  TWITTER: 'Twitter',
  INSTAGRAM: 'Instagram',
  NETFLIX: 'Netflix',
  TIKTOK: 'TikTok',
  AMAZON: 'Amazon',
  MICROSOFT: 'Microsoft',
  APPLE: 'Apple',
  GITHUB: 'GitHub',
  DISCORD: 'Discord',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  ZOOM: 'Zoom',
  CLOUDFLARE: 'Cloudflare',
  TWITCH: 'Twitch',
  REDDIT: 'Reddit',
  LINKEDIN: 'LinkedIn',
  SPOTIFY: 'Spotify',
};

const APP_COLORS = {
  [AppType.YOUTUBE]: '#FF0000',
  [AppType.FACEBOOK]: '#1877F2',
  [AppType.GOOGLE]: '#4285F4',
  [AppType.NETFLIX]: '#E50914',
  [AppType.TWITTER]: '#1DA1F2',
  [AppType.INSTAGRAM]: '#E1306C',
  [AppType.TIKTOK]: '#69C9D0',
  [AppType.AMAZON]: '#FF9900',
  [AppType.MICROSOFT]: '#00A1F1',
  [AppType.APPLE]: '#888888',
  [AppType.GITHUB]: '#238636',
  [AppType.DISCORD]: '#5865F2',
  [AppType.WHATSAPP]: '#25D366',
  [AppType.TELEGRAM]: '#2CA5E0',
  [AppType.ZOOM]: '#2D8CFF',
  [AppType.CLOUDFLARE]: '#F48120',
  [AppType.TWITCH]: '#9146FF',
  [AppType.REDDIT]: '#FF4500',
  [AppType.LINKEDIN]: '#0077B5',
  [AppType.SPOTIFY]: '#1DB954',
  [AppType.HTTPS]: '#10b981',
  [AppType.HTTP]: '#f59e0b',
  [AppType.DNS]: '#8b5cf6',
  [AppType.UNKNOWN]: '#6b7280',
};

function sniToAppType(sni) {
  if (!sni) return AppType.HTTPS;
  const s = sni.toLowerCase();

  if (s.includes('youtube') || s.includes('ytimg') || s.includes('googlevideo'))
    return AppType.YOUTUBE;
  if (s.includes('facebook') || s.includes('fbcdn') || s.includes('fb.com') || s.includes('fbsbx'))
    return AppType.FACEBOOK;
  if (s.includes('instagram') || s.includes('cdninstagram'))
    return AppType.INSTAGRAM;
  if (s.includes('twitter') || s.includes('twimg') || s.includes('t.co') || s.includes('abs.twimg'))
    return AppType.TWITTER;
  if (s.includes('netflix') || s.includes('nflx') || s.includes('nflxvideo'))
    return AppType.NETFLIX;
  if (s.includes('tiktok') || s.includes('muscdn') || s.includes('bytedance'))
    return AppType.TIKTOK;
  if (s.includes('twitch') || s.includes('jtvnw'))
    return AppType.TWITCH;
  if (s.includes('reddit') || s.includes('redd.it') || s.includes('redditmedia'))
    return AppType.REDDIT;
  if (s.includes('linkedin') || s.includes('licdn'))
    return AppType.LINKEDIN;
  if (s.includes('spotify') || s.includes('scdn.co'))
    return AppType.SPOTIFY;
  if (s.includes('amazon') || s.includes('amazonaws') || s.includes('prime') || s.includes('primevideocdn'))
    return AppType.AMAZON;
  if (s.includes('microsoft') || s.includes('live.com') || s.includes('azure') || s.includes('office') || s.includes('teams') || s.includes('onedrive'))
    return AppType.MICROSOFT;
  if (s.includes('apple') || s.includes('icloud') || s.includes('itunes') || s.includes('mzstatic'))
    return AppType.APPLE;
  if (s.includes('github') || s.includes('githubusercontent'))
    return AppType.GITHUB;
  if (s.includes('discord') || s.includes('discordapp'))
    return AppType.DISCORD;
  if (s.includes('whatsapp'))
    return AppType.WHATSAPP;
  if (s.includes('telegram'))
    return AppType.TELEGRAM;
  if (s.includes('zoom') || s.includes('zoomgov'))
    return AppType.ZOOM;
  if (s.includes('cloudflare') || s.includes('cdnjs') || s.includes('1.1.1.1'))
    return AppType.CLOUDFLARE;
  if (s.includes('google') || s.includes('googleapis') || s.includes('gstatic') || s.includes('chrome') || s.includes('gmail') || s.includes('googlesyndication'))
    return AppType.GOOGLE;

  return AppType.HTTPS;
}

function ipToString(uint32) {
  return [
    (uint32 >>> 24) & 0xff,
    (uint32 >>> 16) & 0xff,
    (uint32 >>> 8) & 0xff,
    uint32 & 0xff,
  ].join('.');
}

function ipToUint32(str) {
  const parts = str.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

module.exports = { AppType, APP_COLORS, sniToAppType, ipToString, ipToUint32, formatBytes };
