import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, '../settings.json');

export interface Cluster {
    name: string;
    url: string; // Base URL like http://localhost:15672
    username: string;
    password: string;
}

const ALGORITHM = 'aes-256-gcm';
// Key is guaranteed to exist because index.ts exits if it doesn't
const encryptionKeyBuffer = crypto.createHash('sha256').update(String(process.env.ENCRYPTION_KEY)).digest();

const encrypt = (text: string): string => {
    const iv = crypto.randomBytes(12); // GCM uses 12 byte IV
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKeyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
};

const decrypt = (text: string): string => {
    try {
        const textParts = text.split(':');
        if (textParts.length === 3) {
            // GCM Decryption (IV : AuthTag : Ciphertext)
            const iv = Buffer.from(textParts[0]!, 'hex');
            const authTag = Buffer.from(textParts[1]!, 'hex');
            const encryptedText = Buffer.from(textParts[2]!, 'hex');
            
            const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKeyBuffer, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText, undefined, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } else if (textParts.length === 2) {
            // Fallback for old CBC encrypted data
            const iv = Buffer.from(textParts[0]!, 'hex');
            const encryptedText = Buffer.from(textParts[1]!, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        }
        return text;
    } catch (e) {
        return text;
    }
};

export const getClusters = (): Cluster[] => {
    if (!fs.existsSync(SETTINGS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};

export const saveClusters = (clusters: Cluster[]) => {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(clusters, null, 2));
};

export const addCluster = (cluster: Cluster) => {
    const clusters = getClusters();
    if (clusters.find(c => c.name === cluster.name)) {
        throw new Error('Cluster with this name already exists');
    }
    const encryptedCluster = {
        ...cluster,
        password: encrypt(cluster.password)
    };
    clusters.push(encryptedCluster);
    saveClusters(clusters);
};

export const removeCluster = (name: string) => {
    let clusters = getClusters();
    clusters = clusters.filter(c => c.name !== name);
    saveClusters(clusters);
};

export const getClusterByName = (name: string): Cluster | undefined => {
    const clusters = getClusters();
    const cluster = clusters.find(c => c.name === name);
    if (cluster) {
        return {
            ...cluster,
            password: decrypt(cluster.password)
        };
    }
    return undefined;
};

export const initClusters = () => {
    const clustersFromEnv: Cluster[] = [];
    
    // Support legacy CLUSTERS_JSON (array)
    if (process.env.CLUSTERS_JSON) {
        try {
            const parsed = JSON.parse(process.env.CLUSTERS_JSON);
            if (Array.isArray(parsed)) {
                clustersFromEnv.push(...parsed);
            }
        } catch (e: any) {
            console.error('[init] Failed to parse CLUSTERS_JSON:', e.message);
        }
    }

    // Support CLUSTER_1, CLUSTER_2, etc. (individual objects)
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('CLUSTER_')) {
            try {
                const parsed = JSON.parse(process.env[key] as string);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    clustersFromEnv.push(parsed as Cluster);
                }
            } catch (e: any) {
                console.error(`[init] Failed to parse ${key}:`, e.message);
            }
        }
    }

    if (clustersFromEnv.length > 0) {
        const currentClusters = getClusters();
        const newClusters: Cluster[] = [];
        
        for (const cluster of clustersFromEnv) {
            if (cluster.name && cluster.url && cluster.username && cluster.password) {
                if (!currentClusters.find(c => c.name === cluster.name)) {
                     const encryptedCluster = {
                        ...cluster,
                        password: encrypt(cluster.password)
                    };
                    newClusters.push(encryptedCluster);
                }
            } else {
                 console.error(`[init] Invalid cluster object in env: missing required fields`);
            }
        }
        
        if (newClusters.length > 0) {
             saveClusters([...currentClusters, ...newClusters]);
             console.log(`[init] Pre-loaded ${newClusters.length} clusters from environment variables`);
        }
    }
};
