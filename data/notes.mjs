export const notes = [
  {
    slug: '2026-11-24-guest-submission-and-hardware-repro',
    publishedAt: '2026-11-24T08:41:00.000Z',
    title: 'Bounded world-transition tests narrowed two failures',
    summary: 'The software trace identified a guest-queue submission. The hardware run ended in a separate guest null write. Gameplay is still unverified.',
    paragraphs: [
      'With caller and fence diagnostics enabled, the software-rendered run reported device removal after 158.01 seconds at zero-based list index 24 in a 32-list guest queue submission. This distinguishes the reporting path from presentation or capture in that run; it does not identify the exact faulting command or cause. The debug layer was unavailable.',
      'The bounded RX 9060 XT run, without per-list timing or capture, ended after 115.97 seconds with a guest null write. No host device-removal report was observed in that run. The short intro again held 30 FPS; loading was much slower and was not a gameplay benchmark. Both runs restored the original package access rules. Controllable gameplay remains unverified.',
    ],
  },
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
