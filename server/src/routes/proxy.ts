import { Router, type Request, type Response, type NextFunction } from 'express';
import axios from 'axios';
import { getClusterByName } from '../config.js';
import { authMiddleware } from '../auth.js';

const router = Router();
const ENABLE_ADMIN = process.env.ENABLE_ADMIN === 'true';

const ADMIN_RABBIT_ROUTES = ['/api/users', '/api/vhosts', '/api/policies', '/api/parameters', '/api/permissions'];

// Route: /:clusterName/* (using Regex because of strict path-to-regexp)
router.all(/^\/([^/]+)\/(.*)/, (req: Request, res: Response, next: NextFunction) => {
    const clusterName = (req.params as any)[0] as string;
    // Use regex to extract path portion after /<clusterName>/ regardless of encoding
    const pathMatch = req.originalUrl.match(/^\/api\/proxy\/[^\/]+\/(.+?)(?:\?|$)/);
    const path: string = pathMatch?.[1] ?? '';
    
    // Check if the requested RabbitMQ endpoint is an admin endpoint
    const isAdminRoute = ADMIN_RABBIT_ROUTES.some(adminPath => path.startsWith(adminPath.replace(/^\//, '')));

    if (isAdminRoute) {
        if (!ENABLE_ADMIN) {
            res.status(403).json({ error: 'Forbidden: Admin routes are disabled in read-only mode' });
            return;
        }
        // Enforce JWT authentication for admin routes if admin mode is enabled
        authMiddleware(req, res, () => next());
    } else {
        // Public stats endpoints
        next();
    }
}, async (req: Request, res: Response) => {
    const clusterName = (req.params as any)[0] as string;
    const cluster = getClusterByName(clusterName);

    // Extract the raw path from originalUrl preserving encoded characters (e.g. %2F in vhosts)
    const pathMatch = req.originalUrl.match(/^\/api\/proxy\/[^\/]+\/(.+?)(?:\?|$)/);
    const path: string = pathMatch?.[1] ?? '';

    if (!cluster) {
        res.status(404).json({ error: 'Cluster not found' });
        return;
    }

    // Construct target URL using the captured raw path
    const targetUrl = `${cluster.url.replace(/\/$/, '')}/${path}`;

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            params: req.query, // Forward query parameters
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${cluster.username}:${cluster.password}`).toString('base64'),
                'Content-Type': 'application/json'
            },
            data: req.body,
        });

        res.status(response.status).json(response.data);
    } catch (error: any) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

export default router;
