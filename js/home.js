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
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        console.log('检疫证模态框关闭，恢复界面');
        ensureAppContainerVisible();
    });
    
    modal.show();
}

// 显示查验未完成模态框 - 点击时加载数据
async function showInspectionModal() {
    console.log('显示查验未完成模态框...');
    
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
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        ensureAppContainerVisible();
    });
    
    modal.show();
}

// 显示未打印核对单模态框 - 点击时加载数据
async function showUnprintedCheckModal() {
    console.log('显示未打印核对单模态框...');
    
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
    
    // 只在第一次打开时绑定关闭事件
    if (!window.unprintedModalInitialized) {
        bindUnprintedModalCloseEvents();
        window.unprintedModalInitialized = true;
    }
    
    // 显示模态框
    const modalElement = document.getElementById('unprintedCheckModal');
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
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

// 绑定未打印核对单模态框关闭事件
function bindUnprintedModalCloseEvents() {
    const modalElement = document.getElementById('unprintedCheckModal');
    if (!modalElement) return;
    
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    
    // 绑定关闭按钮事件
    const closeButton = modalElement.querySelector('.btn-close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            console.log('关闭按钮点击，安全关闭模态框');
            modal.hide();
            ensureAppContainerVisible();
        });
    }
    
    // 绑定底部关闭按钮事件
    const footerCloseButton = modalElement.querySelector('.modal-footer .btn-secondary');
    if (footerCloseButton) {
        footerCloseButton.addEventListener('click', function() {
            console.log('底部关闭按钮点击，安全关闭模态框');
            modal.hide();
            ensureAppContainerVisible();
        });
    }
    
    // 绑定模态框隐藏事件
    modalElement.addEventListener('hidden.bs.modal', function() {
        console.log('未打印核对单模态框关闭，恢复界面');
        ensureAppContainerVisible();
    });
    
    console.log('✅ 未打印核对单模态框关闭事件绑定完成');
}

// 显示缺资料模态框 - 点击时加载数据
async function showMissingDataModal() {
    console.log('显示缺资料模态框...');
    
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
