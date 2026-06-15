// static/js/app_core.js
// ==========================================================================
// 《时空山城》交互状态机与聊天中枢核心调度脚本 (全纯净无错版 v1.0.2)
// 职责：严格管理行为流转、动态数据过滤、空间跨度冷提示、及定位接驳参数打包
// ==========================================================================

// 1. 全局状态机配置
const SYSTEM_STATE = {
    currentStage: 0,       // 0: 初始化, 1: 模式已选, 2: 景点勾选中, 3: 指令打包完毕
    selectedMode: null,     // 'story' (剧情模式) 或 'free' (自选模式)
    activeTheme: null,      // 剧情模式下锁定的主题名称
    selectedTags: [],       // 自选模式下激活的标签墙数组
    checkedSpotIds: [],     // 用户当前打勾选中的景点ID数组
    userLocation: null      // 精准定位抓取到的原点 [lng, lat]
};

// 2. 终极解耦启动入口：供 HTML 内的轮询判定器安全呼叫
function startShanChengEngine() {
    console.log("[时空山城] 信号对接成功，智慧交互舱开始初始化...");
    initChatConsole();
}

// 3. 聊天控制台首屏渲染 (Turn 1: 模式海选入口)
function initChatConsole() {
    SYSTEM_STATE.currentStage = 0;
    SYSTEM_STATE.selectedMode = null;
    SYSTEM_STATE.checkedSpotIds = [];
    
    const container = document.getElementById("chat-container");
    if (!container) return;
    
    container.innerHTML = ""; 
    
    // 打印系统欢迎气泡
    appendChatBubble("system", "欢迎来到智慧山城。请选择您的探索模式以开启今晚的旅程：");
    
    // 渲染模式双子星选择按钮容器
    const actionDiv = document.createElement("div");
    actionDiv.className = "chat-action-row";
    actionDiv.style.display = "flex";
    actionDiv.style.gap = "12px";
    actionDiv.style.marginTop = "10px";
    actionDiv.style.width = "100%";
    
    const btnStory = document.createElement("button");
    btnStory.className = "chat-interactive-btn accent";
    btnStory.style.flex = "1";
    btnStory.innerHTML = "🔮 A. 剧情沉浸模式 (10大主题)";
    btnStory.onclick = function() { selectSystemMode("story"); };
    
    const btnFree = document.createElement("button");
    btnFree.className = "chat-interactive-btn";
    btnFree.style.flex = "1";
    btnFree.innerHTML = "🔍 B. 自由自选模式 (主城100点)";
    btnFree.onclick = function() { selectSystemMode("free"); };
    
    actionDiv.appendChild(btnStory);
    actionDiv.appendChild(btnFree);
    container.appendChild(actionDiv);
    scrollChatToBottom();
}

// 4. 模式切换状态管理 (Turn 2: 分支路由分流)
function selectSystemMode(mode) {
    if (SYSTEM_STATE.currentStage > 0) return; 
    
    SYSTEM_STATE.selectedMode = mode;
    SYSTEM_STATE.currentStage = 1;
    
    const userChoiceText = mode === "story" ? "我选择：🔮 A. 剧情沉浸模式" : "我选择：🔍 B. 自由自选模式";
    appendChatBubble("user", userChoiceText);
    
    disableLastActionRow();
    
    setTimeout(function() {
        if (mode === "story") {
            renderStoryThemeSelection();
        } else {
            renderFreeTagSelection();
        }
    }, 300);
}

// 5. 剧情模式分支逻辑 (Turn 2a: 渲染10大预设主题)
function renderStoryThemeSelection() {
    appendChatBubble("system", "已为您锁定剧情模式。系统已初始推荐以下 10 大主题路线，请选择你最心仪的主题开启时空对齐：");
    
    const themeContainer = document.createElement("div");
    themeContainer.className = "chat-theme-slide";
    themeContainer.style.display = "flex";
    themeContainer.style.flexDirection = "column";
    themeContainer.style.gap = "8px";
    themeContainer.style.marginTop = "10px";
    themeContainer.style.width = "100%";
    
    SHANCHENG_THEME_MATRIX.forEach(function(theme) {
        const row = document.createElement("div");
        row.className = "theme-capsule-item";
        row.innerHTML = '<i class="fa ' + theme.icon + '" style="color:#1677ff; width:16px;"></i> <strong style="margin-left:6px; font-size:12px;">' + theme.name + '</strong><span class="desc" style="margin-left:auto; font-size:11px;">' + theme.desc + '</span>';
        row.onclick = function() { lockStoryTheme(theme.name); };
        themeContainer.appendChild(row);
    });
    
    document.getElementById("chat-container").appendChild(themeContainer);
    scrollChatToBottom();
}

function lockStoryTheme(themeName) {
    SYSTEM_STATE.activeTheme = themeName;
    SYSTEM_STATE.currentStage = 2;
    
    appendChatBubble("user", "确定的主题线：👉 " + themeName);
    disableLastActionRow();
    
    appendChatBubble("system", "已激活专属数据集。请在下方勾选您想去的目标景点（系统将自动监控大跨度能耗）：");
    renderFilterSpotGrid();
}

// 6. 自选模式分支逻辑 (Turn 2b: 标签墙海选与动态缩编)
function renderFreeTagSelection() {
    appendChatBubble("system", "已为您锁定自选模式。请选择您感兴趣的城市体验标签，系统将从热门景点中为您筛选：");
    
    const tagWall = document.createElement("div");
    tagWall.className = "chat-tag-wall";
    tagWall.style.display = "flex";
    tagWall.style.flexWrap = "wrap";
    tagWall.style.gap = "6px";
    tagWall.style.marginTop = "10px";
    tagWall.style.width = "100%"; // 【已修复】彻底清洗 100__ 笔误
    
    FREE_MODE_TAGS.forEach(function(tag, tIdx) {
        const tBtn = document.createElement("button");
        tBtn.className = "tag-wall-pill" + (tag === "全部" ? " active" : "");
        tBtn.textContent = "#" + tag;
        tBtn.id = "tag-pill-node-" + tIdx;
        
        tBtn.onclick = function() {
            if (tag === "全部") {
                SYSTEM_STATE.selectedTags = [];
                document.querySelectorAll(".tag-wall-pill").forEach(b => b.classList.remove('active'));
                tBtn.classList.add('active');
            } else {
                const firstPill = document.querySelector(".tag-wall-pill");
                if(firstPill) firstPill.classList.remove('active');
                
                var idx = SYSTEM_STATE.selectedTags.indexOf(tag);
                if (idx === -1) { SYSTEM_STATE.selectedTags.push(tag); tBtn.classList.add('active'); }
                else { SYSTEM_STATE.selectedTags.splice(idx, 1); tBtn.classList.remove('active'); }
                
                if (SYSTEM_STATE.selectedTags.length === 0 && firstPill) firstPill.classList.add('active');
            }
            // 【已修复】移除此处导致闭环死循环的直接调用，交由独立刷新器渲染
            executeFreeGridFilterQuery();
        };
        tagWall.appendChild(tBtn);
    });
    
    document.getElementById("chat-container").appendChild(tagWall);
    
    appendChatBubble("system", "根据选定的标签，下方已筛选出推荐景点，您可以自由多选勾选：");
    
    const gridWrapper = document.createElement("div");
    gridWrapper.id = "free-spot-grid-wrapper";
    gridWrapper.style.width = "100%";
    document.getElementById("chat-container").appendChild(gridWrapper);
    
    executeFreeGridFilterQuery();
}

// 7. 独立网格数据刷表组件
function executeFreeGridFilterQuery() {
    const wrapper = document.getElementById("free-spot-grid-wrapper");
    if (!wrapper) return;
    wrapper.innerHTML = "";
    
    const grid = document.createElement("div");
    grid.className = "spot-interactive-grid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, 1fr)";
    grid.style.gap = "8px";
    grid.style.width = "100%";
    
    CHONGQING_SPOT_POOL.forEach(function(spot) {
        let isMatch = true;
        if (SYSTEM_STATE.selectedTags.length > 0) {
            isMatch = SYSTEM_STATE.selectedTags.some(t => spot.tags.indexOf(t) !== -1);
        }
        let isSelected = SYSTEM_STATE.checkedSpotIds.indexOf(spot.id) !== -1;
        if (!isMatch && !isSelected) return;
        
        const item = document.createElement("div");
        item.className = "grid-spot-card" + (isSelected ? " selected" : "");
        item.innerHTML = '<div class="card-cb"></div><div class="card-meta"><strong>' + spot.name + '</strong><span>' + spot.district + '</span></div>';
        
        item.onclick = function() { toggleSpotCheckedState(spot, item); };
        grid.appendChild(item);
    });
    
    wrapper.appendChild(grid);
    renderBottomActionButton();
}

// 8. 严格的剧情网格数据刷表组件
function renderFilterSpotGrid() {
    const container = document.getElementById("chat-container");
    const grid = document.createElement("div");
    grid.className = "spot-interactive-grid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, 1fr)";
    grid.style.gap = "8px";
    grid.style.marginTop = "12px";
    grid.style.width = "100%";
    
    CHONGQING_SPOT_POOL.forEach(function(spot) {
        if (spot.storyThemes.indexOf(SYSTEM_STATE.activeTheme) === -1) return;
        
        const item = document.createElement("div");
        item.className = "grid-spot-card";
        item.id = "spot-card-" + spot.id;
        item.innerHTML = '<div class="card-cb"></div><div class="card-meta"><strong>' + spot.name + '</strong><span>海拔: ' + spot.altitude + 'm</span></div>';
        
        item.onclick = function() { toggleSpotCheckedState(spot, item); };
        grid.appendChild(item);
    });
    
    container.appendChild(grid);
    renderBottomActionButton();
    scrollChatToBottom();
}

// 9. 景点勾选状态控制及大跨度冷提示机制
function toggleSpotCheckedState(spot, element) {
    var idx = SYSTEM_STATE.checkedSpotIds.indexOf(spot.id);
    if (idx === -1) {
        if (SYSTEM_STATE.selectedMode === "free" && SYSTEM_STATE.checkedSpotIds.length > 0) {
            const firstSelectedSpot = CHONGQING_SPOT_POOL.find(s => s.id === SYSTEM_STATE.checkedSpotIds[0]);
            if (firstSelectedSpot && firstSelectedSpot.zoneTag !== spot.zoneTag) {
                printSystemAlertBubble("⚠️ 时空能耗预警：“" + spot.name + "”距离您已选的区域较远。系统将允许勾选，并在地图唤醒后自动采用分治模型切片行程。");
            }
        }
        SYSTEM_STATE.checkedSpotIds.push(spot.id);
        element.classList.add("selected");
    } else {
        SYSTEM_STATE.checkedSpotIds.splice(idx, 1);
        element.classList.remove("selected");
    }
    
    const actionBtn = document.getElementById("action-submit-btn");
    if (actionBtn) {
        if (SYSTEM_STATE.checkedSpotIds.length < 2) {
            actionBtn.disabled = true;
            actionBtn.textContent = "请至少选择 2 个景点";
        } else {
            actionBtn.disabled = false;
            actionBtn.textContent = "选好了，一键智算最佳下游览顺序 (" + SYSTEM_STATE.checkedSpotIds.length + ")";
        }
    }
}

// 10. 第一阶段完备收敛：位置抓取与指令打包
function renderBottomActionButton() {
    if (document.getElementById("action-submit-btn")) return;
    
    const container = document.getElementById("panel"); 
    const btn = document.createElement("button");
    btn.id = "action-submit-btn";
    btn.className = "action-submit-main-btn";
    btn.disabled = true;
    btn.textContent = "请至少选择 2 个景点";
    
    btn.onclick = function() { finalizeInteractionPhase(btn); };
    container.appendChild(btn);
}

function finalizeInteractionPhase(buttonElement) {
    buttonElement.disabled = true;
    buttonElement.textContent = "⚡ 正在调用 Geolocation 抓取实时原点...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                SYSTEM_STATE.userLocation = [position.coords.longitude, position.coords.latitude];
                executeMapAwakening();
            },
            function(error) {
                printSystemAlertBubble("ℹ️ 实时 GPS 权限未开启，系统已将首个选中点作为原点动线闭环。");
                SYSTEM_STATE.userLocation = null;
                executeMapAwakening();
            },
            { timeout: 3000 }
        );
    } else {
        executeMapAwakening();
    }
}

function executeMapAwakening() {
    SYSTEM_STATE.currentStage = 3;
    appendChatBubble("user", "🚀 选好了，开始生成实时航线！");
    disableLastActionRow();
    
    const awakenEvent = new CustomEvent("ShanChengEngineAwake", {
        detail: {
            mode: SYSTEM_STATE.selectedMode,
            theme: SYSTEM_STATE.activeTheme,
            spots: SYSTEM_STATE.checkedSpotIds,
            origin: SYSTEM_STATE.userLocation
        }
    });
    window.dispatchEvent(awakenEvent);
}

// ==========================================================================
// 辅助小工具函数
// ==========================================================================
function appendChatBubble(sender, text) {
    const container = document.getElementById("chat-container");
    if (!container) return;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble-row " + (sender === "system" ? "sys-row" : "user-row");
    bubble.innerHTML = '<div class="bubble-content">' + text + '</div>';
    container.appendChild(bubble);
    scrollChatToBottom();
}

function printSystemAlertBubble(text) {
    const container = document.getElementById("chat-container");
    if (!container) return;
    const alertBox = document.createElement("div");
    alertBox.className = "chat-alert-inline-box";
    alertBox.style.background = "#fff7e6";
    alertBox.style.border = "1px solid #ffd591";
    alertBox.style.color = "#d46b08";
    alertBox.style.fontSize = "11px";
    alertBox.style.padding = "6px 12px";
    alertBox.style.borderRadius = "6px";
    alertBox.style.marginBottom = "10px";
    alertBox.style.width = "100%";
    alertBox.textContent = text;
    container.appendChild(alertBox);
    scrollChatToBottom();
}

function disableLastActionRow() {
    const elements = document.querySelectorAll(".chat-interactive-btn, .theme-capsule-item");
    elements.forEach(el => {
        el.style.pointerEvents = "none";
        if(!el.classList.contains("accent") && el.style.opacity === "") {
            el.style.opacity = "0.4";
        }
    });
}

function scrollChatToBottom() {
    const scrollArea = document.querySelector(".panel-scroll-area");
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
}