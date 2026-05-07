import { create } from 'zustand';
import axios from '../lib/axios';

export interface Cluster {
    name: string;
    url: string;
    username: string; // we only get name, but when adding we need more. 
    // Actually the list from backend only has name and url.
}

interface ClusterStore {
    clusters: Cluster[];
    selectedCluster: string | null;
    adminEnabled: boolean;
    isAuthenticated: boolean;
    token: string | null;
    fetchClusters: () => Promise<void>;
    fetchConfig: () => Promise<void>;
    login: (password: string) => Promise<void>;
    logout: () => void;
    addCluster: (cluster: any) => Promise<void>;
    removeCluster: (name: string) => Promise<void>;
    selectCluster: (name: string | null) => void;
    lastVisitedPages: Record<string, string>;
    setLastVisitedPage: (clusterName: string, path: string) => void;
}

const API_URL = '/api/clusters';

export const useClusterStore = create<ClusterStore>((set, get) => ({
    clusters: [],
    selectedCluster: null,
    adminEnabled: false,
    isAuthenticated: !!localStorage.getItem('token'),
    token: localStorage.getItem('token'),
    fetchClusters: async () => {
        try {
            const res = await axios.get(API_URL);
            set({ clusters: res.data });
        } catch (e) {
            console.error(e);
        }
    },
    fetchConfig: async () => {
        try {
            const res = await axios.get('/api/config');
            set({ adminEnabled: res.data.adminEnabled });
        } catch (e) {
            console.error(e);
        }
    },
    login: async (password) => {
        const res = await axios.post('/api/login', { password });
        if (res.data.success) {
            const token = res.data.token;
            localStorage.setItem('token', token);
            set({ isAuthenticated: true, token });
            await get().fetchClusters();
        }
    },
    logout: () => {
        localStorage.removeItem('token');
        set({ isAuthenticated: false, token: null });
    },
    addCluster: async (cluster) => {
        await axios.post(API_URL, cluster);
        await get().fetchClusters();
    },
    removeCluster: async (name) => {
        await axios.delete(`${API_URL}/${name}`);
        await get().fetchClusters();
        if (get().selectedCluster === name) {
            set({ selectedCluster: null });
        }
    },
    selectCluster: (name) => set({ selectedCluster: name }),
    lastVisitedPages: {},
    setLastVisitedPage: (clusterName, path) => set((state) => ({
        lastVisitedPages: { ...state.lastVisitedPages, [clusterName]: path }
    })),
}));
