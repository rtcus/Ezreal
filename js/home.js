// 首页功能模块
let quarantineData = [];
let inspectionData = [];
let unprintedCheckData = [];
let missingData = [];

// 加载跟进状态数据（优化版：只加载数量，点击时才加载详情）
async function loadStatusData() {
    try {
        console.log('开始加载跟进状态数据...');
        
        // 检查元素是否存在
        const quarantineCountElement = document.getElementById('quarantineCount');
        const inspectionCountElement = document.getElementById('inspectionCount');
        const unprintedCheckCountElement = document.getElementById('unprintedCheckCount');
        const missingDataCountElement = document.getElementById('missingDataCount');
        
        if (!quarantineCountElement || !inspectionCountElement || !unprintedCheckCountElement || !missingDataCountElement) {
            console.warn('首页统计卡片元素尚未加载，跳过数据加载');
            return;
        }

        // 1. 检疫证未出 - 只获取数量
        console.log('开始统计检疫证未出数量...');
        const quarantineCountQuery = new AV.Query('Tracking');
        quarantineCountQuery.equalTo('customsStatus', '放行');
        const quarantineTotalCount = await quarantineCountQuery.count();
        console.log('放行记录总数:', quarantineTotalCount);
        
        let quarantineDataCount = 0;
        if (quarantineTotalCount > 0) {
            const batchSize = 1000;
            const batches = Math.ceil(quarantineTotalCount / batchSize);
            
            for (let i = 0; i < batches; i++) {
                const skip = i * batchSize;
                const query = new AV.Query('Tracking');
                query.equalTo('customsStatus', '放行');
                query.addDescending('createdAt');
                query.limit(batchSize);
                query.skip(skip);
                
                const results = await query.find();
                
                results.forEach(item => {
                    const data = item.toJSON();
                    const hasQuarantineCert = data.attachments && 
                        data.attachments.some(att => att.type === '检疫证' && att.fileUrl);
                    
                    if (!hasQuarantineCert) {
                        quarantineDataCount++;
                    }
                });
                
                console.log(`批次 ${i + 1}/${batches}: 处理 ${results.length} 条记录，当前累计 ${quarantineDataCount} 条`);
            }
        }
        
        // 2. 查验未完成 - 直接获取数量
        console.log('开始统计查验未完成数量...');
        const inspectionCountQuery = new AV.Query('Tracking');
        inspectionCountQuery.containedIn('customsStatus', ['目的地查验', '口岸查验', '合并检查']);
        const inspectionCount = await inspectionCountQuery.count();
        
        // 3. 未打印核对单 - 直接获取数量
        console.log('开始统计未打印核对单数量...');
        const unprintedCountQuery = new AV.Query('Tracking');
        unprintedCountQuery.exists('preEntryNo');
        unprintedCountQuery.equalTo('operation', '');
        const unprintedCount = await unprintedCountQuery.count();
        
        // 4. 缺资料 - 直接获取数量
        console.log('开始统计缺资料数量...');
        const missingCountQuery = new AV.Query('Tracking');
        missingCountQuery.contains('customsNo', '缺');
        const missingCount = await missingCountQuery.count();
        
        // 更新首页卡片显示
        if (quarantineCountElement) quarantineCountElement.textContent = quarantineDataCount;
        if (inspectionCountElement) inspectionCountElement.textContent = inspectionCount;
        if (unprintedCheckCountElement) unprintedCheckCountElement.textContent = unprintedCount;
        if (missingDataCountElement) missingDataCountElement.textContent = missingCount;
        
        console.log('跟进状态数据加载完成:', {
            检疫证未出: quarantineDataCount,
            查验未完成: inspectionCount,
            未打印核对单: unprintedCount,
            缺资料: missingCount
        });
        
        // 清空详细数据，等点击时再加载
        quarantineData = [];
        inspectionData = [];
        unprintedCheckData = [];
        missingData = [];
        
    } catch (error) {
        console.error('加载跟进状态数据失败:', error);
    }
}

// 点击时才加载检疫证未出详细数据
async function loadQuarantineDataDetail() {
    try {
        console.log('开始加载检疫证未出详细数据...');
        
        const quarantineQuery = new AV.Query('Tracking');
        quarantineQuery.equalTo('customsStatus', '放行');
        quarantineQuery.addDescending('createdAt');
        
        // 先获取总数
        const totalCount = await quarantineQuery.count();
        console.log('需要处理的放行记录总数:', totalCount);
        
        const batchSize = 1000;
        const batches = Math.ceil(totalCount / batchSize);
        quarantineData = [];
        
        // 分批次查询详细数据
        for (let i = 0; i < batches; i++) {
            const skip = i * batchSize;
            const query = new AV.Query('Tracking');
            query.equalTo('customsStatus', '放行');
            query.addDescending('createdAt');
            query.limit(batchSize);
            query.skip(skip);
            
            const batchResults = await query.find();
            
            batchResults.forEach(item => {
                const data = item.toJSON();
                const hasQuarantineCert = data.attachments && 
                    data.attachments.some(att => att.type === '检疫证' && att.fileUrl);
                
                if (!hasQuarantineCert) {
                    quarantineData.push({
                        customsNo: data.customsNo || '',
                        billNo: data.billNo || '',
                        containerNo: data.containerNo || '',
                        arrivalDate: data.arrivalDate || '',
                        objectId: data.objectId // 添加objectId便于调试
                    });
                }
            });
            
            console.log(`批次 ${i + 1}/${batches}: 处理 ${batchResults.length} 条记录，累计 ${quarantineData.length} 条无检疫证记录`);
        }
        
        console.log('检疫证未出详细数据加载完成，共', quarantineData.length, '条记录');
        
    } catch (error) {
        console.error('加载检疫证详细数据失败:', error);
    }
}

// 点击时才加载查验未完成详细数据
async function loadInspectionDataDetail() {
    try {
        console.log('开始加载查验未完成详细数据...');
        
        const inspectionQuery = new AV.Query('Tracking');
        inspectionQuery.containedIn('customsStatus', ['目的地查验', '口岸查验', '合并检查']);
        inspectionQuery.addDescending('createdAt');
        
        // 先获取总数
        const totalCount = await inspectionQuery.count();
        console.log('需要处理的查验记录总数:', totalCount);
        
        const batchSize = 1000;
        const batches = Math.ceil(totalCount / batchSize);
        inspectionData = [];
        
        // 分批次查询详细数据
        for (let i = 0; i < batches; i++) {
            const skip = i * batchSize;
            const query = new AV.Query('Tracking');
            query.containedIn('customsStatus', ['目的地查验', '口岸查验', '合并检查']);
            query.addDescending('createdAt');
            query.limit(batchSize);
            query.skip(skip);
            
            const batchResults = await query.find();
            
            batchResults.forEach(item => {
                const data = item.toJSON();
                inspectionData.push({
                    customsNo: data.customsNo || '',
                    billNo: data.billNo || '',
                    containerNo: data.containerNo || '',
                    instruction: data.instruction || '',
                    arrivalDate: data.arrivalDate || '',
                    objectId: data.objectId
                });
            });
            
            console.log(`批次 ${i + 1}/${batches}: 处理 ${batchResults.length} 条记录，累计 ${inspectionData.length} 条查验记录`);
        }
        
        console.log('查验未完成详细数据加载完成，共', inspectionData.length, '条记录');
        
    } catch (error) {
        console.error('加载查验详细数据失败:', error);
    }
}

// 点击时才加载未打印核对单详细数据
async function loadUnprintedCheckDataDetail() {
    try {
        console.log('开始加载未打印核对单详细数据...');
        
        const unprintedQuery = new AV.Query('Tracking');
        unprintedQuery.exists('preEntryNo');
        unprintedQuery.equalTo('operation', '');
        unprintedQuery.addDescending('createdAt');
        
        // 先获取总数
        const totalCount = await unprintedQuery.count();
        console.log('需要处理的未打印核对单记录总数:', totalCount);
        
        const batchSize = 1000;
        const batches = Math.ceil(totalCount / batchSize);
        unprintedCheckData = [];
        
        // 分批次查询详细数据
        for (let i = 0; i < batches; i++) {
            const skip = i * batchSize;
            const query = new AV.Query('Tracking');
            query.exists('preEntryNo');
            query.equalTo('operation', '');
            query.addDescending('createdAt');
            query.limit(batchSize);
            query.skip(skip);
            
            const batchResults = await query.find();
            
            batchResults.forEach(item => {
                const data = item.toJSON();
                unprintedCheckData.push({
                    id: data.objectId,
                    preEntryNo: data.preEntryNo || '',
                    billNo: data.billNo || '',
                    containerNo: data.containerNo || '',
                    operation: data.operation || '',
                    arrivalDate: data.arrivalDate || ''
                });
            });
            
            console.log(`批次 ${i + 1}/${batches}: 处理 ${batchResults.length} 条记录，累计 ${unprintedCheckData.length} 条未打印核对单记录`);
        }
        
        console.log('未打印核对单详细数据加载完成，共', unprintedCheckData.length, '条记录');
        
    } catch (error) {
        console.error('加载未打印核对单详细数据失败:', error);
    }
}

// 点击时才加载缺资料详细数据
async function loadMissingDataDetail() {
    try {
        console.log('开始加载缺资料详细数据...');
        
        const missingQuery = new AV.Query('Tracking');
        missingQuery.contains('customsNo', '缺');
        missingQuery.addDescending('createdAt');
        
        // 先获取总数
        const totalCount = await missingQuery.count();
        console.log('需要处理的缺资料记录总数:', totalCount);
        
        const batchSize = 1000;
        const batches = Math.ceil(totalCount / batchSize);
        missingData = [];
        
        // 分批次查询详细数据
        for (let i = 0; i < batches; i++) {
            const skip = i * batchSize;
            const query = new AV.Query('Tracking');
            query.contains('customsNo', '缺');
            query.addDescending('createdAt');
            query.limit(batchSize);
            query.skip(skip);
            
            const batchResults = await query.find();
            
            batchResults.forEach(item => {
                const data = item.toJSON();
                missingData.push({
                    billNo: data.billNo || '',
                    containerNo: data.containerNo || '',
                    customsNo: data.customsNo || '',
                    arrivalDate: data.arrivalDate || '',
                    objectId: data.objectId
                });
            });
            
            console.log(`批次 ${i + 1}/${batches}: 处理 ${batchResults.length} 条记录，累计 ${missingData.length} 条缺资料记录`);
        }
        
        console.log('缺资料详细数据加载完成，共', missingData.length, '条记录');
        
    } catch (error) {
        console.error('加载缺资料详细数据失败:', error);
    }
}

// 显示检疫证未出模态框 - 点击时加载数据
async function showQuarantineModal() {
    console.log('显示检疫证未出模态框...');
    
    // 确保应用容器正常显示
    ensureAppContainerVisible();
    
    // 显示加载提示
    const tbody = document.getElementById('quarantineList');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">正在加载数据...</td></tr>';
    }
    
    // 如果数据为空，先加载数据
    if (quarantineData.length === 0) {
        await loadQuarantineDataDetail();
    }
    
    if (!tbody) {
        console.error('检疫证未出模态框表格不存在');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (quarantineData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">暂无数据</td></tr>';
    } else {
        quarantineData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.customsNo}</td>
                <td>${item.billNo}</td>
                <td>${item.containerNo}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    const modalElement = document.getElementById('quarantineModal');
    if (!modalElement) {
        console.error('检疫证模态框元素不存在');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    
    // 绑定关闭事件
    modalElement.addEventListener('hidden.bs.modal', function() {
        console.log('检疫证模态框关闭，恢复界面');
        ensureAppContainerVisible();
    });
    
    modal.show();
}

// 显示查验未完成模态框 - 点击时加载数据
async function showInspectionModal() {
    console.log('显示查验未完成模态框...');
    
    // 确保应用容器正常显示
    ensureAppContainerVisible();
    
    // 显示加载提示
    const tbody = document.getElementById('inspectionList');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">正在加载数据...</td></tr>';
    }
    
    // 如果数据为空，先加载数据
    if (inspectionData.length === 0) {
        await loadInspectionDataDetail();
    }
    
    if (!tbody) {
        console.error('查验未完成模态框表格不存在');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (inspectionData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无数据</td></tr>';
    } else {
        inspectionData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.customsNo}</td>
                <td>${item.billNo}</td>
                <td>${item.containerNo}</td>
                <td>${item.instruction}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    const modalElement = document.getElementById('inspectionModal');
    if (!modalElement) {
        console.error('查验未完成模态框元素不存在');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        ensureAppContainerVisible();
    });
    
    modal.show();
}

// 显示未打印核对单模态框 - 点击时加载数据
async function showUnprintedCheckModal() {
    console.log('显示未打印核对单模态框...');
    
    // 确保应用容器正常显示
    ensureAppContainerVisible();
    
    // 显示加载提示
    const tbody = document.getElementById('unprintedCheckList');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">正在加载数据...</td></tr>';
    }
    
    // 如果数据为空，先加载数据
    if (unprintedCheckData.length === 0) {
        await loadUnprintedCheckDataDetail();
    }
    
    if (!tbody) {
        console.error('未打印核对单模态框表格不存在');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (unprintedCheckData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无数据</td></tr>';
    } else {
        unprintedCheckData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.preEntryNo}</td>
                <td>${item.billNo}</td>
                <td>${item.containerNo}</td>
                <td>
                    <select class="form-select operation-select modal-operation-select" data-id="${item.id}">
                        <option value="">请选择</option>
                        <option value="已核" ${item.operation === '已核' ? 'selected' : ''}>已核</option>
                        <option value="打单" ${item.operation === '打单' ? 'selected' : ''}>打单</option>
                        <option value="申报" ${item.operation === '申报' ? 'selected' : ''}>申报</option>
                        <option value="问申报" ${item.operation === '问申报' ? 'selected' : ''}>问申报</option>
                        <option value="有舱单" ${item.operation === '有舱单' ? 'selected' : ''}>有舱单</option>
                        <option value="等通知申报" ${item.operation === '等通知申报' ? 'selected' : ''}>等通知申报</option>
                        <option value="取消" ${item.operation === '取消' ? 'selected' : ''}>取消</option>
                        <option value="可以报" ${item.operation === '可以报' ? 'selected' : ''}>可以报</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定模态框中的操作选择事件
        document.querySelectorAll('.modal-operation-select').forEach(select => {
            select.addEventListener('change', async function() {
                const id = this.getAttribute('data-id');
                const value = this.value;
                
                if (value) {
                    try {
                        // 更新LeanCloud
                        const trackingObj = AV.Object.createWithoutData('Tracking', id);
                        trackingObj.set('operation', value);
                        await trackingObj.save();
                        
                        // 更新本地数据
                        const item = unprintedCheckData.find(item => item.id === id);
                        if (item) {
                            item.operation = value;
                        }
                        
                        // 从列表中移除已处理的项目
                        unprintedCheckData = unprintedCheckData.filter(item => item.id !== id);
                        
                        console.log('操作状态更新成功，重新渲染表格');
                        
                        // 重新渲染表格
                        refreshUnprintedCheckTable();
                        
                        // 更新首页卡片计数
                        await loadStatusData();
                        
                    } catch (error) {
                        console.error('更新操作状态失败:', error);
                        alert('操作状态更新失败: ' + error.message);
                    }
                }
            });
        });
    }
    
    // 显示模态框
    const modalElement = document.getElementById('unprintedCheckModal');
    if (!modalElement) {
        console.error('未打印核对单模态框元素不存在');
        return;
    }
    
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    
    // 绑定关闭事件
    modalElement.addEventListener('hidden.bs.modal', function() {
        console.log('未打印核对单模态框关闭，恢复界面');
        ensureAppContainerVisible();
    });
    
    modal.show();
}

// 刷新未打印核对单表格
function refreshUnprintedCheckTable() {
    const tbody = document.getElementById('unprintedCheckList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (unprintedCheckData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无数据</td></tr>';
    } else {
        unprintedCheckData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.preEntryNo}</td>
                <td>${item.billNo}</td>
                <td>${item.containerNo}</td>
                <td>
                    <select class="form-select operation-select modal-operation-select" data-id="${item.id}">
                        <option value="">请选择</option>
                        <option value="已核" ${item.operation === '已核' ? 'selected' : ''}>已核</option>
                        <option value="打单" ${item.operation === '打单' ? 'selected' : ''}>打单</option>
                        <option value="申报" ${item.operation === '申报' ? 'selected' : ''}>申报</option>
                        <option value="问申报" ${item.operation === '问申报' ? 'selected' : ''}>问申报</option>
                        <option value="有舱单" ${item.operation === '有舱单' ? 'selected' : ''}>有舱单</option>
                        <option value="等通知申报" ${item.operation === '等通知申报' ? 'selected' : ''}>等通知申报</option>
                        <option value="取消" ${item.operation === '取消' ? 'selected' : ''}>取消</option>
                        <option value="可以报" ${item.operation === '可以报' ? 'selected' : ''}>可以报</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 重新绑定操作选择事件
        document.querySelectorAll('.modal-operation-select').forEach(select => {
            select.addEventListener('change', async function() {
                const id = this.getAttribute('data-id');
                const value = this.value;
                
                if (value) {
                    try {
                        const trackingObj = AV.Object.createWithoutData('Tracking', id);
                        trackingObj.set('operation', value);
                        await trackingObj.save();
                        
                        const item = unprintedCheckData.find(item => item.id === id);
                        if (item) {
                            item.operation = value;
                        }
                        
                        unprintedCheckData = unprintedCheckData.filter(item => item.id !== id);
                        
                        console.log('操作状态更新成功，重新渲染表格');
                        refreshUnprintedCheckTable();
                        await loadStatusData();
                        
                    } catch (error) {
                        console.error('更新操作状态失败:', error);
                        alert('操作状态更新失败: ' + error.message);
                    }
                }
            });
        });
    }
}

// 显示缺资料模态框 - 点击时加载数据
async function showMissingDataModal() {
    console.log('显示缺资料模态框...');
    
    // 确保应用容器正常显示
    ensureAppContainerVisible();
    
    // 显示加载提示
    const tbody = document.getElementById('missingDataList');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">正在加载数据...</td></tr>';
    }
    
    // 如果数据为空，先加载数据
    if (missingData.length === 0) {
        await loadMissingDataDetail();
    }
    
    if (!tbody) {
        console.error('缺资料模态框表格不存在');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (missingData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无数据</td></tr>';
    } else {
        missingData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.arrivalDate || ''}</td>
                <td>${item.billNo}</td>
                <td>${item.containerNo}</td>
                <td>${item.customsNo}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    const modalElement = document.getElementById('missingDataModal');
    if (!modalElement) {
        console.error('缺资料模态框元素不存在');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        ensureAppContainerVisible();
    });
    
    modal.show();
}

// 重新激活界面元素
function reactivateInterfaceElements() {
    console.log('重新激活界面元素...');
    
    const clickableElements = [
        '.nav-link',
        '.quick-link', 
        '.status-card',
        'button',
        'a',
        '.form-select',
        '.form-control'
    ];
    
    clickableElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.style.pointerEvents = 'auto';
            element.style.opacity = '1';
        });
    });
    
    console.log('✅ 界面元素重新激活完成');
}

// 确保应用容器可见
function ensureAppContainerVisible() {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'flex';
        console.log('✅ 应用容器状态已确保可见');
    }
}

// 导出函数供其他模块使用
window.loadStatusData = loadStatusData;
window.showQuarantineModal = showQuarantineModal;
window.showInspectionModal = showInspectionModal;
window.showUnprintedCheckModal = showUnprintedCheckModal;
window.showMissingDataModal = showMissingDataModal;

// 在home.js文件末尾添加

// 常用链接管理
let quickLinks = [];
let linkCategories = [
    '系统工具', '报关平台', '物流查询', '办公协作', '其他'
];

// 可用图标列表
const availableIcons = [
    'fas fa-link', 'fas fa-globe', 'fas fa-file-alt', 'fas fa-chart-line',
    'fas fa-search', 'fas fa-ship', 'fas fa-plane', 'fas fa-truck',
    'fas fa-warehouse', 'fas fa-box', 'fas fa-passport', 'fas fa-file-contract',
    'fas fa-calculator', 'fas fa-calendar-alt', 'fas fa-envelope',
    'fas fa-users', 'fas fa-comments', 'fas fa-database', 'fas fa-cloud',
    'fas fa-lock', 'fas fa-unlock', 'fas fa-key', 'fas fa-cog',
    'fab fa-chrome', 'fab fa-firefox', 'fas fa-external-link-alt'
];

// 加载常用链接
async function loadQuickLinks() {
    try {
        const quickLinksContainer = document.getElementById('quickLinksContainer');
        const loadingElement = document.getElementById('quickLinksLoading');
        
        if (loadingElement) {
            loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x mb-3"></i><p>正在加载常用链接...</p>';
        }
        
        const query = new AV.Query('Link');
        query.addAscending('order');
        const results = await query.find();
        
        quickLinks = results.map(item => {
            const data = item.toJSON();
            return {
                id: data.objectId,
                title: data.title || '未命名链接',
                url: data.url || '',
                description: data.description || '',
                icon: data.icon || 'fas fa-link',
                category: data.category || '其他',
                order: data.order || '999',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                leanCloudObject: item
            };
        });
        
        renderQuickLinks();
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
    } catch (error) {
        console.error('加载常用链接失败:', error);
        const loadingElement = document.getElementById('quickLinksLoading');
        if (loadingElement) {
            loadingElement.innerHTML = '<div class="alert alert-danger">加载失败: ' + error.message + '</div>';
        }
    }
}

// 渲染常用链接
function renderQuickLinks() {
    const container = document.getElementById('quickLinksContainer');
    if (!container) return;
    
    if (quickLinks.length === 0) {
        container.innerHTML = `
            <div class="empty-quick-links">
                <i class="fas fa-link fa-3x mb-3"></i>
                <h5>暂无常用链接</h5>
                <p class="text-muted">点击右上角"添加链接"按钮创建第一个链接</p>
            </div>
        `;
        return;
    }
    
    // 按分类分组
    const linksByCategory = {};
    quickLinks.forEach(link => {
        if (!linksByCategory[link.category]) {
            linksByCategory[link.category] = [];
        }
        linksByCategory[link.category].push(link);
    });
    
    let html = '';
    
    // 渲染每个分类
    Object.keys(linksByCategory).forEach(category => {
        const categoryLinks = linksByCategory[category];
        
        html += `
            <div class="category-section" style="grid-column: 1 / -1; margin-bottom: 20px;">
                <h6 class="category-title" style="color: var(--primary-color); margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eaeaea;">
                    ${category}
                </h6>
                <div class="category-links" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
        `;
        
        categoryLinks.forEach(link => {
            html += `
                <div class="quick-link-card" data-id="${link.id}">
                    <div class="quick-link-card-header">
                        <div class="quick-link-icon">
                            <i class="${link.icon}"></i>
                        </div>
                        <div class="quick-link-actions">
                            <button class="quick-link-action-btn edit" data-id="${link.id}" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="quick-link-action-btn delete" data-id="${link.id}" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="quick-link-title">${link.title}</div>
                    <div class="quick-link-url" title="${link.url}">${truncateText(link.url, 40)}</div>
                    ${link.description ? `<div class="quick-link-description">${link.description}</div>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 绑定事件
    bindQuickLinkEvents();
}

// 绑定常用链接事件
function bindQuickLinkEvents() {
    // 链接卡片点击事件（新窗口打开）
    document.querySelectorAll('.quick-link-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // 如果点击的是操作按钮，不执行链接跳转
            if (e.target.closest('.quick-link-action-btn')) {
                return;
            }
            
            const linkId = this.getAttribute('data-id');
            const link = quickLinks.find(l => l.id === linkId);
            if (link && link.url) {
                window.open(link.url, '_blank');
            }
        });
    });
    
    // 编辑按钮
    document.querySelectorAll('.quick-link-action-btn.edit').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const linkId = this.getAttribute('data-id');
            showEditQuickLinkModal(linkId);
        });
    });
    
    // 删除按钮
    document.querySelectorAll('.quick-link-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const linkId = this.getAttribute('data-id');
            deleteQuickLink(linkId);
        });
    });
    
    // 刷新按钮
    const refreshBtn = document.getElementById('refreshQuickLinks');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadQuickLinks);
    }
    
    // 添加链接按钮
    const addBtn = document.getElementById('addQuickLink');
    if (addBtn) {
        addBtn.addEventListener('click', showAddQuickLinkModal);
    }
}

// 显示添加链接模态框
function showAddQuickLinkModal() {
    const modalHtml = `
        <div class="modal fade" id="quickLinkModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">添加常用链接</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="quickLinkForm">
                            <div class="mb-3">
                                <label class="form-label">链接标题 *</label>
                                <input type="text" class="form-control" id="linkTitle" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">链接地址 *</label>
                                <input type="url" class="form-control" id="linkUrl" placeholder="https://" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">链接描述</label>
                                <textarea class="form-control" id="linkDescription" rows="2"></textarea>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">分类</label>
                                    <select class="form-select" id="linkCategory">
                                        ${linkCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">排序值</label>
                                    <input type="text" class="form-control" id="linkOrder" placeholder="越小越靠前">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">选择图标</label>
                                <div class="d-flex align-items-center mb-2">
                                    <div class="icon-preview">
                                        <i id="selectedIconPreview" class="fas fa-link"></i>
                                    </div>
                                    <input type="text" class="form-control" id="linkIcon" value="fas fa-link" readonly>
                                </div>
                                <div class="icon-selector" id="iconSelector">
                                    ${availableIcons.map(icon => `
                                        <div class="icon-option ${icon === 'fas fa-link' ? 'selected' : ''}" data-icon="${icon}">
                                            <i class="${icon}"></i>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveQuickLink">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除现有模态框
    const existingModal = document.getElementById('quickLinkModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加新模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('quickLinkModal'));
    modal.show();
    
    // 初始化图标选择器
    initIconSelector();
    
    // 绑定保存事件
    document.getElementById('saveQuickLink').addEventListener('click', saveQuickLink);
    
    // 模态框关闭时清理
    document.getElementById('quickLinkModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// 显示编辑链接模态框
function showEditQuickLinkModal(linkId) {
    const link = quickLinks.find(l => l.id === linkId);
    if (!link) return;
    
    const modalHtml = `
        <div class="modal fade" id="quickLinkModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">编辑常用链接</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="quickLinkForm">
                            <input type="hidden" id="linkId" value="${link.id}">
                            <div class="mb-3">
                                <label class="form-label">链接标题 *</label>
                                <input type="text" class="form-control" id="linkTitle" value="${link.title}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">链接地址 *</label>
                                <input type="url" class="form-control" id="linkUrl" value="${link.url}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">链接描述</label>
                                <textarea class="form-control" id="linkDescription" rows="2">${link.description || ''}</textarea>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">分类</label>
                                    <select class="form-select" id="linkCategory">
                                        ${linkCategories.map(cat => `
                                            <option value="${cat}" ${cat === link.category ? 'selected' : ''}>${cat}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">排序值</label>
                                    <input type="text" class="form-control" id="linkOrder" value="${link.order}">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">选择图标</label>
                                <div class="d-flex align-items-center mb-2">
                                    <div class="icon-preview">
                                        <i id="selectedIconPreview" class="${link.icon}"></i>
                                    </div>
                                    <input type="text" class="form-control" id="linkIcon" value="${link.icon}" readonly>
                                </div>
                                <div class="icon-selector" id="iconSelector">
                                    ${availableIcons.map(icon => `
                                        <div class="icon-option ${icon === link.icon ? 'selected' : ''}" data-icon="${icon}">
                                            <i class="${icon}"></i>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveQuickLink">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除现有模态框
    const existingModal = document.getElementById('quickLinkModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加新模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('quickLinkModal'));
    modal.show();
    
    // 初始化图标选择器
    initIconSelector();
    
    // 绑定保存事件
    document.getElementById('saveQuickLink').addEventListener('click', saveQuickLink);
    
    // 模态框关闭时清理
    document.getElementById('quickLinkModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// 初始化图标选择器
function initIconSelector() {
    document.querySelectorAll('.icon-option').forEach(option => {
        option.addEventListener('click', function() {
            // 移除所有选中状态
            document.querySelectorAll('.icon-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // 添加当前选中状态
            this.classList.add('selected');
            
            // 更新图标预览和输入框
            const selectedIcon = this.getAttribute('data-icon');
            document.getElementById('selectedIconPreview').className = selectedIcon;
            document.getElementById('linkIcon').value = selectedIcon;
        });
    });
}

// 保存链接
async function saveQuickLink() {
    const linkId = document.getElementById('linkId')?.value;
    const title = document.getElementById('linkTitle').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    const description = document.getElementById('linkDescription').value.trim();
    const category = document.getElementById('linkCategory').value;
    const order = document.getElementById('linkOrder').value.trim() || '999';
    const icon = document.getElementById('linkIcon').value;
    
    if (!title) {
        alert('请输入链接标题');
        return;
    }
    
    if (!url) {
        alert('请输入链接地址');
        return;
    }
    
    try {
        let linkObj;
        
        if (linkId) {
            // 编辑现有链接
            linkObj = AV.Object.createWithoutData('Link', linkId);
        } else {
            // 创建新链接
            linkObj = new AV.Object('Link');
        }
        
        linkObj.set('title', title);
        linkObj.set('url', url);
        linkObj.set('description', description);
        linkObj.set('category', category);
        linkObj.set('order', order);
        linkObj.set('icon', icon);
        
        await linkObj.save();
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('quickLinkModal'));
        modal.hide();
        
        // 重新加载链接
        await loadQuickLinks();
        
    } catch (error) {
        console.error('保存链接失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 删除链接
async function deleteQuickLink(linkId) {
    if (!confirm('确定要删除这个链接吗？')) return;
    
    try {
        const link = quickLinks.find(l => l.id === linkId);
        if (!link) {
            alert('找不到要删除的链接');
            return;
        }
        
        if (link.leanCloudObject) {
            await link.leanCloudObject.destroy();
        }
        
        // 从本地数据中移除
        quickLinks = quickLinks.filter(l => l.id !== linkId);
        
        // 重新渲染
        renderQuickLinks();
        
        console.log('链接删除成功');
        
    } catch (error) {
        console.error('删除链接失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 工具函数：截断文本
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// 在 home.js 的初始化部分添加常用链接加载
// 找到 initApp 函数或类似初始化函数，添加以下代码：

// 在 loadStatusData 调用之后或页面初始化时添加：
window.addEventListener('load', function() {
    // 等待页面完全加载后加载常用链接
    setTimeout(() => {
        if (document.getElementById('quickLinksContainer')) {
            loadQuickLinks();
        }
    }, 1000);
});

// 导出函数
window.loadQuickLinks = loadQuickLinks;
window.showAddQuickLinkModal = showAddQuickLinkModal;
window.showEditQuickLinkModal = showEditQuickLinkModal;

// ============================================
// 页面初始化时的常用链接加载
// ============================================

// 监听页面切换，当切换到首页时加载常用链接
function initializeHomeContent() {
    console.log('初始化首页内容...');
    
    // 原有功能
    if (typeof loadStatusData === 'function') {
        loadStatusData();
    }
    
    // === 新增：加载常用链接 ===
    if (typeof loadQuickLinks === 'function') {
        console.log('开始加载常用链接...');
        loadQuickLinks();
    }
}

// 导出函数供 common.js 调用
window.initializeHomeContent = initializeHomeContent;