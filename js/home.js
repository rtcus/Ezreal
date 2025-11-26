// 首页功能模块
let quarantineData = [];
let inspectionData = [];
let unprintedCheckData = [];
let missingData = [];

// 加载跟进状态数据
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

        // 加载检疫证未出数据
        const quarantineQuery = new AV.Query('Tracking');
        quarantineQuery.equalTo('customsStatus', '放行');
        const quarantineResults = await quarantineQuery.find();
        
        quarantineData = [];
        quarantineResults.forEach(item => {
            const data = item.toJSON();
            // 检查是否有检疫证附件
            const hasQuarantineCert = data.attachments && 
                data.attachments.some(att => att.type === '检疫证' && att.fileUrl);
            
            if (!hasQuarantineCert) {
                quarantineData.push({
                    customsNo: data.customsNo || '',
                    billNo: data.billNo || '',
                    containerNo: data.containerNo || '',
                    arrivalDate: data.arrivalDate || ''
                });
            }
        });
        
        // 加载查验未完成数据
        const inspectionQuery = new AV.Query('Tracking');
        inspectionQuery.containedIn('customsStatus', ['目的地查验', '口岸查验', '合并检查']);
        const inspectionResults = await inspectionQuery.find();
        
        inspectionData = [];
        inspectionResults.forEach(item => {
            const data = item.toJSON();
            inspectionData.push({
                customsNo: data.customsNo || '',
                billNo: data.billNo || '',
                containerNo: data.containerNo || '',
                instruction: data.instruction || '',
                arrivalDate: data.arrivalDate || ''
            });
        });

        // 加载未打印核对单数据
        const unprintedQuery = new AV.Query('Tracking');
        unprintedQuery.exists('preEntryNo');
        unprintedQuery.equalTo('operation', '');
        const unprintedResults = await unprintedQuery.find();
        
        unprintedCheckData = [];
        unprintedResults.forEach(item => {
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

        // 加载缺资料数据
        const missingQuery = new AV.Query('Tracking');
        missingQuery.contains('customsNo', '缺');
        const missingResults = await missingQuery.find();
        
        missingData = [];
        missingResults.forEach(item => {
            const data = item.toJSON();
            missingData.push({
                billNo: data.billNo || '',
                containerNo: data.containerNo || '',
                customsNo: data.customsNo || '',
                arrivalDate: data.arrivalDate || ''
            });
        });
        
        // 更新首页卡片显示 - 添加安全检查
        if (quarantineCountElement) quarantineCountElement.textContent = quarantineData.length;
        if (inspectionCountElement) inspectionCountElement.textContent = inspectionData.length;
        if (unprintedCheckCountElement) unprintedCheckCountElement.textContent = unprintedCheckData.length;
        if (missingDataCountElement) missingDataCountElement.textContent = missingData.length;
        
        console.log('跟进状态数据加载完成:', {
            检疫证未出: quarantineData.length,
            查验未完成: inspectionData.length,
            未打印核对单: unprintedCheckData.length,
            缺资料: missingData.length
        });
        
    } catch (error) {
        console.error('加载跟进状态数据失败:', error);
    }
}

// 显示检疫证未出模态框 - 修复版本
function showQuarantineModal() {
    const tbody = document.getElementById('quarantineList');
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
    
    // 添加关闭事件监听
    modalElement.addEventListener('hidden.bs.modal', function() {
        console.log('检疫证模态框关闭，恢复界面');
        ensureAppContainerVisible();
    });
    
    modal.show();
}

// 显示查验未完成模态框 - 修复版本
function showInspectionModal() {
    const tbody = document.getElementById('inspectionList');
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

// 显示未打印核对单模态框 - 修复版本
function showUnprintedCheckModal() {
    const tbody = document.getElementById('unprintedCheckList');
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

        // 绑定模态框中的操作选择事件 - 原有功能不变
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
                        
                        // 重新渲染表格 - 但不重新绑定关闭事件
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

// 刷新表格内容但不重新绑定事件
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

// 绑定关闭事件（只执行一次）
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

// 显示缺资料模态框 - 修复版本
function showMissingDataModal() {
    const tbody = document.getElementById('missingDataList');
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

// 确保应用容器可见 - 新增辅助函数
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