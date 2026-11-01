/**
 * What kind of browser a visit came from: device · operating system · browser · bot or not.
 * Small on purpose: the families people actually use · everything else is "Diğer".
 */

/** Crawlers · link previews · automation · command line clients. They are never counted. */
const BOT = /bot\b|bot\/|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|facebookcatalog|embedly|quora link|pinterest|whatsapp|telegram|discord|skype|slack|vkshare|preview|headless|phantom|puppeteer|playwright|selenium|webdriver|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl\/|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|httpclient|scrapy|ahrefs|semrush|mj12|dotbot|petalbot|yandex(bot|images)|baiduspider|duckduckbot|applebot|gptbot|claudebot|anthropic|perplexity|ccbot|bytespider/i;

export interface Agent {
  bot: boolean;
  os: string;
  browser: string;
  /** From the browser string alone (the viewport width decides when this says nothing). */
  mobile: boolean | null;
  tablet: boolean;
}

export function parseAgent(ua: string): Agent {
  const s = ua ?? '';
  const bot = !s || s.length < 12 || BOT.test(s);
  const ipad = /iPad/.test(s) || (/Macintosh/.test(s) && /Mobile\//.test(s));
  const os = /Windows NT/.test(s)
    ? 'Windows'
    : ipad
      ? 'iPadOS'
      : /iPhone|iPod/.test(s)
        ? 'iOS'
        : /Android/.test(s)
          ? 'Android'
          : /CrOS/.test(s)
            ? 'ChromeOS'
            : /Mac OS X|Macintosh/.test(s)
              ? 'macOS'
              : /Linux/.test(s)
                ? 'Linux'
                : '';
  const browser = /Edg(e|A|iOS)?\//.test(s)
    ? 'Edge'
    : /OPR\/|Opera/.test(s)
      ? 'Opera'
      : /SamsungBrowser/.test(s)
        ? 'Samsung'
        : /YaBrowser/.test(s)
          ? 'Yandex'
          : /Firefox\/|FxiOS/.test(s)
            ? 'Firefox'
            : /CriOS|Chrome\//.test(s)
              ? 'Chrome'
              : /Safari\//.test(s)
                ? 'Safari'
                : '';
  const tablet = ipad || (/Android/.test(s) && !/Mobile/.test(s)) || /Tablet/.test(s);
  const mobile = tablet ? false : /Mobi|iPhone|iPod|Android/.test(s) ? true : /Windows NT|Macintosh|CrOS|X11/.test(s) ? false : null;
  return { bot, os, browser, mobile, tablet };
}

/** phone · tablet · desktop: the browser string first · the viewport width when it is unclear. */
export function deviceOf(a: Agent, width: number): 'phone' | 'tablet' | 'desktop' {
  if (a.tablet) return 'tablet';
  if (a.mobile === true) return 'phone';
  if (a.mobile === false) return width && width < 700 ? 'phone' : 'desktop';
  return width && width < 700 ? 'phone' : width && width < 1100 ? 'tablet' : 'desktop';
}
