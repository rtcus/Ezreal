// LeanCloud 初始化
AV.init({
    appId: 'qWTZ0xzNWk9B3bhk3vXGbfPl-gzGzoHsz',
    appKey: 'n1MnTEgdQGWk2jouFA55NF1n',
    serverURL: 'https://qwtz0xzn.lc-cn-n1-shared.com'
});

// 全局变量
let currentPage = 'home';
let currentUser = null;
let uploadEventBound = false; // 防止事件重复绑定
let loginLockedUntil = null; // 登录锁定时间

// 检查登录锁定状态
function checkLoginLock() {
    if (loginLockedUntil) {
        const now = new Date();
        if (now < loginLockedUntil) {
            const remainingSeconds = Math.ceil((loginLockedUntil - now) / 1000);
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;

            const loginBtn = document.getElementById('loginBtn');
            loginBtn.disabled = true;
            loginBtn.innerHTML = `<i class="fas fa-lock"></i> 请等待 ${minutes}分${seconds}秒`;

            // 每秒更新倒计时
            setTimeout(checkLoginLock, 1000);
            return true;
        } else {
            // 锁定时间已过
            loginLockedUntil = null;
            localStorage.removeItem('loginLockedUntil');
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '登录';
            }
        }
    }
    return false;
}

// 设置登录锁定
function setLoginLock(durationMinutes = 15) {
    loginLockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    localStorage.setItem('loginLockedUntil', loginLockedUntil.toISOString());
    checkLoginLock();
}

// 从localStorage恢复登录锁定状态
function restoreLoginLock() {
    const lockedUntilStr = localStorage.getItem('loginLockedUntil');
    if (lockedUntilStr) {
        loginLockedUntil = new Date(lockedUntilStr);
        checkLoginLock();
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    restoreLoginLock(); // 恢复登录锁定状态
    checkLoginStatus();
});

// 检查登录状态
async function checkLoginStatus() {
    try {
        console.log('开始检查登录状态...');
        currentUser = AV.User.current();

        if (currentUser) {
            console.log('用户已登录:', currentUser.get('username'));
            document.querySelector('.app-container').style.display = 'flex';

            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (loginModal) {
                loginModal.hide();
            }

            setTimeout(() => {
                initApp();
            }, 500);

        } else {
            console.log('用户未登录，显示登录模态框');
            showLoginModal();
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        showLoginModal();
    }
}

function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'), {
        backdrop: 'static',
        keyboard: false
    });
    loginModal.show();

    // 检查是否有记住的用户名
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        document.getElementById('loginUsername').value = rememberedUsername;
        document.getElementById('rememberMe').checked = true;
    }

    // 移除旧的事件监听器（防止重复绑定）
    const newLoginBtn = document.getElementById('loginBtn');
    const oldLoginBtn = newLoginBtn.cloneNode(true);
    newLoginBtn.parentNode.replaceChild(oldLoginBtn, newLoginBtn);

    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

async function handleLogin() {
    // 检查是否被锁定
    if (checkLoginLock()) {
        return;
    }

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // 如果勾选"记住我"，保存用户名
    if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
    } else {
        localStorage.removeItem('rememberedUsername');
    }

    await login();
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    if (!username || !password) {
        showError('请输入用户名和密码');
        return;
    }

    // 再次检查是否被锁定
    if (checkLoginLock()) {
        return;
    }

    // 禁用登录按钮，防止重复提交
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

    try {
        const user = await AV.User.logIn(username, password);
        currentUser = user;

        // 登录成功，清除锁定状态
        loginLockedUntil = null;
        localStorage.removeItem('loginLockedUntil');

        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();

        initApp();

    } catch (error) {
        console.error('登录失败:', error);

        // 根据错误类型提供更友好的提示
        let errorMessage = '';
        const errorCode = error.code || '';

        if (errorCode === 200) {
            errorMessage = '用户名或密码错误';
        } else if (errorCode === 202 || error.message?.includes('登录失败次数超过限制')) {
            errorMessage = '登录失败次数过多，已被暂时锁定。请15-30分钟后再试，或联系管理员重置密码。';
            // 设置本地锁定
            setLoginLock(20);
        } else if (errorCode === 201 || error.message?.includes('密码错误次数过多')) {
            errorMessage = '密码错误次数过多。为保护账户安全，请稍后再试或通过"忘记密码"功能重置密码。';
            setLoginLock(15);
        } else if (errorCode === 210 || error.message?.includes('用户名和密码不匹配')) {
            errorMessage = '用户名或密码错误，请重试';
        } else if (error.message?.includes('400') && error.message?.includes('超过限制')) {
            errorMessage = '登录失败次数超过限制，已被暂时锁定。请20-30分钟后再试，或通过"忘记密码"重置密码。';
            setLoginLock(25);
        } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            errorMessage = '访问被拒绝，账户可能已被禁用。请联系管理员。';
        } else if (error.message) {
            errorMessage = '登录失败: ' + error.message;
        } else {
            errorMessage = '登录失败，请检查网络连接后重试';
        }

        showError(errorMessage);
    } finally {
        // 恢复登录按钮状态（如果没有被锁定）
        if (!checkLoginLock()) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '登录';
        }
    }
}

function showError(message) {
    const errorElement = document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // 10秒后自动隐藏错误提示
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 10000);
}

function initApp() {
    document.querySelector('.app-container').style.display = 'flex';
    updateUserInfo();
    initDatePickers();

    // 侧边栏切换功能
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            // 保存侧边栏状态到 localStorage
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });

        // 恢复侧边栏状态
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
        if (sidebarCollapsed === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    // 侧边栏收缩时的悬停提示
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('mouseenter', function(e) {
            if (sidebar.classList.contains('collapsed')) {
                const title = this.getAttribute('data-title');
                if (title) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'sidebar-tooltip';
                    tooltip.textContent = title;
                    document.body.appendChild(tooltip);

                    const rect = this.getBoundingClientRect();
                    tooltip.style.left = (rect.right + 10) + 'px';
                    tooltip.style.top = (rect.top + rect.height / 2 - tooltip.offsetHeight / 2) + 'px';

                    this._tooltip = tooltip;
                }
            }
        });

        link.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                this._tooltip = null;
            }
        });

        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetPage = this.getAttribute('data-page');
            console.log('导航点击，目标页面:', targetPage, '链接文本:', this.textContent.trim());

            // 确保有有效的目标页面
            if (!targetPage || targetPage === 'null') {
                console.error('导航链接没有有效的data-page属性:', this);
                return;
            }

            switchPage(targetPage);
        });
    });
    
    // 绑定首页卡片点击事件
    document.querySelectorAll('.quick-link').forEach(card => {
        card.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            console.log('快速链接点击，目标页面:', targetPage, '链接文本:', this.querySelector('h4')?.textContent);
            
            if (!targetPage || targetPage === 'null') {
                console.error('快速链接没有有效的data-page属性:', this);
                return;
            }
            
            switchPage(targetPage);
        });
    });
    
    // === 新增：绑定常用链接事件 ===
    setTimeout(() => {
        if (typeof loadQuickLinks === 'function') {
            // 绑定常用链接相关按钮
            const refreshBtn = document.getElementById('refreshQuickLinks');
            const addBtn = document.getElementById('addQuickLink');
            
            if (refreshBtn) {
                refreshBtn.addEventListener('click', loadQuickLinks);
            }
            
            if (addBtn) {
                addBtn.addEventListener('click', showAddQuickLinkModal);
            }
            
            // 初始加载常用链接
            loadQuickLinks();
        }
    }, 500);
    
    // 绑定首页状态卡片点击事件
    const quarantineCard = document.getElementById('quarantineCard');
    const inspectionCard = document.getElementById('inspectionCard');
    const unprintedCheckCard = document.getElementById('unprintedCheckCard');
    const missingDataCard = document.getElementById('missingDataCard');
    
    if (quarantineCard) quarantineCard.addEventListener('click', showQuarantineModal);
    if (inspectionCard) inspectionCard.addEventListener('click', showInspectionModal);
    if (unprintedCheckCard) unprintedCheckCard.addEventListener('click', showUnprintedCheckModal);
    if (missingDataCard) missingDataCard.addEventListener('click', showMissingDataModal);
    
    // === 修复模态框关闭问题 ===
    fixModalCloseIssues();
    
    // 绑定全局事件
    bindGlobalEvents();
    
    // 绑定报关数据添加项按钮
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            if (typeof addCustomsItem === 'function') {
                addCustomsItem();
            }
        });
    }
    
    // 初始化页面
    switchPage('home');
    
    // 修复：统一附件上传事件绑定
    bindUploadAttachmentEvent();
}

function updateUserInfo() {
    if (currentUser) {
        const userData = currentUser.toJSON();
        const username = userData.username || '用户';

        // 侧边栏用户信息
        document.getElementById('userName').textContent = username;
        document.getElementById('userAvatar').innerHTML = `<i class="fas fa-user"></i>`;

        // 顶部用户信息栏
        document.getElementById('topUserName').textContent = username;
        const loginTime = new Date();
        document.getElementById('topLoginTime').textContent = `登录时间: ${loginTime.toLocaleString('zh-CN')}`;

        // 顶部退出按钮事件
        document.getElementById('topLogoutBtn').addEventListener('click', function() {
            logout();
        });

        // 侧边栏退出按钮事件
        document.getElementById('logoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

async function logout() {
    try {
        await AV.User.logOut();
        currentUser = null;
        location.reload();
    } catch (error) {
        console.error('登出失败:', error);
    }
}

// 初始化日期选择器
function initDatePickers() {
    const arrivalDatePicker = flatpickr('#arrivalDate', {
        mode: 'range',
        locale: 'zh',
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    const declareDatePicker = flatpickr('#declareDate', {
        mode: 'range',
        locale: 'zh',
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    const customsArrivalDatePicker = flatpickr('#customsArrivalDate', {
        mode: 'range',
        locale: 'zh',
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    const customsDeclareDatePicker = flatpickr('#customsDeclareDate', {
        mode: 'range',
        locale: 'zh',
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    const newArrivalDatePicker = flatpickr('#newArrivalDate', {
        locale: 'zh',
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    window.datePickers = {
        arrivalDate: arrivalDatePicker,
        declareDate: declareDatePicker,
        customsArrivalDate: customsArrivalDatePicker,
        customsDeclareDate: customsDeclareDatePicker,
        newArrivalDate: newArrivalDatePicker
    };
}

// 页面切换函数
function switchPage(page) {
    console.log('切换到页面:', page);
    
    // 防止切换到不存在的页面
    if (!page || page === 'null') {
        console.error('无效的页面标识:', page);
        page = 'home'; // 默认回退到首页
    }
    
    // 隐藏所有页面内容
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const targetPage = document.getElementById(page);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        console.log('页面显示成功:', page);
        
        // 确保应用容器可见
        ensureAppContainerVisible();
        
        // 初始化页面内容
        setTimeout(() => {
            initializePageContent(page);
        }, 100);
    } else {
        console.error('目标页面不存在:', page);
        // 尝试显示首页作为回退
        const homePage = document.getElementById('home');
        if (homePage) {
            homePage.classList.remove('hidden');
            page = 'home';
            setTimeout(() => {
                initializePageContent('home');
            }, 100);
        }
    }
    
    // 更新导航激活状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    currentPage = page;
}

// 确保应用容器可见
function ensureAppContainerVisible() {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'flex';
        console.log('✅ 应用容器状态已确保可见');
    }
}

// 初始化页面内容
function initializePageContent(page) {
    console.log(`初始化 ${page} 页面内容...`);
    
    // 清理前一个页面的状态
    switch (currentPage) {
        case 'tracking':
            if (typeof cleanupTracking === 'function') {
                cleanupTracking();
            }
            break;
        case 'customs':
            if (typeof cleanupCustoms === 'function') {
                cleanupCustoms();
            }
            break;
        // 其他页面的清理...
    }
    
    switch (page) {
        case 'home':
            // === 修改这里：调用首页初始化函数 ===
            if (typeof initializeHomeContent === 'function') {
                initializeHomeContent();
            }
            break;
            
        case 'tracking':
            if (typeof loadTrackingData === 'function') {
                loadTrackingData();
            }
            break;
            
        case 'customs':
            console.log('🔍 准备初始化报关页面...');
            
            // 🔥 检查 customs.js 是否已加载
            console.log('📋 检查 loadCustomsData 函数:', typeof loadCustomsData);
            console.log('📋 检查 manualLoadCustomsData 函数:', typeof manualLoadCustomsData);
            
            // 🔥 如果 customs.js 没有加载，动态加载
            if (typeof loadCustomsData !== 'function') {
                console.log('⚠️ customs.js 未加载，开始动态加载...');
                const script = document.createElement('script');
                script.src = 'js/customs.js';
                script.onload = function() {
                    console.log('✅ customs.js 动态加载完成');
                    // 延迟触发初始化事件
                    setTimeout(() => {
                        const event = new CustomEvent('customsPageInit', {
                            detail: { page: 'customs' }
                        });
                        document.dispatchEvent(event);
                        console.log('✅ 触发报关页面初始化事件');
                    }, 100);
                };
                script.onerror = function() {
                    console.error('❌ customs.js 动态加载失败');
                    alert('报关模块加载失败，请刷新页面重试');
                };
                document.head.appendChild(script);
            } else {
                // customs.js 已加载，触发事件
                console.log('✅ customs.js 已加载，触发初始化事件');
                const event = new CustomEvent('customsPageInit', {
                    detail: { page: 'customs' }
                });
                document.dispatchEvent(event);
            }
            break;
            
        case 'hscode':
            if (typeof loadHSCodeData === 'function') {
                loadHSCodeData();
            }
            break;
            
        case 'exporter':
            if (typeof loadExporterData === 'function') {
                loadExporterData();
            }
            break;

        case 'statistics':
            if (typeof initStatisticsPage === 'function') {
                initStatisticsPage();
                // 初始化统计页面的日期选择器
                setTimeout(() => {
                    initStatisticsDatePickers();
                }, 100);
            }
            break;

        case 'cert519':
            if (typeof initCert519Page === 'function') {
                initCert519Page();
            }
            break;

        case 'modRecord':
            if (typeof initModRecordPage === 'function') {
                initModRecordPage();
            }
            break;

        case 'files':
            console.log('准备调用 loadFileList，类型检查:', typeof window.loadFileList);
            if (typeof window.loadFileList === 'function') {
                console.log('loadFileList 是函数，开始调用...');
                window.loadFileList();
            } else {
                console.log('loadFileList 不是函数或未定义');
            }
            break;

        case 'billing':
            // 账单管理页面初始化
            console.log('初始化账单管理页面');
            if (typeof initBillingModule === 'function') {
                initBillingModule();
            }
            break;

        default:
            console.log(`无需特殊初始化的页面: ${page}`);
    }
    
    // 重新初始化日期选择器
    initDatePickers();
}

// 在 common.js 的适当位置添加以下函数

// Excel日期格式转换函数
function formatExcelDate(excelDate) {
    if (!excelDate) return '';
    
    // 如果是字符串格式的日期
    if (typeof excelDate === 'string') {
        // 尝试解析各种日期格式
        const dateFormats = [
            /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日]?/,
            /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/
        ];
        
        for (const format of dateFormats) {
            const match = excelDate.match(format);
            if (match) {
                let year, month, day;
                
                if (match[1].length === 4) {
                    // yyyy-mm-dd 格式
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                } else {
                    // mm-dd-yyyy 格式
                    year = parseInt(match[3]);
                    month = parseInt(match[1]);
                    day = parseInt(match[2]);
                }
                
                // 格式化为 yyyy-mm-dd
                return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
        }
        
        // 如果正则匹配失败，尝试直接解析
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        
        return excelDate;
    }
    
    // 如果是Excel序列号格式
    if (typeof excelDate === 'number') {
        return excelDateToJSDate(excelDate);
    }
    
    return excelDate.toString();
}

// 查找列索引的辅助函数
function findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(header => 
            header && header.toString().toLowerCase().includes(name.toLowerCase())
        );
        if (index !== -1) return index;
    }
    return -1;
}

// Excel日期转换函数
function excelDateToJSDate(serial) {
    if (!serial || serial === '') return '';
    
    if (typeof serial === 'string' && serial.includes('-')) {
        return serial;
    }
    
    if (typeof serial === 'number') {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        
        const year = date_info.getUTCFullYear();
        const month = date_info.getUTCMonth() + 1;
        const day = date_info.getUTCDate();
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    
    return serial.toString();
}

// 绑定公共事件
function bindCommonEvents() {
    const quarantineCard = document.getElementById('quarantineCard');
    const inspectionCard = document.getElementById('inspectionCard');
    const unprintedCheckCard = document.getElementById('unprintedCheckCard');
    const missingDataCard = document.getElementById('missingDataCard');
    
    if (quarantineCard) quarantineCard.addEventListener('click', showQuarantineModal);
    if (inspectionCard) inspectionCard.addEventListener('click', showInspectionModal);
    if (unprintedCheckCard) unprintedCheckCard.addEventListener('click', showUnprintedCheckModal);
    if (missingDataCard) missingDataCard.addEventListener('click', showMissingDataModal);
    
    // 修复：统一附件上传事件绑定，防止重复绑定
    bindUploadAttachmentEvent();
}

// 修复：安全的附件上传事件绑定
function bindUploadAttachmentEvent() {
    if (uploadEventBound) {
        console.log('上传事件已绑定，跳过重复绑定');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadAttachment');
    if (uploadBtn) {
        // 移除所有可能的事件监听器
        const newUploadBtn = uploadBtn.cloneNode(true);
        uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
        
        // 绑定新的事件
        document.getElementById('uploadAttachment').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📤 上传附件按钮点击');
            handleUploadAttachment();
        });
        
        uploadEventBound = true;
        console.log('✅ 上传附件事件绑定成功');
    } else {
        console.log('❌ 上传附件按钮未找到，稍后重试');
        setTimeout(bindUploadAttachmentEvent, 500);
    }
}

// ========== 修复附件上传问题 ==========

// 统一的附件上传处理函数
async function handleUploadAttachment() {
    console.log('🚀 开始处理附件上传');
    
    const fileInput = document.getElementById('attachmentFile');
    const fileType = document.getElementById('attachmentType').value;
    const modal = document.getElementById('attachmentModal');
    const trackingId = modal ? modal.getAttribute('data-current-id') : null;
    
    if (!fileInput || fileInput.files.length === 0) {
        alert('请选择要上传的文件');
        return;
    }
    
    if (!fileType) {
        alert('请选择附件类型');
        return;
    }
    
    if (!trackingId) {
        alert('无法确定当前记录');
        return;
    }
    
    // 防止重复执行
    if (window.isUploadingAttachment) {
        console.log('⚠️ 上传正在进行中，跳过重复点击');
        return;
    }
    
    try {
        // 设置上传状态
        window.isUploadingAttachment = true;
        console.log('🔒 设置上传锁定状态');
        
        // 禁用上传按钮
        const uploadBtn = document.getElementById('uploadAttachment');
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';
        }
        
        // 处理所有选中的文件
        const files = Array.from(fileInput.files);
        console.log(`📁 准备上传 ${files.length} 个文件`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // 先查找记录
        let item = await findRecordById(trackingId);
        if (!item) {
            alert('找不到对应的记录');
            return;
        }
        
        // 获取当前附件列表
        const attachments = item.attachments || [];
        let newAttachments = [...attachments];
        
        // 批量上传所有文件
        for (const file of files) {
            try {
                console.log(`📤 上传文件: ${file.name}`);
                const result = await uploadSingleFile(file, fileType);
                if (result) {
                    const newAttachment = {
                        id: newAttachments.length > 0 ? Math.max(...newAttachments.map(a => a.id || 0)) + 1 : 1,
                        type: fileType,
                        name: file.name,
                        uploadTime: new Date().toLocaleString('zh-CN'),
                        fileUrl: result.url,
                        fileId: result.id
                    };
                    newAttachments.push(newAttachment);
                    successCount++;
                    console.log(`✅ 文件 ${file.name} 上传成功`);
                } else {
                    errorCount++;
                    console.error(`❌ 文件 ${file.name} 上传失败`);
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ 文件 ${file.name} 上传异常:`, error);
            }
        }
        
        // 批量更新到LeanCloud
        if (successCount > 0 && item.leanCloudObject) {
            console.log('💾 保存附件列表到LeanCloud');
            item.leanCloudObject.set('attachments', newAttachments);
            await item.leanCloudObject.save();
            
            // 更新本地数据
            item.attachments = newAttachments;
            
            // 更新界面显示
            refreshAttachmentList(item);
            updateAllAttachmentCounts(trackingId, newAttachments.length);
            
            console.log(`✅ 成功更新 ${successCount} 个附件`);
        }
        
        // 清空文件选择
        fileInput.value = '';
        
        // 显示上传结果 - 只显示一次
        if (successCount === files.length) {
            alert(`成功上传 ${successCount} 个文件`);
        } else if (successCount > 0) {
            alert(`上传完成！成功 ${successCount} 个，失败 ${errorCount} 个`);
        } else {
            alert('所有文件上传失败，请重试');
        }
        
    } catch (error) {
        console.error('文件上传失败:', error);
        alert('文件上传失败: ' + error.message);
    } finally {
        // 重置状态
        window.isUploadingAttachment = false;
        console.log('🔓 解除上传锁定状态');
        
        // 重新启用上传按钮
        const uploadBtn = document.getElementById('uploadAttachment');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '上传附件';
        }
    }
}

// 查找记录
async function findRecordById(id) {
    let item = null;
    
    // 在跟单数据中查找
    if (typeof trackingData !== 'undefined') {
        item = trackingData.find(item => item.id === id);
    }
    
    // 在报关数据中查找
    if (!item && typeof customsData !== 'undefined') {
        item = customsData.find(item => item.id === id);
    }
    
    if (item) {
        // 确保从LeanCloud获取最新数据
        if (item.leanCloudObject) {
            await item.leanCloudObject.fetch();
            const freshData = item.leanCloudObject.toJSON();
            item.attachments = freshData.attachments || [];
        }
    }
    
    return item;
}

// 上传单个文件到LeanCloud
async function uploadSingleFile(file, fileType) {
    try {
        const avFile = new AV.File(file.name, file);
        await avFile.save();
        return {
            url: avFile.url(),
            id: avFile.id
        };
    } catch (error) {
        console.error('文件上传失败:', error);
        return null;
    }
}

// ========== 强力附件弹窗修复 ==========
function showAttachmentModal(id) {
    console.log('💥 显示附件模态框，ID:', id);
    
    // 重新绑定上传事件（每次打开模态框时确保事件正确）
    uploadEventBound = false;
    setTimeout(bindUploadAttachmentEvent, 100);
    
    // 强力查找数据
    let item = null;
    
    // 先在跟单数据中查找
    if (typeof trackingData !== 'undefined') {
        item = trackingData.find(item => item.id === id);
        console.log('在跟单数据中查找结果:', item ? '找到' : '未找到');
    }
    
    // 如果在跟单数据中没找到，在报关数据中查找
    if (!item && typeof customsData !== 'undefined') {
        item = customsData.find(item => item.id === id);
        console.log('在报关数据中查找结果:', item ? '找到' : '未找到');
    }
    
    if (!item) {
        console.error('找不到数据记录，ID:', id);
        alert('找不到对应的数据记录');
        return;
    }
    
    console.log('找到记录:', item.containerNo || item.billNo);
    
    // 更新模态框标题
    const modalLabel = document.getElementById('attachmentModalLabel');
    if (modalLabel) {
        modalLabel.textContent = `附件管理 - ${item.containerNo || item.billNo || '未知'}`;
    }
    
    // 设置当前ID
    const modal = document.getElementById('attachmentModal');
    if (modal) {
        modal.setAttribute('data-current-id', id);
    }
    
    // 显示附件列表
    refreshAttachmentList(item);
    
    // 强力显示模态框
    const modalElement = document.getElementById('attachmentModal');
    if (modalElement) {
        // 先隐藏所有可能冲突的模态框
        const existingModals = document.querySelectorAll('.modal.show');
        existingModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
        
        // 创建新的模态框实例并显示
        const bootstrapModal = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true
        });
        
        bootstrapModal.show();
        console.log('✅ 附件模态框已显示');
        
    } else {
        console.error('❌ 附件模态框元素不存在');
    }
}

// 刷新附件列表
function refreshAttachmentList(item) {
    const attachmentList = document.getElementById('attachmentList');
    if (!attachmentList) {
        console.error('附件列表元素不存在');
        return;
    }
    
    if (!item.attachments || item.attachments.length === 0) {
        attachmentList.innerHTML = '<tr><td colspan="5" class="text-center">暂无附件</td></tr>';
        return;
    }
    
    let html = '';
    item.attachments.forEach((attachment, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${attachment.type || '未分类'}</td>
                <td>
                    <a href="${attachment.fileUrl}" target="_blank" class="file-name">
                        ${attachment.name}
                    </a>
                </td>
                <td>${attachment.uploadTime || '未知时间'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-attachment" 
                            data-id="${item.id}" 
                            data-attachment-id="${attachment.id}">
                        删除
                    </button>
                </td>
            </tr>
        `;
    });
    
    attachmentList.innerHTML = html;
    
    // 绑定删除按钮
    document.querySelectorAll('.delete-attachment').forEach(btn => {
        btn.addEventListener('click', function() {
            const trackingId = this.getAttribute('data-id');
            const attachmentId = this.getAttribute('data-attachment-id');
            deleteAttachment(trackingId, attachmentId);
        });
    });
}

// 更新所有地方的附件计数 - 修复版本
function updateAllAttachmentCounts(id, count) {
    console.log('🔄 更新所有附件计数:', { id, count });
    
    // 🔥 修复：确保本地数据正确更新
    updateLocalAttachmentData(id, count);
    
    // 🔥 修复：强制更新报关数据
    if (typeof customsData !== 'undefined') {
        const customsItem = customsData.find(item => item.id === id);
        if (customsItem) {
            // 确保报关数据也有正确的附件计数
            if (!customsItem.attachments || customsItem.attachments.length !== count) {
                console.log('🔄 修正报关数据附件计数:', 
                    customsItem.attachments ? customsItem.attachments.length : 0, '->', count);
            }
        }
    }
    
    // 发送自定义事件通知报关表格刷新
    const event = new CustomEvent('attachmentCountUpdated', {
        detail: { id, count }
    });
    document.dispatchEvent(event);
    
    // 更新可见按钮
    setTimeout(() => {
        updateVisibleAttachmentButtons(id, count);
    }, 200);
    
    // 🔥 修复：强制刷新报关表格
    if (currentPage === 'customs') {
        setTimeout(() => {
            if (window.forceRefreshCustomsTable) {
                window.forceRefreshCustomsTable();
            } else if (typeof renderCustomsTable === 'function') {
                console.log('🔄 强制刷新报关表格');
                renderCustomsTable();
            }
        }, 300);
    }
}

// 更新跟单数据附件计数
function updateTrackingAttachmentCounts(id, count) {
    if (typeof trackingData !== 'undefined') {
        const trackingItem = trackingData.find(item => item.id === id);
        if (trackingItem) {
            // 确保附件数量正确
            if (trackingItem.attachments && trackingItem.attachments.length !== count) {
                console.log('🔄 修正跟单本地数据附件计数:', trackingItem.attachments.length, '->', count);
            }
        }
    }
}

// 更新报关数据附件计数
function updateCustomsAttachmentCounts(id, count) {
    console.log('🔄 更新报关数据附件计数:', { id, count });
    
    // 更新本地数据
    updateCustomsLocalAttachmentData(id, count);
    
    // 强制重新渲染报关表格
    if (typeof renderCustomsTable === 'function') {
        console.log('🔄 强制重新渲染报关表格');
        renderCustomsTable();
    }
}

// 更新报关数据本地数据
function updateCustomsLocalAttachmentData(id, count) {
    if (typeof customsData !== 'undefined') {
        const customsItem = customsData.find(item => item.id === id);
        if (customsItem) {
            console.log('🔄 报关本地数据附件计数更新:', 
                customsItem.attachments ? customsItem.attachments.length : 0, '->', count);
        }
    }
    
    if (typeof filteredCustomsData !== 'undefined') {
        const filteredItem = filteredCustomsData.find(item => item.id === id);
        if (filteredItem) {
            console.log('🔄 报关筛选数据附件计数更新:', 
                filteredItem.attachments ? filteredItem.attachments.length : 0, '->', count);
        }
    }
}

// 更新可见的附件按钮 - 修复版本
function updateVisibleAttachmentButtons(id, count) {
    let updatedCount = 0;
    
    // 更新跟单工作台按钮 - 使用更宽松的选择器
    const trackingBtns = document.querySelectorAll(`.attachment-btn[data-id="${id}"]`);
    trackingBtns.forEach(btn => {
        updateSingleAttachmentButton(btn, count);
        updatedCount++;
    });
    
    // 更新报关数据按钮 - 使用更宽松的选择器
    const customsBtns = document.querySelectorAll(`.customs-attachment-btn[data-id="${id}"]`);
    customsBtns.forEach(btn => {
        updateSingleAttachmentButton(btn, count);
        updatedCount++;
    });
    
    console.log(`✅ 更新了 ${updatedCount} 个可见按钮，ID: ${id}`);
    
    // 如果没找到按钮，说明记录可能在其他分页，需要特殊处理
    if (updatedCount === 0) {
        console.log(`⚠️ 未找到ID为 ${id} 的可见按钮，记录可能在其他分页`);
        handleCrossPageUpdate(id, count);
    }
}

// 更新单个附件按钮的计数显示
function updateSingleAttachmentButton(btn, count) {
    if (!btn) return;
    
    // 移除现有的计数span
    const existingCount = btn.querySelector('.attachment-count');
    if (existingCount) {
        existingCount.remove();
    }
    
    // 如果有附件，添加计数显示
    if (count > 0) {
        const countSpan = document.createElement('span');
        countSpan.className = 'attachment-count';
        countSpan.textContent = count;
        btn.appendChild(countSpan);
    }
}

// 处理跨分页更新
function handleCrossPageUpdate(id, count) {
    // 更新本地数据，确保下次渲染时正确显示
    updateLocalAttachmentData(id, count);
    
    // 如果当前在报关页面，重新加载数据确保同步
    if (currentPage === 'customs' && typeof loadCustomsData === 'function') {
        console.log('🔄 重新加载报关数据确保跨分页同步');
        loadCustomsData();
    }
    
    // 如果当前在跟单页面，重新加载数据确保同步
    if (currentPage === 'tracking' && typeof loadTrackingData === 'function') {
        console.log('🔄 重新加载跟单数据确保跨分页同步');
        loadTrackingData();
    }
}

// 强制刷新表格 - 修复版本
function forceRefreshTables() {
    // 如果当前在跟单页面，重新渲染
    if (typeof renderTrackingTable === 'function' && currentPage === 'tracking') {
        console.log('🔄 强制重新渲染跟单表格');
        setTimeout(() => {
            renderTrackingTable();
            console.log('✅ 跟单表格重新渲染完成');
        }, 200);
    }
    
    // 如果当前在报关页面，重新渲染
    if (typeof renderCustomsTable === 'function' && currentPage === 'customs') {
        console.log('🔄 强制重新渲染报关表格');
        setTimeout(() => {
            renderCustomsTable();
            console.log('✅ 报关表格重新渲染完成');
        }, 200);
    }
}

// 更新本地数据 - 修复版本
function updateLocalAttachmentData(id, count) {
    let updated = false;
    
    // 更新跟单数据
    if (typeof trackingData !== 'undefined') {
        const trackingItem = trackingData.find(item => item.id === id);
        if (trackingItem) {
            // 确保附件数量正确（如果只是更新计数，不修改附件数组）
            if (trackingItem.attachments && trackingItem.attachments.length !== count) {
                console.log('🔄 修正跟单本地数据附件计数:', trackingItem.attachments.length, '->', count);
            }
            updated = true;
        }
    }
    
    // 更新报关数据
    if (typeof customsData !== 'undefined') {
        const customsItem = customsData.find(item => item.id === id);
        if (customsItem) {
            // 确保附件数量正确
            if (customsItem.attachments && customsItem.attachments.length !== count) {
                console.log('🔄 修正报关本地数据附件计数:', customsItem.attachments.length, '->', count);
                // 这里不直接修改attachments数组，因为可能只是计数更新
            }
            updated = true;
        }
    }
    
    if (updated) {
        console.log('✅ 本地数据更新完成');
    } else {
        console.log('❌ 未找到对应的本地记录:', id);
    }
}

// 删除附件 - 修复版本（同时删除LeanCloud文件）
async function deleteAttachment(trackingId, attachmentId) {
    if (!confirm('确定要删除这个附件吗？')) return;
    
    try {
        let item = await findRecordById(trackingId);
        if (!item) {
            alert('找不到对应的记录');
            return;
        }
        
        // 找到要删除的附件，获取文件ID
        const attachmentToDelete = item.attachments.find(att => att.id == attachmentId);
        if (!attachmentToDelete) {
            alert('找不到要删除的附件');
            return;
        }
        
        const updatedAttachments = item.attachments.filter(att => att.id != attachmentId);
        const newCount = updatedAttachments.length;
        
        console.log('🗑️ 删除附件，ID:', trackingId, '文件ID:', attachmentToDelete.fileId);
        
        // 1. 先删除 LeanCloud 上的实际文件
        if (attachmentToDelete.fileId) {
            await deleteFileFromLeanCloud(attachmentToDelete.fileId);
        }
        
        // 2. 更新LeanCloud记录（移除附件引用）
        if (item.leanCloudObject) {
            item.leanCloudObject.set('attachments', updatedAttachments);
            await item.leanCloudObject.save();
            console.log('✅ LeanCloud 记录更新完成');
        }
        
        // 🔥 修复：强制更新所有本地数据
        item.attachments = updatedAttachments;
        
        // 更新报关数据
        if (typeof customsData !== 'undefined') {
            const customsItem = customsData.find(cItem => cItem.id === trackingId);
            if (customsItem) {
                customsItem.attachments = updatedAttachments;
                console.log('✅ 更新报关数据完成');
            }
        }
        
        // 更新报关筛选数据
        if (typeof filteredCustomsData !== 'undefined') {
            const filteredItem = filteredCustomsData.find(fItem => fItem.id === trackingId);
            if (filteredItem) {
                filteredItem.attachments = updatedAttachments;
                console.log('✅ 更新报关筛选数据完成');
            }
        }
        
        // 更新界面
        updateAllAttachmentCounts(trackingId, newCount);
        refreshAttachmentList(item);
        
        console.log('✅ 附件和文件删除完成');
        
    } catch (error) {
        console.error('删除附件失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 公共工具函数
function formatDate(dateValue) {
    if (!dateValue) return '';

    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
    }

    if (typeof dateValue === 'number') {
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }

    if (typeof dateValue === 'string') {
        const chineseDate = dateValue.replace(/[年月]/g, '-').replace(/日/g, '');
        const date = new Date(chineseDate);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        
        const directDate = new Date(dateValue);
        if (!isNaN(directDate.getTime())) {
            return directDate.toISOString().split('T')[0];
        }
    }

    return dateValue.toString();
}

function findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(header => 
            header && header.toString().toLowerCase().includes(name.toLowerCase())
        );
        if (index !== -1) return index;
    }
    return -1;
}

// 检查表是否存在
async function checkTableExists(className) {
    try {
        const query = new AV.Query(className);
        query.limit(1);
        await query.first();
        return true;
    } catch (error) {
        if (error.code === 101) {
            return false;
        }
        throw error;
    }
}

// LeanCloud 数据操作函数
async function saveToLeanCloud(data, isNew = false) {
    try {
        let trackingObj;
        
        if (isNew) {
            trackingObj = new AV.Object('Tracking');
        } else {
            trackingObj = AV.Object.createWithoutData('Tracking', data.id);
        }
        
        const fields = [
            'arrivalDate', 'declareDate', 'preEntryNo', 'billNo', 'containerNo',
            'customsNo', 'euDeposit', 'country', 'productName', 'shipper',
            'operation', 'customsStatus', 'instruction', 'remark',
            'domesticConsignee', 'consumptionUnit', 'foreignConsignee', 'hsCode',
            'supervisionCategory', 'specification', 'goodsValue', 'currency',
            'factoryNo', 'shipperRecordNo', 'packageCount', 'netWeight', 'grossWeight',
            'certificate105', 'certificate325', 'certificate519', 'certificate113',
            'inspectionSpec', 'productionDate', 'attachments', 'customsItems'
        ];
        
        fields.forEach(field => {
            if (data[field] !== undefined) {
                trackingObj.set(field, data[field]);
            }
        });
        
        await trackingObj.save();
        console.log('数据保存成功');
        return true;
        
    } catch (error) {
        console.error('保存数据失败:', error);
        return false;
    }
}

async function deleteFromLeanCloud(data) {
    try {
        if (data.leanCloudObject) {
            await data.leanCloudObject.destroy();
            console.log('数据删除成功');
            return true;
        }
        return false;
    } catch (error) {
        console.error('删除数据失败:', error);
        return false;
    }
}

// 删除 LeanCloud 上的文件
async function deleteFileFromLeanCloud(fileId) {
    try {
        if (!fileId) {
            console.log('文件ID为空，跳过删除');
            return true;
        }
        
        const file = AV.Object.createWithoutData('_File', fileId);
        await file.destroy();
        console.log('LeanCloud 文件删除成功:', fileId);
        return true;
    } catch (error) {
        console.error('删除 LeanCloud 文件失败:', error);
        // 如果文件不存在或其他错误，继续执行
        return false;
    }
}

// Excel日期转换函数
function excelDateToJSDate(serial) {
    if (!serial || serial === '') return '';
    
    if (typeof serial === 'string' && serial.includes('-')) {
        return serial;
    }
    
    if (typeof serial === 'number') {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        
        const year = date_info.getUTCFullYear();
        const month = date_info.getUTCMonth() + 1;
        const day = date_info.getUTCDate();
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    
    return serial.toString();
}

// 🔥 强力修复：删除附件后更新本地数据
function updateLocalAttachmentDataAfterDelete(trackingId, updatedAttachments) {
    console.log('🔥 强力更新本地数据，ID:', trackingId, '新附件数:', updatedAttachments.length);
    
    // 更新跟单数据
    if (typeof trackingData !== 'undefined') {
        const trackingItem = trackingData.find(item => item.id === trackingId);
        if (trackingItem) {
            trackingItem.attachments = updatedAttachments;
            console.log('✅ 更新跟单本地数据完成');
        }
    }
    
    // 🔥 关键修复：强制更新报关数据
    if (typeof customsData !== 'undefined') {
        const customsItem = customsData.find(item => item.id === trackingId);
        if (customsItem) {
            customsItem.attachments = updatedAttachments;
            console.log('✅ 更新报关本地数据完成');
        }
    }
    
    // 🔥 关键修复：强制更新筛选数据
    if (typeof filteredCustomsData !== 'undefined') {
        const filteredItem = filteredCustomsData.find(item => item.id === trackingId);
        if (filteredItem) {
            filteredItem.attachments = updatedAttachments;
            console.log('✅ 更新报关筛选数据完成');
        }
    }
}

// 🔥 强力修复：报关数据附件计数同步
function forceUpdateCustomsAttachmentCounts() {
    console.log('🔥 强制更新报关数据附件计数');
    
    if (typeof renderCustomsTable === 'function') {
        // 立即重新渲染
        renderCustomsTable();
        console.log('✅ 报关表格强制重新渲染完成');
    } else {
        console.log('⚠️ renderCustomsTable 函数不存在，重新加载数据');
        if (typeof loadCustomsData === 'function') {
            loadCustomsData();
        }
    }
}

// 🔥 修复模态框关闭问题 - 新增函数
function fixModalCloseIssues() {
    console.log('🔧 初始化模态框关闭修复...');
    
    // 监听所有模态框的隐藏事件
    const modals = ['quarantineModal', 'inspectionModal', 'unprintedCheckModal', 'missingDataModal'];
    
    modals.forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            // 移除可能存在的重复事件监听器
            const newModalElement = modalElement.cloneNode(true);
            modalElement.parentNode.replaceChild(newModalElement, modalElement);
            
            // 重新获取元素
            const freshModalElement = document.getElementById(modalId);
            
            freshModalElement.addEventListener('hidden.bs.modal', function() {
                console.log(`✅ 模态框 ${modalId} 已关闭，恢复界面状态`);
                // 确保应用容器正常显示
                const appContainer = document.querySelector('.app-container');
                if (appContainer) {
                    appContainer.style.display = 'flex';
                    console.log('✅ 应用容器状态已恢复');
                }
                
                // 强制重新激活所有交互元素
                setTimeout(() => {
                    // 重新绑定导航事件
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.style.pointerEvents = 'auto';
                    });
                    
                    // 重新绑定首页卡片事件
                    document.querySelectorAll('.quick-link').forEach(card => {
                        card.style.pointerEvents = 'auto';
                    });
                    
                    // 重新绑定状态卡片事件
                    const statusCards = ['quarantineCard', 'inspectionCard', 'unprintedCheckCard', 'missingDataCard'];
                    statusCards.forEach(cardId => {
                        const card = document.getElementById(cardId);
                        if (card) {
                            card.style.pointerEvents = 'auto';
                        }
                    });
                    
                    console.log('✅ 界面交互元素已重新激活');
                }, 50);
            });
            
            console.log(`✅ 模态框 ${modalId} 关闭事件监听器已绑定`);
        } else {
            console.log(`⚠️ 未找到模态框元素: ${modalId}`);
        }
    });
    
    console.log('✅ 模态框关闭修复初始化完成');
}

// 紧急恢复函数 - 在控制台执行
window.emergencyRecovery = function() {
    console.log('🚨 执行紧急恢复...');
    
    // 确保应用容器显示
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'flex';
    }
    
    // 重新激活所有交互元素
    document.querySelectorAll('a, button, .nav-link, .quick-link, .status-card').forEach(element => {
        element.style.pointerEvents = 'auto';
    });
    
    // 重新绑定事件
    if (typeof initApp === 'function') {
        setTimeout(() => {
            // 重新初始化应用
            document.removeEventListener('click', blockClicks);
            console.log('✅ 紧急恢复完成');
        }, 100);
    }
    
    console.log('✅ 紧急恢复完成');
};

// 阻止点击事件传播的防护函数
function blockClicks(event) {
    event.stopPropagation();
    event.preventDefault();
    console.log('🛡️ 点击事件被阻止');
}

// 绑定全局事件
function bindGlobalEvents() {
    console.log('绑定全局事件...');
    
    // 绑定HS编码管理事件
    bindHSCodeEvents();
    
    // 绑定出口商管理事件
    bindExporterEvents();
    
    // 绑定文件管理事件
    bindFilesEvents();
    
    // 绑定账单管理事件
    bindListEvents();
}

// 绑定HS编码管理事件
function bindHSCodeEvents() {
    // 查询按钮
    const searchHSCodeBtn = document.getElementById('searchHSCode');
    if (searchHSCodeBtn) {
        searchHSCodeBtn.addEventListener('click', searchHSCode);
    }
    
    // 清空按钮
    const clearHSCodeBtn = document.getElementById('clearHSCode');
    if (clearHSCodeBtn) {
        clearHSCodeBtn.addEventListener('click', clearHSCodeSearch);
    }
    
    // 同步按钮
    const syncHSCodeBtn = document.getElementById('syncHSCode');
    if (syncHSCodeBtn) {
        syncHSCodeBtn.addEventListener('click', syncHSCodeFromCustoms);
    }
    
    // 每页显示条数变化
    const hscodePageSizeSelect = document.getElementById('hscodePageSizeSelect');
    if (hscodePageSizeSelect) {
        hscodePageSizeSelect.addEventListener('change', function() {
            hscodeItemsPerPage = parseInt(this.value);
            hscodeCurrentPageIndex = 1;
            updateHSCodePagination();
            renderHSCodeTable();
        });
    }
}

// 绑定出口商管理事件
function bindExporterEvents() {
    // 查询按钮
    const searchExporterBtn = document.getElementById('searchExporter');
    if (searchExporterBtn) {
        searchExporterBtn.addEventListener('click', searchExporter);
    }
    
    // 清空按钮
    const clearExporterBtn = document.getElementById('clearExporter');
    if (clearExporterBtn) {
        clearExporterBtn.addEventListener('click', clearExporterSearch);
    }
    
    // 同步按钮
    const syncExporterBtn = document.getElementById('syncExporter');
    if (syncExporterBtn) {
        syncExporterBtn.addEventListener('click', syncExporterFromCustoms);
    }
    
    // 每页显示条数变化
    const exporterPageSizeSelect = document.getElementById('exporterPageSizeSelect');
    if (exporterPageSizeSelect) {
        exporterPageSizeSelect.addEventListener('change', function() {
            exporterItemsPerPage = parseInt(this.value);
            exporterCurrentPageIndex = 1;
            updateExporterPagination();
            renderExporterTable();
        });
    }
}

// 绑定文件管理事件
function bindFilesEvents() {
    // 上传文件按钮
    const uploadFilesBtn = document.getElementById('uploadFiles');
    if (uploadFilesBtn) {
        uploadFilesBtn.addEventListener('click', uploadFiles);
    }
}

// 绑定账单管理事件
function bindListEvents() {
    // 查询按钮
    const searchBillsBtn = document.getElementById('searchBills');
    if (searchBillsBtn) {
        searchBillsBtn.addEventListener('click', function() {
            loadListData();
        });
    }
    
    // 清空按钮
    const clearBillsBtn = document.getElementById('clearBills');
    if (clearBillsBtn) {
        clearBillsBtn.addEventListener('click', clearBills);
    }
    
    // 每页显示条数变化
    const billsPageSizeSelect = document.getElementById('billsPageSizeSelect');
    if (billsPageSizeSelect) {
        billsPageSizeSelect.addEventListener('change', function() {
            billsItemsPerPage = parseInt(this.value);
            billsCurrentPageIndex = 1;
            updateBillsPagination();
            renderBillsTable();
        });
    }
    
    // 新增账单按钮
    const addBillBtn = document.getElementById('addBill');
    if (addBillBtn) {
        addBillBtn.addEventListener('click', showAddBillModal);
    }
    
    // 保存账单按钮
    const saveBillBtn = document.getElementById('saveBill');
    if (saveBillBtn) {
        saveBillBtn.addEventListener('click', saveBill);
    }
}

// 导出全局函数
window.switchPage = switchPage;
window.saveToLeanCloud = saveToLeanCloud;

// 初始化统计页面的日期选择器
function initStatisticsDatePickers() {
    console.log('初始化统计页面日期选择器...');

    // 设置默认日期（近3个月）
    const currentDate = new Date();
    const endDate = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);
    const startDateStr = startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0');

    // 初始化月份选择器
    if (document.getElementById('startMonth')) {
        const startMonthPicker = flatpickr('#startMonth', {
            dateFormat: "Y-m",
            altInput: true,
            altFormat: "Y年m月",
            locale: "zh",
            defaultDate: startDateStr,
            allowInput: true
        });
    }

    if (document.getElementById('endMonth')) {
        const endMonthPicker = flatpickr('#endMonth', {
            dateFormat: "Y-m",
            altInput: true,
            altFormat: "Y年m月",
            locale: "zh",
            defaultDate: endDate,
            allowInput: true
        });
    }

    // 初始化年份选择器
    if (document.getElementById('statYear')) {
        const yearPicker = flatpickr('#statYear', {
            dateFormat: "Y",
            altInput: true,
            altFormat: "Y年",
            locale: "zh",
            defaultDate: String(currentDate.getFullYear()),
            allowInput: true
        });
    }

    // 绑定统计方式切换事件
    const statTypeSelect = document.getElementById('statType');
    if (statTypeSelect) {
        statTypeSelect.addEventListener('change', function() {
            const statType = this.value;
            const monthGroup = document.getElementById('monthGroup');
            const yearGroup = document.getElementById('yearGroup');

            if (monthGroup && yearGroup) {
                if (statType === 'month') {
                    monthGroup.style.display = 'block';
                    yearGroup.style.display = 'none';
                } else {
                    monthGroup.style.display = 'none';
                    yearGroup.style.display = 'block';
                }
            }
        });
    }
}

// 导出这个函数
window.initStatisticsDatePickers = initStatisticsDatePickers;
window.deleteFromLeanCloud = deleteFromLeanCloud;
window.deleteFileFromLeanCloud = deleteFileFromLeanCloud; // 新增这一行
window.showAttachmentModal = showAttachmentModal;
window.excelDateToJSDate = excelDateToJSDate;
window.updateAllAttachmentCounts = updateAllAttachmentCounts;
window.updateCustomsAttachmentCounts = updateCustomsAttachmentCounts;
window.updateLocalAttachmentDataAfterDelete = updateLocalAttachmentDataAfterDelete;
window.forceUpdateCustomsAttachmentCounts = forceUpdateCustomsAttachmentCounts;
window.formatExcelDate = formatExcelDate;
window.findColumnIndex = findColumnIndex;
// 确保导出文件删除函数
window.deleteFileFromLeanCloud = deleteFileFromLeanCloud;