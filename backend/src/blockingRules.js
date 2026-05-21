class BlockingRules {
  constructor() {
    this.blockedIPs = new Set();
    this.blockedApps = new Set();
    this.blockedDomains = new Set();
  }

  addIP(ip) {
    const trimmed = ip.trim();
    if (trimmed) this.blockedIPs.add(trimmed);
  }

  removeIP(ip) {
    this.blockedIPs.delete(ip.trim());
  }

  addApp(app) {
    const normalized = app.trim().toLowerCase();
    if (normalized) this.blockedApps.add(normalized);
  }

  removeApp(app) {
    this.blockedApps.delete(app.trim().toLowerCase());
  }

  addDomain(domain) {
    const normalized = domain.trim().toLowerCase();
    if (normalized) this.blockedDomains.add(normalized);
  }

  removeDomain(domain) {
    this.blockedDomains.delete(domain.trim().toLowerCase());
  }

  isBlocked(srcIP, appType, sni) {
    // 1. Source IP blacklist
    if (srcIP && this.blockedIPs.has(srcIP)) {
      return { blocked: true, reason: `Source IP ${srcIP} blacklisted` };
    }

    // 2. Application type blacklist
    if (appType && this.blockedApps.has(appType.toLowerCase())) {
      return { blocked: true, reason: `Application "${appType}" blocked` };
    }

    // 3. Domain substring match
    if (sni) {
      const lowerSNI = sni.toLowerCase();
      for (const domain of this.blockedDomains) {
        if (lowerSNI.includes(domain)) {
          return { blocked: true, reason: `Domain matching "${domain}" blocked` };
        }
      }
    }

    return { blocked: false, reason: null };
  }

  getAll() {
    return {
      ips: Array.from(this.blockedIPs),
      apps: Array.from(this.blockedApps),
      domains: Array.from(this.blockedDomains),
    };
  }

  count() {
    return this.blockedIPs.size + this.blockedApps.size + this.blockedDomains.size;
  }

  clear() {
    this.blockedIPs.clear();
    this.blockedApps.clear();
    this.blockedDomains.clear();
  }
}

module.exports = BlockingRules;
