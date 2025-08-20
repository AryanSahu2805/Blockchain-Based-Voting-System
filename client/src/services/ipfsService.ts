import React from 'react';

class IPFSService {
  private gateway: string;
  private fallbackGateways: string[];

  constructor() {
    this.gateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    this.fallbackGateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];
  }

  /**
   * Get IPFS URL for a hash
   */
  getIPFSUrl(hash: string): string {
    if (!hash) return '';
    return `${this.gateway}${hash}`;
  }

  /**
   * Get fallback URLs for IPFS content
   */
  getIPFSFallbackUrls(hash: string): string[] {
    if (!hash) return [];
    return this.fallbackGateways.map(gateway => `${gateway}${hash}`);
  }

  /**
   * Fetch content from IPFS with fallback
   */
  async fetchContent(hash: string): Promise<Response | null> {
    const urls = this.getIPFSFallbackUrls(hash);
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${url}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Fetch JSON content from IPFS
   */
  async fetchJSON<T>(hash: string): Promise<T | null> {
    try {
      const response = await this.fetchContent(hash);
      if (!response) return null;
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch JSON from IPFS:', error);
      return null;
    }
  }

  /**
   * Fetch election metadata from IPFS
   */
  async fetchElectionMetadata(hash: string): Promise<any> {
    try {
      const metadata: any = await this.fetchJSON(hash);
      if (!metadata) {
        throw new Error('Failed to fetch election metadata');
      }
      
      return {
        title: metadata.title || '',
        description: metadata.description || '',
        candidates: metadata.candidates || [],
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        creator: metadata.creator || '',
        timestamp: metadata.timestamp || Date.now()
      };
    } catch (error) {
      console.error('Error fetching election metadata:', error);
      throw error;
    }
  }

  /**
   * Fetch voting proof from IPFS
   */
  async fetchVotingProof(hash: string): Promise<any> {
    try {
      const proof: any = await this.fetchJSON(hash);
      if (!proof) {
        throw new Error('Failed to fetch voting proof');
      }
      
      return {
        electionId: proof.electionId,
        voterAddress: proof.voterAddress,
        candidateId: proof.candidateId,
        timestamp: proof.timestamp,
        signature: proof.signature,
        merkleProof: proof.merkleProof || null
      };
    } catch (error) {
      console.error('Error fetching voting proof:', error);
      throw error;
    }
  }

  /**
   * Create optimized image component with fallback
   */
  createImageWithFallback(hash: string, alt: string, className?: string): JSX.Element {
    const urls = this.getIPFSFallbackUrls(hash);
    
    return React.createElement('img', {
      src: urls[0],
      alt: alt,
      className: className,
      onError: (e: any) => {
        const target = e.target as HTMLImageElement;
        const currentSrc = target.src;
        const currentIndex = urls.indexOf(currentSrc);
        
        if (currentIndex < urls.length - 1) {
          // Try next fallback URL
          target.src = urls[currentIndex + 1];
        } else {
          // Show placeholder or error state
          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDlWN0MxOCA0IDYgNCA2IDdWOUMyIDkgMiAxMyAyIDEzSDE0QzE0IDEzIDE0IDkgMTQgOVY3QzE0IDUgMTYgNSAxNiA3VjlIMjFaIiBzdHJva2U9IiM2MzczOTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
        }
      }
    });
  }

  /**
   * Verify IPFS hash format
   */
  isValidIPFSHash(hash: string): boolean {
    // IPFS v0 CID (Qm...)
    const v0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    // IPFS v1 CID (bafy...)
    const v1Pattern = /^bafy[a-z2-7]{55}$/;
    
    return v0Pattern.test(hash) || v1Pattern.test(hash);
  }

  /**
   * Get IPFS gateway status
   */
  async checkGatewayStatus(gateway: string): Promise<boolean> {
    try {
      const response = await fetch(`${gateway}QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get best available gateway
   */
  async getBestGateway(): Promise<string> {
    const gateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];

    for (const gateway of gateways) {
      if (await this.checkGatewayStatus(gateway)) {
        return gateway;
      }
    }

    // Return default if all fail
    return this.gateway;
  }

  /**
   * Format IPFS hash for display
   */
  formatIPFSHash(hash: string, length: number = 12): string {
    if (!this.isValidIPFSHash(hash)) {
      return hash;
    }
    
    if (hash.length <= length) {
      return hash;
    }
    
    const start = hash.substring(0, Math.ceil(length / 2));
    const end = hash.substring(hash.length - Math.floor(length / 2));
    
    return `${start}...${end}`;
  }

  /**
   * Get IPFS content size
   */
  async getContentSize(hash: string): Promise<number | null> {
    try {
      const response = await fetch(this.getIPFSUrl(hash), { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : null;
    } catch (error) {
      console.error('Failed to get content size:', error);
      return null;
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create IPFS explorer link
   */
  getExplorerLink(hash: string): string {
    return `https://ipfs.io/ipfs/${hash}`;
  }

  /**
   * Get Pinata explorer link
   */
  getPinataExplorerLink(hash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
}

export default IPFSService;