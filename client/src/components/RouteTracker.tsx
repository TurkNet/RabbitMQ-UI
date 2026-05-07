import { useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { useClusterStore } from '../store/useClusterStore';

export const RouteTracker = () => {
    const location = useLocation();
    const setLastVisitedPage = useClusterStore((state) => state.setLastVisitedPage);

    useEffect(() => {
        // Match both exact cluster route and sub-routes
        const match = matchPath({ path: '/cluster/:clusterName/*' }, location.pathname) || 
                      matchPath({ path: '/cluster/:clusterName' }, location.pathname);

        if (match && match.params.clusterName) {
            const clusterName = match.params.clusterName;
            const prefix = `/cluster/${clusterName}`;
            
            // Extract subpath (e.g., "/queues" or "")
            let subPath = location.pathname.substring(prefix.length);
            
            // Ensure we don't store just a slash if it's the root aggregation
            if (subPath === '/') subPath = '';
            
            setLastVisitedPage(clusterName, subPath);
        }
    }, [location, setLastVisitedPage]);

    return null;
};
