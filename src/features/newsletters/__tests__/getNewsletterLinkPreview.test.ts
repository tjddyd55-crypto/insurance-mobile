import { getNewsletterLinkPreview, normalizeNewsletterLinkPreview } from '../getNewsletterLinkPreview';

const samplePreview = {
  url: 'https://thedoum-counseling.co.kr/',
  title: '내 보험금 조금 더 받기 프로젝트',
  description: '설명',
  imageUrl: 'https://example.com/og.jpg',
  siteName: '더도움',
};

describe('normalizeNewsletterLinkPreview', () => {
  it('keeps camelCase preview fields', () => {
    expect(normalizeNewsletterLinkPreview(samplePreview)).toEqual({
      url: samplePreview.url,
      title: samplePreview.title,
      description: samplePreview.description,
      imageUrl: samplePreview.imageUrl,
      siteName: samplePreview.siteName,
      domain: 'thedoum-counseling.co.kr',
    });
  });

  it('maps snake_case and alias fields used by the API/DB', () => {
    expect(
      normalizeNewsletterLinkPreview({
        link_url: 'https://www.m.blog.naver.com/minihelper/223499024370',
        link_title: '교통사고 후유장해. 보험사에서 기왕증으로 합의',
        link_description: '보험사 기왕증 주장에 대한 안내',
        image_url: 'https://cdn.example.com/og.jpg',
        site_name: '네이버 블로그',
      }),
    ).toEqual({
      url: 'https://www.m.blog.naver.com/minihelper/223499024370',
      title: '교통사고 후유장해. 보험사에서 기왕증으로 합의',
      description: '보험사 기왕증 주장에 대한 안내',
      imageUrl: 'https://cdn.example.com/og.jpg',
      siteName: '네이버 블로그',
      domain: 'm.blog.naver.com',
    });
  });

  it('reads image and site aliases when title already uses camelCase', () => {
    expect(
      normalizeNewsletterLinkPreview({
        url: 'https://news.example.com/a',
        title: '안내',
        image: 'https://cdn.example.com/cover.png',
        link_site_name: '매일경제',
      }),
    ).toMatchObject({
      imageUrl: 'https://cdn.example.com/cover.png',
      siteName: '매일경제',
      domain: 'news.example.com',
    });
  });

  it('returns null without a usable url', () => {
    expect(normalizeNewsletterLinkPreview({ title: '만 있음' })).toBeNull();
    expect(normalizeNewsletterLinkPreview(null)).toBeNull();
  });
});

describe('getNewsletterLinkPreview', () => {
  it('reads top-level camelCase linkPreview', () => {
    const preview = getNewsletterLinkPreview({
      bodyText: 'https://example.com/',
      linkPreview: samplePreview,
    });
    expect(preview?.url).toBe(samplePreview.url);
    expect(preview?.imageUrl).toBe(samplePreview.imageUrl);
  });

  it('reads top-level snake_case link_preview', () => {
    const preview = getNewsletterLinkPreview({
      link_preview: {
        link_url: 'https://m.blog.naver.com/minihelper/1',
        link_title: '교통사고 후유장해',
        image_url: 'https://cdn.example.com/og.jpg',
        site_name: '네이버 블로그',
      },
    });
    expect(preview).toMatchObject({
      url: 'https://m.blog.naver.com/minihelper/1',
      title: '교통사고 후유장해',
      imageUrl: 'https://cdn.example.com/og.jpg',
      siteName: '네이버 블로그',
      domain: 'm.blog.naver.com',
    });
  });

  it('reads payload.linkPreview', () => {
    const preview = getNewsletterLinkPreview({
      bodyText: samplePreview.url,
      payload: { linkPreview: samplePreview },
    });
    expect(preview?.url).toBe(samplePreview.url);
    expect(preview?.title).toBe(samplePreview.title);
  });

  it('reads payload.link_preview snake_case', () => {
    const preview = getNewsletterLinkPreview({
      payload: {
        link_preview: {
          url: 'https://example.com/from-payload',
          image_url: 'https://cdn.example.com/p.jpg',
        },
      },
    });
    expect(preview?.url).toBe('https://example.com/from-payload');
    expect(preview?.imageUrl).toBe('https://cdn.example.com/p.jpg');
  });

  it('parses string payload JSON', () => {
    const preview = getNewsletterLinkPreview({
      payload: JSON.stringify({ linkPreview: samplePreview }),
    });
    expect(preview?.url).toBe(samplePreview.url);
  });

  it('reads nested raw.payload.linkPreview', () => {
    const preview = getNewsletterLinkPreview({
      raw: { payload: { linkPreview: samplePreview } },
    });
    expect(preview?.title).toBe(samplePreview.title);
  });

  it('prefers top-level preview over payload', () => {
    const preview = getNewsletterLinkPreview({
      linkPreview: { url: 'https://top.example.com' },
      payload: { linkPreview: samplePreview },
    });
    expect(preview?.url).toBe('https://top.example.com');
  });

  it('returns null when preview is missing', () => {
    expect(getNewsletterLinkPreview({ bodyText: 'https://example.com/', payload: {} })).toBeNull();
    expect(getNewsletterLinkPreview(null)).toBeNull();
  });
});
