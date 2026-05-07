import { Router } from 'express';
import { getClusters, addCluster, removeCluster } from '../config.js';
import { authMiddleware } from '../auth.js';
import dns from 'node:dns/promises';

const router = Router();
const ENABLE_ADMIN = process.env.ENABLE_ADMIN === 'true';

// GET /api/clusters — always public
router.get('/', (req, res) => {
    const clusters = getClusters();
    const safeClusters = clusters.map(c => ({
        name: c.name,
        url: c.url,
        username: c.username,
    }));
    res.json(safeClusters);
});

// POST /api/clusters — only when ENABLE_ADMIN=true
router.post('/', (req, res, next) => {
    if (!ENABLE_ADMIN) {
        res.status(403).json({ error: 'Admin mode is disabled. Set ENABLE_ADMIN=true to allow cluster management.' });
        return;
    }
    next();
}, authMiddleware, async (req, res) => {
    try {
        const { name, url, username, password } = req.body;
        if (!name || !url || !username || !password) {
            res.status(400).json({ error: 'Missing fields' });
            return;
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch (err) {
            res.status(400).json({ error: 'Invalid URL format' });
            return;
        }

        const isLocalOrMetadata = async (hostname: string) => {
            try {
                const lookup = await dns.lookup(hostname);
                const ip = lookup.address;
                return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.') || ip.startsWith('169.254.');
            } catch {
                return false;
            }
        };

        if (process.env.ALLOW_LOCAL_CLUSTERS !== 'true' && await isLocalOrMetadata(parsedUrl.hostname)) {
            res.status(400).json({ error: 'Local or metadata URLs are not allowed (SSRF protection). Set ALLOW_LOCAL_CLUSTERS=true to override.' });
            return;
        }

        addCluster({ name, url, username, password });
        res.status(201).json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE /api/clusters/:name — only when ENABLE_ADMIN=true
router.delete('/:name', (req, res, next) => {
    if (!ENABLE_ADMIN) {
        res.status(403).json({ error: 'Admin mode is disabled.' });
        return;
    }
    next();
}, authMiddleware, (req, res) => {
    const name = typeof req.params.name === 'string' ? req.params.name : '';
    removeCluster(name);
    res.json({ success: true });
});

export default router;
