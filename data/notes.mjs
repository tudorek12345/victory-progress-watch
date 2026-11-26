export const notes = [
  {
    slug: '2026-11-26-software-world-transition',
    publishedAt: '2026-11-26T03:58:00.000Z',
    title: 'Series X reached the world transition before memory ran out',
    summary: 'The Radeon showed the intro at 30 FPS and reached world loading. Controllable gameplay is still unverified.',
    source: 'local',
    paragraphs: [
      'The local test used the VIctory 7900 XTX fork (e2a28ec7) with D3D12 WARP software rendering on an RX 9060 XT host. Lighter loading samples ranged from 12.9 to 20.3 FPS. A memory allocation failed after the run reached its 16 GiB commit cap. The test ended after 155.45 seconds. Controllable gameplay remains unverified.',
      'The process had read 3.67 GB by 139 seconds. In the last reported interval, the runtime averaged 2,836 dropped draws per frame and reported 1,150 pipelines still being made.',
      'The Series S software run finished its four-minute timer with 5.96 GiB peak job commit and black captured output. The Series X hardware runs on the RX 9060 XT held 30 FPS through the intro and early loading. Both exhausted the same 16 GiB limit at world entry.',
      'Prewarming 23 previously used pipelines and using smaller buffer windows let the second Radeon run reach a world submission with 957 indirect operations per frame in the last reported interval. One loading sample spent 371 ms preparing textures in a 385 ms frame. No rendered mission or player response was verified.',
      'A follow-up allowed 24 GiB of job commit. The physical memory guard ended the job at 15.66 GiB when host RAM available dropped below 3 GiB. The package access rules were restored.',
    ],
  },
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
