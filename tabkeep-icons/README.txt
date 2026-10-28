拾页 Tabkeep 图标文件

png/
  icon16.png  icon32.png   小尺寸简化版（浏览器工具栏、标签页图标）
  icon48.png               扩展管理页
  icon128.png              安装提示和应用商店；按 Chrome 规范，图形 96px，四周各留 16px 透明边
  tabkeep-1024.png         宣传图、商店素材
  *-dark.png               深色版本，同样的尺寸

svg/
  tabkeep.svg / tabkeep-dark.svg               完整版源文件
  tabkeep-small.svg / tabkeep-small-dark.svg   小尺寸简化版源文件

manifest.json 示例：
  "icons": { "16": "icons/icon16.png", "32": "icons/icon32.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  "action": { "default_icon": { "16": "icons/icon16.png", "32": "icons/icon32.png" } }
