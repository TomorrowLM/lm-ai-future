"""Selectors and browser-side scripts shared by collection services."""

INTERACTIVE_CANDIDATE_SELECTOR = ",".join(
    [
        "button",
        "[role='button']",
        "a",
        "[tabindex='0']",
        "[role='switch']",
        "[role='tab']",
        "[role='menuitem']",
        ".ivu-menu-item",
        ".ivu-tabs-tab",
        ".ant-tabs-tab",
        ".el-tabs__item",
        "[class*='navItem']",
        "[class*='tab']",
        "[class*='Tab']",
        "[class*='menu-item']",
        "[class*='MenuItem']",
        "[class*='switch']",
        "[class*='Switch']",
        "[class*='btn']",
        "[class*='button']",
        "[class*='deleteBtn' i]",
        "[class*='axisY2' i]",
        ".textBtn",
        "*",
    ]
)

NAVIGATION_CANDIDATE_SELECTOR = ",".join(
    [
        "aside li",
        "nav li",
        "[role='navigation'] [role='menuitem']",
        ".ivu-menu-item",
        ".ivu-menu-submenu-title",
        ".ant-menu-item",
        ".ant-menu-submenu-title",
        ".el-menu-item",
        ".el-sub-menu__title",
        "[class*='sidebar'] li",
        "[class*='sider'] li",
        "[class*='menu-item']",
    ]
)

OVERLAY_CANDIDATE_SELECTOR = ",".join(
    [
        "[role='dialog']",
        "[aria-modal='true']",
        "[class*='modal']",
        "[class*='Modal']",
        "[class*='dialog']",
        "[class*='Dialog']",
        "[class*='drawer']",
        "[class*='Drawer']",
        "[class*='overlay']",
        "[class*='Overlay']",
        "[class*='popover']",
        "[class*='Popover']",
        "[data-overlay]",
        "[data-dialog]",
        "[data-drawer]",
        "[data-testid*='dialog']",
        "[data-testid*='drawer']",
    ]
)

CANDIDATE_EVALUATOR = r"""
(elements, {frameUrl}) => {
  const normalize = value => (value || '').replace(/\s+/g, ' ').trim();
  const classify = (element) => {
    const tag = element.tagName.toLowerCase();
    const role = (element.getAttribute('role') || '').toLowerCase();
    const classes = String(element.className || '').toLowerCase();
    if (role === 'menuitem' || classes.includes('menu-item') || classes.includes('ivu-menu-item')) return 'menu';
    if (role === 'tab' || classes.includes('tab') || classes.includes('navitem')) return 'tab';
    if (role === 'switch' || classes.includes('switch')) return 'switch';
    if (role === 'button' || tag === 'button' || classes.includes('button') || classes.includes('btn') || classes.includes('textbtn') || classes.includes('deletebtn') || classes.includes('axisy2')) return 'button';
    if (tag === 'a' || classes.includes('link')) return 'link';
    return 'unknown';
  };
  return elements.filter(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const classes = String(element.className || '').toLowerCase();
    const semantic = element.matches('button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="tab"],[role="menuitem"],[role="switch"],[role="option"],[tabindex]');
    const behavior = typeof element.onclick === 'function' || element.hasAttribute('onclick') || style.cursor === 'pointer';
    const classHint = /(?:btn|button|action|operate|operation|textbtn|axis|delete|edit|add|import|export|search|more|close|reply)/i.test(classes);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      && (semantic || behavior || classHint);
  }).map((element, index) => ({
    index,
    tag: element.tagName.toLowerCase(),
    text: normalize(element.innerText || element.getAttribute('aria-label') || element.title || ''),
    role: element.getAttribute('role'),
    className: String(element.className || ''),
    href: element.getAttribute('href'),
    route: element.getAttribute('href') || element.dataset.route || element.dataset.path || element.dataset.url || null,
    title: element.getAttribute('title'),
    ariaLabel: element.getAttribute('aria-label'),
    ariaHaspopup: element.getAttribute('aria-haspopup'),
    disabled: element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true',
    candidateType: classify(element),
    frameUrl,
    parentClassName: String(element.parentElement?.className || ''),
    html: element.outerHTML.slice(0, 1000)
  }));
}
"""
