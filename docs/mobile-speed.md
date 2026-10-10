# Mobile navigation and loading

Verified locally on October 8, 2026. This change is not deployed.

Mobile HTML links now use the existing pinned content router instead of loading another document. Six route payloads are cached, shared scripts run once, and page metadata and widgets update on navigation. Browser Back and Forward use document scroll on Mobile and the content pane on Desktop. Mobile history also restores the service strip and overview disclosure.

The mobile controller preloads directly from the initial HTML. The shared router loads on the first internal navigation; page load no longer warms three speculative service destinations. Once the router is installed, link hover, keyboard focus, and touch can warm up to three destinations. SaveData and 2G connections skip warming. External links, downloads, view changes, and unavailable routed resources retain native navigation. This loading change was made locally on October 10, 2026; the measurements below describe the October 8 layout.

The homepage heading and mobile image area are rendered in the initial HTML. A reserved image surface provides a placeholder while the selected WebP downloads. Hidden mobile artwork stays lazy in other presentations. The updated layout removes the duplicate blue service button and audience line, uses 8-pixel outer margins, and crops a larger image flush with the card edges.

| Local mobile audit | Before | Final larger-image layout |
| --- | ---: | ---: |
| Lighthouse performance | 89 | 97 |
| First contentful paint | 1.59 s | 1.33 s |
| Largest contentful paint | 2.41 s | 2.48 s |
| Layout shift | 0.181 | 0 |
| Total blocking time | 0 ms | 0 ms |

Profile: Lighthouse mobile, 390 × 844, simulated mobile network and 4× CPU slowdown, localhost preview. Timing varies; the intermediate smaller-image layout scored 98–99. The larger image changes what paints above the fold. These are local measurements, not production or physical-phone measurements.

Verification: full build, installer, 145 performance checks, and 26 analytics checks passed on a fixed source snapshot. Browser checks covered content swaps, clean automatic Mobile URLs, Back restoring reading and disclosure state, Docs tabs, search, and widths of 320 and 390 pixels without document overflow. A bounded code review found no remaining actionable navigation issues.

![Updated mobile homepage at 390 pixels](assets/mobile-home-refined.jpg)
