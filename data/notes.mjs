export const notes = [
  {
    slug: '2026-11-24-intro-and-world-entry',
    publishedAt: '2026-11-24T08:00:00.000Z',
    title: 'Hardware intro measured; world entry still unresolved',
    summary: 'The short hardware intro was reported at 30 FPS. A later debug attempt ended before world entry.',
    paragraphs: [
      'Leonida’s progress feed reported 30 FPS (about 33.3 ms per frame) during the short native D3D12 hardware intro. That figure measures only the intro. Controllable hardware gameplay was not verified, and the feed did not report an independent reproduction.',
      'The team completed the single-list device-removal trace and added diagnostics to distinguish guest and presenter failures. An earlier run failed during the transition to the world. The latest attempt requested the debug layer, but it was unavailable, and the run ended before world entry. That attempt did not identify the failing caller or establish a cause.',
    ],
  },
];
