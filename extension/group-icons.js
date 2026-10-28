// Decorative category symbols derived only from the visible group name.
export const groupIconChoices=['auto','code','idea','components','map','team','book','music','tools','inbox','folder'];
export function groupIconLabel(choice,language='zh'){
 const labels={auto:['自动匹配','Automatic'],code:['代码','Code'],idea:['灵感','Idea'],components:['组件','Components'],map:['地图','Map'],team:['团队','Team'],book:['阅读','Reading'],music:['音乐','Music'],tools:['工具','Tools'],inbox:['收件箱','Inbox'],folder:['文件夹','Folder']};
 return (labels[choice]||labels.auto)[language==='en'?1:0];
}
export function groupIcon(name, choice='auto') {
 const patterns = [
  [/开发|技术|编程|build|develop|code|engineering/i, 'm8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18'],
  [/设计|灵感|inspiration|design|visual/i, 'M9 18h6 M10 21h4 M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2'],
  [/组件|component/i, 'm12 2 4 4-4 4-4-4z m-6 6 4 4-4 4-4-4z m12 0 4 4-4 4-4-4z m-6 6 4 4-4 4-4-4z'],
  [/旅行|地图|travel|map/i, 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16'],
  [/协作|团队|team|collab/i, 'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M5 21v-3a7 7 0 0 1 14 0v3 M3 5a3 3 0 0 1 0 6 M21 5a3 3 0 0 0 0 6 M2 14v5 M22 14v5'],
  [/阅读|学习|科学|read|learn|science/i, 'M12 5C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1z M12 5v16'],
  [/音乐|放松|music|audio/i, 'M9 18V5l11-2v13 M9 8l11-2 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  [/工具|util|tool/i, 'm14 5 5 5 M8 13l-5 5 3 3 5-5 M14 3a6 6 0 0 0-6 8l5 5a6 6 0 0 0 8-6l-4 3-6-6z'],
  [/待整理|ungrouped|unclassified/i, 'M3 4h18v16H3z M3 13h5l2 3h4l2-3h5'],
 ];
 const index=groupIconChoices.indexOf(choice)-1;
 const path=(choice==='auto'?patterns.find(([pattern])=>pattern.test(name))?.[1]:patterns[index]?.[1]) || 'M3 5h7l2 3h9v12H3z';
 return `<svg class="group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}
