/** Original SVG geometry: shared perspective keeps all sixty cities legible at map scale. */
export function cityModelMarkup(capital = false, port = false): string {
  return `<ellipse cx="1" cy="7" rx="20" ry="7" fill="#34483b" opacity=".2"/>
    <path d="M-18-2 0-11 18-2 0 7Z" fill="#e8d6ad" stroke="#6e775e" stroke-width=".8"/>
    <path d="M-18-2 0 7V16L-18 7Z" fill="#9ca285" stroke="#68745f" stroke-width=".8"/>
    <path d="M0 7 18-2V7L0 16Z" fill="#6f826b" stroke="#586d59" stroke-width=".8"/>
    <path d="M-17-4-14-5V-2L-11 0V-3L-8-1V2L-5 3V0L-2 2V5L0 6 17-3V0L0 9-17 0Z" fill="#c7c6a5" stroke="#7e8b72" stroke-width=".6"/>
    <path d="M-9 11V6Q-6 2-3 7V14Z" fill="#465d4d"/>
    <path d="M-7-12 4-17 13-12 2-7Z" fill="#657d6c"/>
    <path d="M-6-11 2-7V1L-6-3Z" fill="#e5c99d"/>
    <path d="M2-7 12-12V-4L2 1Z" fill="#b5a77d"/>
    <path d="M-10-12 3-19 16-13 3-6Z" fill="#8a5944" stroke="#5f5141" stroke-width=".7"/>
    <path d="M3-19 16-13 3-6Z" fill="#694b3e"/>
    <path d="M-10-12 3-16 16-13M3-19V-6" fill="none" stroke="#d0a679" stroke-width=".7"/>
    ${capital ? '<path d="M-4-19 3-23 10-20 3-16Z" fill="#af794b" stroke="#6d5740" stroke-width=".6"/><path d="M3-23V-27" stroke="#70553b"/><path d="M3-27H10L8-24H3Z" fill="currentColor"/>' : ''}
    ${port ? '<path d="M11 12 22 6M15 14 24 9M18 9 20 12" stroke="#637e83" stroke-width="1.5" fill="none"/>' : ''}`;
}
