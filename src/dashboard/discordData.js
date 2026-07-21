const { REST, Routes, ChannelType } = require('discord.js');

async function getGuildData(client) {
  const config = client.config || {};
  const guildID = config.guildID;
  let token = process.env.TOKEN || config.TOKEN;
  if (!token || token === 'YOUR_DISCORD_BOT_TOKEN') {
    if (config.TOKEN_B64) {
      try {
        token = Buffer.from(config.TOKEN_B64, 'base64').toString('utf-8');
      } catch (e) {}
    }
  }

  let channels = [];
  let categories = [];
  let roles = [];
  let totalMembers = 0;
  let onlineMembers = 0;

  if (!guildID) {
    return { channels, categories, roles, totalMembers, onlineMembers };
  }

  // 1. Try WebSocket client if active
  if (client && client.guilds && client.guilds.cache && client.guilds.cache.has(guildID)) {
    try {
      const guild = await client.guilds.fetch(guildID).catch(() => null);
      if (guild) {
        channels = guild.channels.cache
          .filter(c => [ChannelType.GuildText, ChannelType.GuildVoice].includes(c.type))
          .map(c => ({ id: c.id, name: c.name, type: c.type }));

        categories = guild.channels.cache
          .filter(c => c.type === ChannelType.GuildCategory)
          .map(c => ({ id: c.id, name: c.name }));

        roles = guild.roles.cache
          .filter(r => !r.managed && r.name !== '@everyone')
          .map(r => ({ id: r.id, name: r.name }));

        await guild.members.fetch().catch(() => {});
        const members = guild.members.cache || new Map();
        totalMembers = members.size || 0;
        onlineMembers = members.filter ? members.filter(m => m.presence && m.presence.status !== 'offline').size : 0;

        return { channels, categories, roles, totalMembers, onlineMembers };
      }
    } catch (err) {
      console.warn('WebSocket guild fetch failed, trying REST API:', err.message);
    }
  }

  // 2. Fallback to Discord REST API (for Vercel serverless / HTTP API)
  if (token && token !== 'YOUR_DISCORD_BOT_TOKEN') {
    try {
      const rest = new REST({ version: '10' }).setToken(token);

      // Fetch Guild Details (with member counts)
      const guildRes = await rest.get(Routes.guild(guildID), { query: new URLSearchParams({ with_counts: 'true' }) }).catch(() => null);
      if (guildRes) {
        totalMembers = guildRes.approximate_member_count || 0;
        onlineMembers = guildRes.approximate_presence_count || 0;
      }

      // Fetch Channels
      const rawChannels = await rest.get(Routes.guildChannels(guildID)).catch(() => []);
      if (Array.isArray(rawChannels)) {
        channels = rawChannels
          .filter(c => c.type === 0 || c.type === 2)
          .map(c => ({ id: c.id, name: c.name, type: c.type === 0 ? ChannelType.GuildText : ChannelType.GuildVoice }));

        categories = rawChannels
          .filter(c => c.type === 4)
          .map(c => ({ id: c.id, name: c.name }));
      }

      // Fetch Roles
      const rawRoles = await rest.get(Routes.guildRoles(guildID)).catch(() => []);
      if (Array.isArray(rawRoles)) {
        roles = rawRoles
          .filter(r => !r.managed && r.name !== '@everyone')
          .map(r => ({ id: r.id, name: r.name }));
      }
    } catch (restErr) {
      console.error('Discord REST API fetch error:', restErr.message || restErr);
    }
  }

  return { channels, categories, roles, totalMembers, onlineMembers };
}

module.exports = { getGuildData };
