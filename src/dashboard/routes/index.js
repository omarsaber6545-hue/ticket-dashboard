const express = require('express');
const path = require('path');
const { getGuildData } = require('../discordData');

module.exports = (client) => {
    const router = express.Router();

    const getUptime = () => {
        if (!client || !client.uptime || isNaN(client.uptime)) {
            return 'Online (Vercel)';
        }
        const totalSeconds = client.uptime / 1000;
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    router.get('/', async (req, res) => {
        let config = client.config;
        let channels = [];
        let categories = [];
        let totalMembers = 0;
        let onlineMembers = 0;

        try {
            const data = await getGuildData(client);
            channels = data.channels;
            categories = data.categories;
            totalMembers = data.totalMembers;
            onlineMembers = data.onlineMembers;
        } catch (error) {
            console.error('Error fetching guild data:', error);
        }

        const ticketCount = config.optionConfig ? Object.keys(config.optionConfig).length : 0;
        const sectionCount = config.ticketOptions ? config.ticketOptions.length : 0;
        const botUptime = getUptime();

        const ticketOptionsLabels = config.ticketOptions ? config.ticketOptions.map(option => option.label) : [];
        const ticketOptionsData = config.ticketOptions ? config.ticketOptions.map(option => {
            return Math.floor(Math.random() * 100) + 1;
        }) : [];

        const message = req.query.message || null;
        const error = req.query.error || null;

        res.render('index', {
            config,
            ticketCount,
            sectionCount,
            channels,
            categories,
            totalMembers,
            onlineMembers,
            botUptime,
            ticketOptionsLabels,
            ticketOptionsData,
            activePage: 'home',
            message,
            error
        });
    });

    return router;
};
