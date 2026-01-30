/**
 * Parse user agent string to extract browser, OS, and device information
 */

export interface ParsedUserAgent {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  deviceName: string | null;
}

/**
 * Parse user agent string
 */
export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      deviceType: "unknown",
      deviceName: null,
    };
  }

  const ua = userAgent.toLowerCase();

  // Detect browser
  const browserInfo = detectBrowser(userAgent);

  // Detect OS
  const osInfo = detectOS(userAgent);

  // Detect device type
  const deviceType = detectDeviceType(ua);

  // Generate device name
  const deviceName = generateDeviceName(browserInfo.browser, osInfo.os, deviceType);

  return {
    ...browserInfo,
    ...osInfo,
    deviceType,
    deviceName,
  };
}

function detectBrowser(ua: string): { browser: string | null; browserVersion: string | null } {
  const browsers: [RegExp, string][] = [
    [/edg(?:e|a|ios)?\/(\d+(?:\.\d+)?)/i, "Edge"],
    [/chrome\/(\d+(?:\.\d+)?)/i, "Chrome"],
    [/firefox\/(\d+(?:\.\d+)?)/i, "Firefox"],
    [/safari\/(\d+(?:\.\d+)?)/i, "Safari"],
    [/opr\/(\d+(?:\.\d+)?)/i, "Opera"],
    [/msie\s(\d+(?:\.\d+)?)/i, "Internet Explorer"],
    [/trident.*rv:(\d+(?:\.\d+)?)/i, "Internet Explorer"],
  ];

  for (const [regex, name] of browsers) {
    const match = ua.match(regex);
    if (match) {
      // Special case: Chrome UA also contains Safari, need to check order
      if (name === "Safari" && /chrome/i.test(ua)) {
        continue;
      }
      return { browser: name, browserVersion: match[1] || null };
    }
  }

  return { browser: null, browserVersion: null };
}

function detectOS(ua: string): { os: string | null; osVersion: string | null } {
  const osPatterns: [RegExp, string, RegExp?][] = [
    [/windows nt (\d+(?:\.\d+)?)/i, "Windows", /windows nt (\d+(?:\.\d+)?)/i],
    [/mac os x (\d+[._]\d+(?:[._]\d+)?)/i, "macOS", /mac os x (\d+[._]\d+(?:[._]\d+)?)/i],
    [/iphone os (\d+[._]\d+)/i, "iOS", /iphone os (\d+[._]\d+)/i],
    [/ipad.*os (\d+[._]\d+)/i, "iPadOS", /os (\d+[._]\d+)/i],
    [/android (\d+(?:\.\d+)?)/i, "Android", /android (\d+(?:\.\d+)?)/i],
    [/linux/i, "Linux"],
    [/cros/i, "Chrome OS"],
  ];

  for (const [regex, name, versionRegex] of osPatterns) {
    if (regex.test(ua)) {
      let version: string | null = null;
      if (versionRegex) {
        const match = ua.match(versionRegex);
        if (match) {
          version = match[1].replace(/_/g, ".");
        }
      }
      return { os: name, osVersion: version };
    }
  }

  return { os: null, osVersion: null };
}

function detectDeviceType(ua: string): "desktop" | "mobile" | "tablet" | "unknown" {
  // Tablets
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return "tablet";
  }

  // Mobile devices
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    return "mobile";
  }

  // Desktop (default for most user agents that don't match mobile patterns)
  if (/windows|macintosh|linux|cros/i.test(ua)) {
    return "desktop";
  }

  return "unknown";
}

function generateDeviceName(
  browser: string | null,
  os: string | null,
  deviceType: string
): string {
  const parts: string[] = [];

  if (os) {
    parts.push(os);
  }

  if (browser) {
    parts.push(browser);
  }

  if (parts.length === 0) {
    return deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
  }

  return parts.join(" - ");
}

/**
 * Get friendly device description for display
 */
export function getDeviceDescription(parsed: ParsedUserAgent): string {
  const parts: string[] = [];

  if (parsed.os) {
    parts.push(parsed.os + (parsed.osVersion ? ` ${parsed.osVersion}` : ""));
  }

  if (parsed.browser) {
    parts.push(parsed.browser + (parsed.browserVersion ? ` ${parsed.browserVersion}` : ""));
  }

  if (parts.length === 0) {
    return "Unknown device";
  }

  return parts.join(" / ");
}
