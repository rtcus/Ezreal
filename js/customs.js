// ============================================
// 报关数据管理功能模块 - 修复完整版本
// 文件加载测试标记
console.log('✅✅✅ customs.js 文件已加载！✅✅✅');
console.log('📅 加载时间:', new Date().toLocaleString());
// ============================================
let customsData = [];
let filteredCustomsData = [];
let customsItemsPerPage = 20;
let customsCurrentPageIndex = 1;
let customsTotalPages = 1;
let currentCustomsItemId = null;

// 多项数据管理
let currentCustomsItems = []; // 存储当前编辑的多项数据
let itemIndexCounter = 1; // 项号计数器
let currentCustomsDataItem = null; // 存储原始报关数据

// 🔥 添加：防止重复加载的标志
let isCustomsLoading = false;

// 🔥 修复：在文件开头立即绑定事件监听器，确保在页面切换前就准备好
console.log('📢 报关模块正在初始化...');
document.addEventListener('customsPageInit', function(e) {
    console.log('📢 ✅ 收到报关页面初始化事件！');
    console.log('📋 准备调用 loadCustomsData...');
    console.log('📋 事件详情:', e.detail);
    console.log('📋 当前加载状态:', isCustomsLoading ? '正在加载' : '未加载');
    
    // 防止重复加载
    if (isCustomsLoading) {
        console.log('⚠️ 报关数据正在加载中，跳过重复请求');
        return;
    }
    
    // 延迟执行，确保DOM完全渲染
    setTimeout(() => {
        if (typeof loadCustomsData === 'function') {
            console.log('✅ 调用 loadCustomsData...');
            loadCustomsData();
        } else {
            console.error('❌ loadCustomsData 函数仍然不存在');
        }
    }, 300);
});
console.log('📢 报关模块事件监听器已绑定');

// 🔥 添加：初始化检查函数
function checkCustomsPageReady() {
    console.log('🔍 检查报关页面是否准备就绪...');
    const table = document.getElementById('customsTable');
    if (table) {
        console.log('✅ 报关表格存在');
        return true;
    } else {
        console.error('❌ 报关表格不存在');
        console.log('📋 当前页面可见性:', document.getElementById('customs').style.display);
        return false;
    }
}

// 🔥 修改：从LeanCloud动态查询519证书对应厂号
async function getFactoryNoByCertificate519(certificate519) {
    try {
        console.log('🔍 查询519证书:', certificate519);
        
        // 查询LeanCloud中的ciferquery519表
        const query = new AV.Query('ciferquery519');
        query.equalTo('certificate519', certificate519);
        query.limit(1); // 只需要第一个匹配的结果
        
        const result = await query.first();
        
        if (result) {
            const factoryNo = result.get('factoryNo');
            console.log('✅ 找到厂号:', factoryNo, '对于证书:', certificate519);
            return factoryNo;
        } else {
            console.log('⚠️ 未找到519证书对应的厂号:', certificate519);
            return null;
        }
    } catch (error) {
        console.error('❌ 查询519证书厂号失败:', error);
        return null;
    }
}

// 判断是否应该执行证书匹配功能 - 简化版本
function shouldExecuteCertificateMatch() {
    // 🔥 简化：始终允许519证书自动填充功能
    // 这样可以确保功能正常工作，不受日期限制影响
    console.log('🔍 检查证书匹配条件 - 当前设置为始终允许');
    return true;
    
    /* 保留原始逻辑供后续参考
    // 从当前编辑的报关数据中获取申报日期
    if (currentCustomsDataItem && currentCustomsDataItem.declareDate) {
        const declareDate = currentCustomsDataItem.declareDate;
        try {
            // 解析日期格式，假设为 YYYY-MM-DD 格式
            const dateParts = declareDate.split('-');
            if (dateParts.length === 3) {
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]);
                const day = parseInt(dateParts[2]);
                
                // 检查是否是2025年12月27日及以后
                if (year === 2025) {
                    if (month > 12 || (month === 12 && day >= 27)) {
                        return true;
                    }
                } else if (year > 2025) {
                    return true;
                }
            }
        } catch (error) {
            console.warn('日期解析错误:', error);
        }
    }
    return false;
    */
}

// 加载报关数据 - 修复附件数据版本
async function loadCustomsData() {
    try {
        // 🔥 设置加载标志
        if (isCustomsLoading) {
            console.log('⚠️ 报关数据已在加载中，跳过本次请求');
            return;
        }
        isCustomsLoading = true;
        console.log('🚀 开始加载报关数据...');
        console.log('📋 当前时间:', new Date().toLocaleString());
        
        // 🔥 添加页面就绪检查
        if (!checkCustomsPageReady()) {
            console.error('❌ 报关页面未就绪，延迟1秒后重试...');
            setTimeout(() => {
                console.log('🔄 重新尝试加载报关数据...');
                loadCustomsData();
            }, 1000);
            return;
        }
        
        const table = document.getElementById('customsTable');
        if (!table) {
            console.error('❌ 报关表格不存在');
            return;
        }
        console.log('✅ 找到报关表格');
        
        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.error('❌ 表格tbody不存在');
            return;
        }
        console.log('✅ 找到表格tbody');
        
        tbody.innerHTML = '<tr><td colspan="33" class="loading">正在加载数据...</td></tr>';
        
        // 🔥 修复：只查询 operation 为 "申报" 的数据
        console.log('🔍 开始构建查询条件...');
        const query = new AV.Query('Tracking');
        query.equalTo('operation', '申报');
        query.limit(1000); // 确保获取所有数据
        console.log('✅ 查询条件: operation="申报", limit=1000');
        
        // 🔥 修复：确保获取附件数据
        query.include('attachments');
        console.log('✅ 添加 include(attachments)');
        
        console.log('📡 正在从LeanCloud查询数据...');
        const results = await query.find();
        console.log('✅ 查询完成，共获取', results.length, '条数据');
        
        customsData = results.map(item => {
            const data = item.toJSON();
            console.log('📦 加载数据:', data.containerNo, '附件数:', data.attachments ? data.attachments.length : 0);
            
            // 处理多项数据
            let displayGoodsValue = data.goodsValue || '';
            let displayHsCode = data.hsCode || '';
            let displaySupervisionCategory = data.supervisionCategory || '';
            let displaySpecification = data.specification || '';
            let displayCurrency = data.currency || '';
            let displayFactoryNo = data.factoryNo || '';
            let displayCertificate105 = data.certificate105 || '';
            let displayCertificate325 = data.certificate325 || '';
            let displayCertificate519 = data.certificate519 || '';
            let displayCertificate113 = data.certificate113 || '';
            let displayInspectionSpec = data.inspectionSpec || '';
            let displayProductionDate = data.productionDate || '';
            
            // 如果有多项数据，计算总货值并使用第一项的其他字段
            if (data.customsItems && Array.isArray(data.customsItems) && data.customsItems.length > 0) {
                // 🔥 修复：使用 toFixed 解决浮点数精度问题
                const totalGoodsValue = data.customsItems.reduce((sum, item) => {
                    const value = parseFloat(item.goodsValue) || 0;
                    return sum + value;
                }, 0);
                // 保留2位小数，解决浮点数精度问题
                displayGoodsValue = parseFloat(totalGoodsValue.toFixed(2)).toString();
                
                // 使用第一项的其他字段用于列表显示
                const firstItem = data.customsItems[0];
                displayHsCode = firstItem.hsCode || '';
                displaySupervisionCategory = firstItem.supervisionCategory || '';
                displaySpecification = firstItem.specification || '';
                displayCurrency = firstItem.currency || '';
                displayFactoryNo = firstItem.factoryNo || '';
                displayCertificate105 = firstItem.certificate105 || '';
                displayCertificate325 = firstItem.certificate325 || '';
                displayCertificate519 = firstItem.certificate519 || '';
                displayCertificate113 = firstItem.certificate113 || '';
                displayInspectionSpec = firstItem.inspectionSpec || '';
                displayProductionDate = firstItem.productionDate || '';
            }
            
            return {
                id: data.objectId,
                arrivalDate: data.arrivalDate || '',
                declareDate: data.declareDate || '',
                preEntryNo: data.preEntryNo || '',
                billNo: data.billNo || '',
                containerNo: data.containerNo || '',
                customsNo: data.customsNo || '',
                euDeposit: data.euDeposit || '',
                country: data.country || '',
                productName: data.productName || '',
                shipper: data.shipper || '',
                operation: data.operation || '',
                customsStatus: data.customsStatus || '',
                instruction: data.instruction || '',
                remark: data.remark || '',
                domesticConsignee: data.domesticConsignee || '',
                consumptionUnit: data.consumptionUnit || '',
                foreignConsignee: data.foreignConsignee || '',
                hsCode: displayHsCode,
                supervisionCategory: displaySupervisionCategory,
                specification: displaySpecification,
                goodsValue: displayGoodsValue,
                currency: displayCurrency,
                factoryNo: displayFactoryNo,
                shipperRecordNo: data.shipperRecordNo || '',
                packageCount: data.packageCount || '',
                netWeight: data.netWeight || '',
                grossWeight: data.grossWeight || '',
                certificate105: displayCertificate105,
                certificate325: displayCertificate325,
                certificate519: displayCertificate519,
                certificate113: displayCertificate113,
                inspectionSpec: displayInspectionSpec,
                productionDate: displayProductionDate,
                customsItems: data.customsItems || [],
                // 🔥 修复：确保附件数据正确加载
                attachments: data.attachments || [],
                leanCloudObject: item
            };
        });
        
        // 按到港日期升序排序
        customsData.sort((a, b) => {
            const dateA = a.arrivalDate ? new Date(a.arrivalDate) : new Date(0);
            const dateB = b.arrivalDate ? new Date(b.arrivalDate) : new Date(0);
            return dateA - dateB;
        });
        
        filteredCustomsData = [...customsData];
        
        console.log('✅ 报关数据加载完成，共', customsData.length, '条记录');
        console.log('✅ 筛选数据量:', filteredCustomsData.length, '条记录');
        console.log('📊 当前分页设置: 每页', customsItemsPerPage, '条，共', customsTotalPages, '页');
        
        renderCustomsTable();
        updateCustomsPagination();
        bindCustomsEvents();
        
        console.log('✅ 报关页面初始化完成');
        
        // 🔥 重置加载标志
        isCustomsLoading = false;
        
    } catch (error) {
        console.error('❌ 加载报关数据失败:', error);
        console.error('❌ 错误堆栈:', error.stack);
        const tbody = document.querySelector('#customsTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="33" class="no-data">数据加载失败: ' + error.message + '<br>请刷新页面重试</td></tr>';
        }
        
        // 🔥 重置加载标志
        isCustomsLoading = false;
    }
}

// 应用报关数据筛选条件
function applyCustomsFilters() {
    const arrivalDate = document.getElementById('customsArrivalDate').value;
    const billNo = document.getElementById('customsBillNo').value.trim();
    const containerNo = document.getElementById('customsContainerNo').value.trim();
    const declareDate = document.getElementById('customsDeclareDate').value;
    const customsNoFilter = document.getElementById('customsNoFilter').value.trim();
    
    filteredCustomsData = customsData.filter(item => {
        let match = true;
        
        if (billNo && billNo !== '') {
            if (!item.billNo || !item.billNo.includes(billNo)) {
                match = false;
            }
        }
        
        if (containerNo && containerNo !== '') {
            if (!item.containerNo || !item.containerNo.includes(containerNo)) {
                match = false;
            }
        }
        
        if (customsNoFilter && customsNoFilter !== '') {
            if (!item.customsNo || !item.customsNo.includes(customsNoFilter)) {
                match = false;
            }
        }
        
        if (arrivalDate && arrivalDate.trim() !== '') {
            if (!item.arrivalDate || item.arrivalDate.trim() === '') {
                match = false;
            } else {
                let startDate, endDate;
                
                let separator = ' to ';
                if (arrivalDate.includes('至')) {
                    separator = '至';
                } else if (arrivalDate.includes(' - ')) {
                    separator = ' - ';
                }
                
                const dates = arrivalDate.split(separator).map(date => date.trim());
                
                if (dates.length === 2) {
                    startDate = new Date(dates[0]);
                    endDate = new Date(dates[1]);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    startDate = new Date(arrivalDate);
                    endDate = new Date(arrivalDate);
                    endDate.setHours(23, 59, 59, 999);
                }
                
                const itemDate = new Date(item.arrivalDate);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(itemDate.getTime())) {
                    match = false;
                } else {
                    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    
                    if (itemDateOnly < startDateOnly || itemDateOnly > endDateOnly) {
                        match = false;
                    }
                }
            }
        }
        
        if (declareDate && declareDate.trim() !== '') {
            if (!item.declareDate || item.declareDate.trim() === '') {
                match = false;
            } else {
                let startDate, endDate;
                
                let separator = ' to ';
                if (declareDate.includes('至')) {
                    separator = '至';
                } else if (declareDate.includes(' - ')) {
                    separator = ' - ';
                }
                
                const dates = declareDate.split(separator).map(date => date.trim());
                
                if (dates.length === 2) {
                    startDate = new Date(dates[0]);
                    endDate = new Date(dates[1]);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    startDate = new Date(declareDate);
                    endDate = new Date(declareDate);
                    endDate.setHours(23, 59, 59, 999);
                }
                
                const itemDate = new Date(item.declareDate);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(itemDate.getTime())) {
                    match = false;
                } else {
                    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    
                    if (itemDateOnly < startDateOnly || itemDateOnly > endDateOnly) {
                        match = false;
                    }
                }
            }
        }
        
        return match;
    });
    
    console.log('筛选后数据量:', filteredCustomsData.length);
}

// 渲染报关数据表格 - 修复附件计数显示
function renderCustomsTable() {
    console.log('🎨 开始渲染报关数据表格...');
    
    const tbody = document.querySelector('#customsTable tbody');
    if (!tbody) {
        console.error('❌ 找不到表格tbody');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (filteredCustomsData.length === 0) {
        console.log('⚠️ 没有数据需要渲染');
        tbody.innerHTML = '<tr><td colspan="33" class="no-data">没有找到匹配的数据</td></tr>';
        return;
    }
    
    const startIndex = (customsCurrentPageIndex - 1) * customsItemsPerPage;
    const endIndex = Math.min(startIndex + customsItemsPerPage, filteredCustomsData.length);
    const currentPageData = filteredCustomsData.slice(startIndex, endIndex);
    
    console.log('📊 渲染数据: 第', customsCurrentPageIndex, '页, 显示', currentPageData.length, '条数据');
    console.log('📊 数据索引范围:', startIndex, '到', endIndex);
    
    currentPageData.forEach((item, index) => {
        console.log('📝 渲染行', index + 1, ':', item.containerNo, item.preEntryNo);
    const row = document.createElement('tr');
    const globalIndex = startIndex + index;
    
    let rowClass = '';
    // 修改：删单状态和放行状态使用相同的样式
    if ((item.customsStatus !== '放行' && item.customsStatus !== '删单' && item.customsStatus) || 
        (item.customsStatus === '无电子信息')) {
        // 非放行、非删单状态有特殊样式
        if (item.customsStatus === '无电子信息') {
            rowClass = 'no-electronic-info';
        } else {
            rowClass = 'non-release-status';
        }
    }
        
        const preEntryNoCell = item.preEntryNo && item.preEntryNo.trim() !== '' ? 
            `<td class="pre-entry-clickable" data-id="${item.id}">${item.preEntryNo}</td>` :
            `<td>${item.preEntryNo}</td>`;
        
        // 🔥 关键修复：确保附件计数正确显示
        const attachmentCount = item.attachments ? item.attachments.length : 0;
        const attachmentCountHtml = attachmentCount > 0 ? 
            `<span class="attachment-count">${attachmentCount}</span>` : '';
        
        row.innerHTML = `
            <td>${globalIndex + 1}</td>
            <td>${item.arrivalDate}</td>
            <td>${item.declareDate}</td>
            ${preEntryNoCell}
            <td>
                <select class="form-select form-select-sm customs-status-select" data-id="${item.id}">
                    <option value="">请选择</option>
                    <option value="放行" ${item.customsStatus === '放行' ? 'selected' : ''}>放行</option>
                    <option value="目的地查验" ${item.customsStatus === '目的地查验' ? 'selected' : ''}>目的地查验</option>
                    <option value="审结" ${item.customsStatus === '审结' ? 'selected' : ''}>审结</option>
                    <option value="口岸查验" ${item.customsStatus === '口岸查验' ? 'selected' : ''}>口岸查验</option>
                    <option value="无电子信息" ${item.customsStatus === '无电子信息' ? 'selected' : ''}>无电子信息</option>
                    <option value="合并检查" ${item.customsStatus === '合并检查' ? 'selected' : ''}>合并检查</option>
                    <option value="挂起" ${item.customsStatus === '挂起' ? 'selected' : ''}>挂起</option>
                    <!-- 新增删单选项 -->
                    <option value="删单" ${item.customsStatus === '删单' ? 'selected' : ''}>删单</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm customs-instruction-select" data-id="${item.id}">
                    <option value="">请选择</option>
                    <option value="一般查验" ${item.instruction === '一般查验' ? 'selected' : ''}>一般查验</option>
                    <option value="国抽" ${item.instruction === '国抽' ? 'selected' : ''}>国抽</option>
                    <option value="直通" ${item.instruction === '直通' ? 'selected' : ''}>直通</option>
                </select>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary customs-attachment-btn" 
                        data-id="${item.id}" 
                        style="cursor: pointer; position: relative; z-index: 10;">
                    附件
                    ${attachmentCountHtml}
                </button>
            </td>
            <td>${item.billNo}</td>
            <td>${item.containerNo}</td>
            <td>${item.customsNo}</td>
            <td>${item.euDeposit}</td>
            <td>${item.country}</td>
            <td>${item.productName}</td>
            <td>${item.domesticConsignee || ''}</td>
            <td>${item.consumptionUnit || ''}</td>
            <td>${item.foreignConsignee || ''}</td>
            <td>${item.hsCode || ''}</td>
            <td>${item.supervisionCategory || ''}</td>
            <td>${item.specification || ''}</td>
            <td>${item.goodsValue || ''}</td>
            <td>${item.currency || ''}</td>
            <td>${item.factoryNo || ''}</td>
            <td>${item.shipperRecordNo || ''}</td>
            <td>${item.packageCount || ''}</td>
            <td>${item.netWeight || ''}</td>
            <td>${item.grossWeight || ''}</td>
            <td>${item.certificate105 || ''}</td>
            <td>${item.certificate325 || ''}</td>
            <td>${item.certificate519 || ''}</td>
            <td>${item.certificate113 || ''}</td>
            <td>${item.inspectionSpec || ''}</td>
            <td>${item.productionDate || ''}</td>
            <td>${item.remark}</td>
        `;
        
        if (rowClass) {
            row.className = rowClass;
        }
        
        tbody.appendChild(row);
    });
    
    bindCustomsSelectEvents();
    bindCustomsAttachmentEvents(); // 确保调用
    bindPreEntryClickEvents();
    updateCustomsPaginationInfo();
    
    console.log('✅ 报关表格渲染完成，共', currentPageData.length, '条记录');
}

// 绑定报关数据下拉选择事件
function bindCustomsSelectEvents() {
    document.querySelectorAll('.customs-status-select').forEach(select => {
        select.addEventListener('change', async function() {
            const id = this.getAttribute('data-id');
            const value = this.value;
            
            const item = customsData.find(item => item.id === id);
            if (item) {
                item.customsStatus = value;
                
                const filteredItem = filteredCustomsData.find(item => item.id === id);
                if (filteredItem) {
                    filteredItem.customsStatus = value;
                }
                
                await saveToLeanCloud(item, false);
                renderCustomsTable();
            }
        });
    });

    document.querySelectorAll('.customs-instruction-select').forEach(select => {
        select.addEventListener('change', async function() {
            const id = this.getAttribute('data-id');
            const value = this.value;
            
            const item = customsData.find(item => item.id === id);
            if (item) {
                item.instruction = value;
                
                const filteredItem = filteredCustomsData.find(item => item.id === id);
                if (filteredItem) {
                    filteredItem.instruction = value;
                }
                
                await saveToLeanCloud(item, false);
            }
        });
    });
}

// 强力修复报关数据附件按钮事件绑定
function bindCustomsAttachmentEvents() {
    console.log('🔧 开始绑定报关数据附件事件...');
    
    // 使用事件委托，避免动态渲染问题
    const customsTable = document.getElementById('customsTable');
    if (!customsTable) {
        console.error('报关表格不存在');
        return;
    }
    
    // 移除旧的事件监听器
    customsTable.removeEventListener('click', handleCustomsAttachmentClick);
    
    // 添加新的事件监听器
    customsTable.addEventListener('click', handleCustomsAttachmentClick);
    
    console.log('✅ 报关数据附件事件绑定完成');
}

// 处理附件按钮点击事件 - 强化版本
function handleCustomsAttachmentClick(e) {
    const target = e.target;
    
    // 检查点击的是附件按钮或其中的元素
    const attachmentBtn = target.closest('.customs-attachment-btn');
    if (attachmentBtn) {
        // 双重阻止默认行为和事件冒泡
        e.preventDefault();
        e.stopPropagation();
        
        const id = attachmentBtn.getAttribute('data-id');
        console.log('💥 报关附件按钮点击，ID:', id);
        
        if (id) {
            // 直接使用全局window对象调用，确保使用common.js中的全局版本
            if (window.showAttachmentModal) {
                console.log('✅ 调用全局showAttachmentModal函数');
                window.showAttachmentModal(id);
            } else {
                console.error('❌ 全局showAttachmentModal函数不存在');
                // 尝试延迟调用，给页面加载时间
                setTimeout(() => {
                    if (window.showAttachmentModal) {
                        console.log('✅ 延迟调用全局showAttachmentModal函数');
                        window.showAttachmentModal(id);
                    } else {
                        console.error('❌ 延迟后全局showAttachmentModal函数仍不存在');
                    }
                }, 300);
            }
        } else {
            console.error('未找到附件按钮的data-id属性');
        }
        
        return false;
    }
    return true;
}

// 绑定预录入号点击事件
function bindPreEntryClickEvents() {
    document.querySelectorAll('.pre-entry-clickable').forEach(cell => {
        cell.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            showCustomsDataModal(id);
        });
    });
}

// 显示报关数据录入模态框
function showCustomsDataModal(id) {
    currentCustomsItemId = id;

    const item = customsData.find(item => item.id === id);
    if (!item) {
        alert('找不到对应的报关数据');
        return;
    }
    
    // 保存原始数据供添加新项时使用
    currentCustomsDataItem = item;

    // 填充基础信息
    document.getElementById('editCustomsDeclarationNo').value = item.customsNo || '';
    document.getElementById('editBillNo').value = item.billNo || '';
    document.getElementById('editDomesticConsignee').value = item.domesticConsignee || '';
    document.getElementById('editConsumptionUnit').value = item.consumptionUnit || '';
    document.getElementById('editForeignConsignee').value = item.foreignConsignee || '';
    document.getElementById('editShipperRecordNo').value = item.shipperRecordNo || '';
    document.getElementById('editPackageCount').value = item.packageCount || '';
    document.getElementById('editNetWeight').value = item.netWeight || '';
    document.getElementById('editGrossWeight').value = item.grossWeight || '';
    document.getElementById('editCustomsRemark').value = item.remark || '';

    // 处理多项数据
    currentCustomsItems = [];
    itemIndexCounter = 1;

    if (item.customsItems && Array.isArray(item.customsItems) && item.customsItems.length > 0) {
        // 如果有多项数据，加载它们
        currentCustomsItems = item.customsItems;
        itemIndexCounter = item.customsItems.length + 1;
    } else {
        // 如果没有多项数据，创建第一项并填充现有数据
        currentCustomsItems = [{
            itemNo: 1,
            country: item.country || '',      // 保留原始国家信息
            productName: item.productName || '', // 保留原始品名信息
            hsCode: item.hsCode || '',
            supervisionCategory: item.supervisionCategory || '',
            specification: item.specification || '',
            goodsValue: item.goodsValue || '',
            currency: item.currency || '',
            factoryNo: item.factoryNo || '',
            certificate105: item.certificate105 || '',
            certificate325: item.certificate325 || '',
            certificate519: item.certificate519 || '',
            certificate113: item.certificate113 || '',
            inspectionSpec: item.inspectionSpec || '',
            productionDate: item.productionDate || ''
        }];
        itemIndexCounter = 2;
    }

    // 渲染多项数据
    renderCustomsItems();

    const modal = new bootstrap.Modal(document.getElementById('customsDataModal'));
    modal.show();
}

// 渲染多项数据
function renderCustomsItems() {
    const container = document.getElementById('customsItemsList');
    if (!container) return;

    let html = '';
    currentCustomsItems.forEach((customItem, index) => {
        const showDelete = index > 0; // 第一项不显示删除按钮
        html += `
            <div class="item-row border rounded p-3 mb-3" data-item-index="${customItem.itemNo}">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <h6 class="mb-0 text-secondary">项号 ${customItem.itemNo}</h6>
                    ${showDelete ? `<button type="button" class="btn btn-sm btn-outline-danger remove-item-btn" data-item-no="${customItem.itemNo}">
                        <i class="fas fa-trash"></i> 删除
                    </button>` : ''}
                </div>
                <div class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label">HS编码</label>
                        <input type="text" class="form-control item-field" data-field="hsCode" data-item="${customItem.itemNo}" value="${customItem.hsCode || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">国家</label>
                        <input type="text" class="form-control item-field" data-field="country" data-item="${customItem.itemNo}" value="${customItem.country || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">品名</label>
                        <input type="text" class="form-control item-field" data-field="productName" data-item="${customItem.itemNo}" value="${customItem.productName || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">监管类别名称</label>
                        <input type="text" class="form-control item-field" data-field="supervisionCategory" data-item="${customItem.itemNo}" value="${customItem.supervisionCategory || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">规格型号</label>
                        <input type="text" class="form-control item-field" data-field="specification" data-item="${customItem.itemNo}" value="${customItem.specification || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">货值</label>
                        <input type="text" class="form-control item-field" data-field="goodsValue" data-item="${customItem.itemNo}" value="${customItem.goodsValue || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">币制</label>
                        <input type="text" class="form-control item-field" data-field="currency" data-item="${customItem.itemNo}" value="${customItem.currency || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">厂号</label>
                        <input type="text" class="form-control item-field" data-field="factoryNo" data-item="${customItem.itemNo}" value="${customItem.factoryNo || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">105证书</label>
                        <input type="text" class="form-control item-field" data-field="certificate105" data-item="${customItem.itemNo}" value="${customItem.certificate105 || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">325证书</label>
                        <input type="text" class="form-control item-field" data-field="certificate325" data-item="${customItem.itemNo}" value="${customItem.certificate325 || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">519证书</label>
                        <input type="text" class="form-control item-field" data-field="certificate519" data-item="${customItem.itemNo}" value="${customItem.certificate519 || ''}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">113证书</label>
                        <input type="text" class="form-control item-field" data-field="certificate113" data-item="${customItem.itemNo}" value="${customItem.certificate113 || ''}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">检验检疫货物规格</label>
                        <input type="text" class="form-control item-field" data-field="inspectionSpec" data-item="${customItem.itemNo}" value="${customItem.inspectionSpec || ''}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">生产日期</label>
                        <input type="text" class="form-control item-field" data-field="productionDate" data-item="${customItem.itemNo}" value="${customItem.productionDate || ''}" placeholder="输入生产日期">
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // 绑定删除按钮事件
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemNo = parseInt(this.getAttribute('data-item-no'));
            removeCustomsItem(itemNo);
        });
    });

    // 🔥 修复：绑定字段变化事件 - 异步版本
    document.querySelectorAll('.item-field').forEach(field => {
        // 移除旧的事件监听器（如果存在）
        field.removeEventListener('input', updateCustomsItemFieldHandler);
        field.removeEventListener('blur', updateCustomsItemFieldHandler);
        
        // 添加新的事件监听器
        field.addEventListener('input', updateCustomsItemFieldHandler);
        field.addEventListener('blur', updateCustomsItemFieldHandler);
        
        console.log('✅ 已绑定字段事件:', field.getAttribute('data-field'), '项号:', field.getAttribute('data-item'));
    });
}

// 🔥 添加：事件处理函数包装器
async function updateCustomsItemFieldHandler(e) {
    await updateCustomsItemField(e.target);
}

// 添加新项
function addCustomsItem() {
    // 获取第一项的所有信息
    let firstItem = null;
    if (currentCustomsItems.length > 0) {
        firstItem = currentCustomsItems[0];
    } else if (currentCustomsDataItem) {
        // 如果没有项，从原始数据创建第一项的数据结构
        firstItem = {
            country: currentCustomsDataItem.country || '',
            productName: currentCustomsDataItem.productName || '',
            hsCode: currentCustomsDataItem.hsCode || '',
            supervisionCategory: currentCustomsDataItem.supervisionCategory || '',
            specification: currentCustomsDataItem.specification || '',
            currency: currentCustomsDataItem.currency || '',
            certificate105: currentCustomsDataItem.certificate105 || '',
            certificate325: currentCustomsDataItem.certificate325 || '',
            certificate519: currentCustomsDataItem.certificate519 || '',
            certificate113: currentCustomsDataItem.certificate113 || ''
        };
    }
    
    // 创建新项，复制第一项的信息，但不包括：货值、厂号、规格型号、检验检疫货物规格、生产日期
    const newItem = {
        itemNo: itemIndexCounter,
        country: firstItem ? firstItem.country || '' : '',
        productName: firstItem ? firstItem.productName || '' : '',
        hsCode: firstItem ? firstItem.hsCode || '' : '',
        supervisionCategory: firstItem ? firstItem.supervisionCategory || '' : '',
        specification: '',       // 不带入规格型号
        goodsValue: '',          // 不带入货值
        currency: firstItem ? firstItem.currency || '' : '',
        factoryNo: '',           // 不带入厂号
        certificate105: firstItem ? firstItem.certificate105 || '' : '',
        certificate325: firstItem ? firstItem.certificate325 || '' : '',
        certificate519: firstItem ? firstItem.certificate519 || '' : '',
        certificate113: firstItem ? firstItem.certificate113 || '' : '',
        inspectionSpec: '',      // 不带入检验检疫货物规格
        productionDate: ''       // 不带入生产日期
    };

    currentCustomsItems.push(newItem);
    itemIndexCounter++;
    renderCustomsItems();
}

// 删除项
function removeCustomsItem(itemNo) {
    if (confirm(`确定要删除项号 ${itemNo} 吗？`)) {
        currentCustomsItems = currentCustomsItems.filter(item => item.itemNo !== itemNo);
        renderCustomsItems();
    }
}

// 更新项字段值 - 动态查询版本
async function updateCustomsItemField(field) {
    const itemNo = parseInt(field.getAttribute('data-item'));
    const fieldName = field.getAttribute('data-field');
    const value = field.value;

    const item = currentCustomsItems.find(item => item.itemNo === itemNo);
    if (item) {
        item[fieldName] = value;
        
        // 🔥 修改：如果是519证书字段，从LeanCloud动态查询厂号
        if (fieldName === 'certificate519' && value && value.trim() !== '') {
            console.log('🔍 检测到519证书输入:', value);
            
            // 检查申报日期条件
            const shouldExecuteMatch = shouldExecuteCertificateMatch();
            console.log('📅 证书匹配条件检查结果:', shouldExecuteMatch);
            
            if (shouldExecuteMatch) {
                // 显示加载状态
                const factoryNoField = document.querySelector(`input.item-field[data-field="factoryNo"][data-item="${itemNo}"]`);
                if (factoryNoField) {
                    factoryNoField.style.backgroundColor = '#fff3cd';
                    factoryNoField.placeholder = '正在查询...';
                }
                
                // 从LeanCloud动态查询厂号
                try {
                    const factoryNo = await getFactoryNoByCertificate519(value.trim());
                    
                    if (factoryNo && factoryNo.trim() !== '') {
                        // 更新当前项的厂号
                        item.factoryNo = factoryNo;
                        console.log('✅ 已更新数据中的厂号为:', factoryNo);
                        
                        // 更新界面上的厂号输入框
                        if (factoryNoField) {
                            factoryNoField.value = factoryNo;
                            factoryNoField.placeholder = '厂号';
                            console.log('✅ 已更新界面厂号输入框为:', factoryNo);
                            
                            // 添加成功视觉反馈
                            factoryNoField.style.backgroundColor = '#d4edda';
                            setTimeout(() => {
                                factoryNoField.style.backgroundColor = '';
                            }, 1500);
                        }
                        
                        // 显示成功通知
                        showCertificateMatchNotification(value.trim(), factoryNo, true);
                    } else {
                        // 未找到对应的厂号
                        console.log('⚠️ 未找到对应的厂号');
                        
                        // 更新界面反馈
                        if (factoryNoField) {
                            factoryNoField.placeholder = '未找到对应厂号';
                            factoryNoField.style.backgroundColor = '#f8d7da';
                            setTimeout(() => {
                                factoryNoField.style.backgroundColor = '';
                                factoryNoField.placeholder = '厂号';
                            }, 2000);
                        }
                        
                        // 显示未找到映射的提示
                        showCertificateMatchNotification(value.trim(), null, false);
                    }
                } catch (error) {
                    console.error('❌ 查询厂号时发生错误:', error);
                    
                    // 更新界面反馈
                    if (factoryNoField) {
                        factoryNoField.placeholder = '查询失败';
                        factoryNoField.style.backgroundColor = '#f8d7da';
                        setTimeout(() => {
                            factoryNoField.style.backgroundColor = '';
                            factoryNoField.placeholder = '厂号';
                        }, 2000);
                    }
                    
                    // 显示错误提示
                    showCertificateMatchNotification(value.trim(), null, 'error');
                }
            } else {
                console.log('⚠️ 证书匹配条件不满足，跳过自动填充');
            }
        }
    }
}

// 显示证书匹配通知 - 增强版本
function showCertificateMatchNotification(certificate519, factoryNo, status) {
    // 移除现有通知
    const existingNotifications = document.querySelectorAll('.certificate-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = 'certificate-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    if (status === true) {
        // 成功找到厂号
        notification.style.background = '#28a745';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>✅ 自动填充成功</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>519证书: <strong>${certificate519}</strong></div>
                <div>厂号: <strong>${factoryNo}</strong></div>
            </div>
        `;
        console.log(`🎉 519证书 ${certificate519} 自动匹配厂号: ${factoryNo}`);
        
        // 3秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
    } else if (status === 'error') {
        // 查询出错
        notification.style.background = '#dc3545';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>❌ 查询失败</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>519证书: ${certificate519}</div>
                <div>网络错误或服务异常，请稍后重试</div>
            </div>
        `;
        console.log(`❌ 519证书 ${certificate519} 查询失败`);
        
        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
        
    } else {
        // 未找到厂号
        notification.style.background = '#ffc107';
        notification.style.color = '#856404';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>⚠️ 未找到对应厂号</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>519证书: <strong>${certificate519}</strong></div>
                <div>请手动输入厂号或联系管理员</div>
            </div>
        `;
        console.log(`⚠️ 519证书 ${certificate519} 未找到对应厂号`);
        
        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    document.body.appendChild(notification);
}

// 保存报关数据
async function saveCustomsData() {
    const id = currentCustomsItemId;
    if (!id) return;

    const item = customsData.find(item => item.id === id);
    if (!item) {
        alert('找不到对应的报关数据');
        return;
    }

    // 填充基础信息（国家、品名从商品明细第一项获取）
    const domesticConsignee = document.getElementById('editDomesticConsignee');
    const consumptionUnit = document.getElementById('editConsumptionUnit');
    const foreignConsignee = document.getElementById('editForeignConsignee');
    const shipperRecordNo = document.getElementById('editShipperRecordNo');
    const packageCount = document.getElementById('editPackageCount');
    const netWeight = document.getElementById('editNetWeight');
    const grossWeight = document.getElementById('editGrossWeight');
    const customsRemark = document.getElementById('editCustomsRemark');
    
    // 检查元素是否存在
    if (domesticConsignee) item.domesticConsignee = domesticConsignee.value;
    if (consumptionUnit) item.consumptionUnit = consumptionUnit.value;
    if (foreignConsignee) item.foreignConsignee = foreignConsignee.value;
    if (shipperRecordNo) item.shipperRecordNo = shipperRecordNo.value;
    if (packageCount) item.packageCount = packageCount.value;
    if (netWeight) item.netWeight = netWeight.value;
    if (grossWeight) item.grossWeight = grossWeight.value;
    if (customsRemark) item.remark = customsRemark.value;

    // 处理多项数据
    if (currentCustomsItems.length > 0) {
        // 保存多项数据到customsItems字段
        item.customsItems = currentCustomsItems;
        
        // 🔥 修复：计算总货值，解决浮点数精度问题
        const totalGoodsValue = currentCustomsItems.reduce((sum, item) => {
            const value = parseFloat(item.goodsValue) || 0;
            return sum + value;
        }, 0);
        // 保留2位小数，解决浮点数精度问题
        item.goodsValue = parseFloat(totalGoodsValue.toFixed(2)).toString();
        
        // 使用第一项的其他字段用于列表显示
        const firstItem = currentCustomsItems[0];
        item.country = firstItem.country || '';
        item.productName = firstItem.productName || '';
        item.hsCode = firstItem.hsCode || '';
        item.supervisionCategory = firstItem.supervisionCategory || '';
        item.specification = firstItem.specification || '';
        item.currency = firstItem.currency || '';
        item.factoryNo = firstItem.factoryNo || '';
        item.certificate105 = firstItem.certificate105 || '';
        item.certificate325 = firstItem.certificate325 || '';
        item.certificate519 = firstItem.certificate519 || '';
        item.certificate113 = firstItem.certificate113 || '';
        item.inspectionSpec = firstItem.inspectionSpec || '';
        item.productionDate = firstItem.productionDate || '';
    } else {
        // 兼容旧数据（没有多项数据的情况）
        item.hsCode = document.getElementById('editHsCode').value;
        item.supervisionCategory = document.getElementById('editSupervisionCategory').value;
        item.specification = document.getElementById('editSpecification').value;
        item.goodsValue = document.getElementById('editGoodsValue').value;
        item.currency = document.getElementById('editCurrency').value;
        item.factoryNo = document.getElementById('editFactoryNo').value;
        item.certificate105 = document.getElementById('editCertificate105').value;
        item.certificate325 = document.getElementById('editCertificate325').value;
        item.certificate519 = document.getElementById('editCertificate519').value;
        item.certificate113 = document.getElementById('editCertificate113').value;
        item.inspectionSpec = document.getElementById('editInspectionSpec').value;
        item.productionDate = document.getElementById('editProductionDate').value;
        item.customsItems = [];
    }

    try {
        const success = await saveToLeanCloud(item, false);
        
        if (success) {
            const filteredItem = filteredCustomsData.find(item => item.id === id);
            if (filteredItem) {
                Object.keys(item).forEach(key => {
                    if (key !== 'leanCloudObject') {
                        filteredItem[key] = item[key];
                    }
                });
            }
            
            renderCustomsTable();
            const modal = bootstrap.Modal.getInstance(document.getElementById('customsDataModal'));
            modal.hide();
            alert('报关数据保存成功');
        } else {
            alert('保存失败，请重试');
        }
    } catch (error) {
        console.error('保存报关数据失败:', error);
        alert('保存失败，请重试');
    }
}

// 更新报关数据分页
function updateCustomsPagination() {
    customsTotalPages = Math.ceil(filteredCustomsData.length / customsItemsPerPage);
    const paginationElement = document.getElementById('customsPagination');
    
    if (!paginationElement) return;
    
    if (customsTotalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    if (customsCurrentPageIndex > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-customs-page="${customsCurrentPageIndex - 1}">上一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">上一页</a></li>`;
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, customsCurrentPageIndex - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(customsTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === customsCurrentPageIndex) {
            paginationHTML += `<li class="page-item active"><a class="page-link" href="#" data-customs-page="${i}">${i}</a></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-customs-page="${i}">${i}</a></li>`;
        }
    }
    
    if (customsCurrentPageIndex < customsTotalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-customs-page="${customsCurrentPageIndex + 1}">下一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">下一页</a></li>`;
    }
    
    paginationElement.innerHTML = paginationHTML;
    
    document.querySelectorAll('#customsPagination .page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-customs-page'));
            if (page && page !== customsCurrentPageIndex) {
                customsCurrentPageIndex = page;
                renderCustomsTable();
                updateCustomsPagination();
            }
        });
    });
}

// 更新报关数据分页信息
function updateCustomsPaginationInfo() {
    const totalItems = filteredCustomsData.length;
    const startItem = totalItems > 0 ? (customsCurrentPageIndex - 1) * customsItemsPerPage + 1 : 0;
    const endItem = Math.min(customsCurrentPageIndex * customsItemsPerPage, totalItems);
    
    const paginationInfo = document.getElementById('customsPaginationInfo');
    if (paginationInfo) {
        paginationInfo.innerHTML = 
            `共 ${customsTotalPages} 页，每页显示 ${customsItemsPerPage} 条，共 ${totalItems} 条记录，当前显示第 ${startItem}-${endItem} 条`;
    }
}

// 清空报关数据筛选条件
function clearCustoms() {
    document.getElementById('customsArrivalDate').value = '';
    document.getElementById('customsBillNo').value = '';
    document.getElementById('customsContainerNo').value = '';
    document.getElementById('customsDeclareDate').value = '';
    document.getElementById('customsNoFilter').value = '';

    filteredCustomsData = [...customsData];
    customsCurrentPageIndex = 1;
    updateCustomsPagination();
    renderCustomsTable();
}

// 导出报关数据
function exportCustomsData() {
    if (filteredCustomsData.length === 0) {
        alert('没有数据可导出');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();
        
        const exportData = filteredCustomsData.map(item => ({
            '到港日期': item.arrivalDate,
            '申报日期': item.declareDate,
            '预录入号': item.preEntryNo,
            '提单号': item.billNo,
            '柜号': item.containerNo,
            '报关单号': item.customsNo,
            '欧盟保证金': item.euDeposit,
            '国家': item.country,
            '品名': item.productName,
            '报关状态': item.customsStatus,
            '指令': item.instruction,
            '境内收发货人': item.domesticConsignee,
            '消费使用单位': item.consumptionUnit,
            '境外收发货人': item.foreignConsignee,
            'HS编码': item.hsCode,
            '监管类别名称': item.supervisionCategory,
            '规格型号': item.specification,
            '货值': item.goodsValue,
            '币制': item.currency,
            '厂号': item.factoryNo,
            '发货人备案号': item.shipperRecordNo,
            '件数': item.packageCount,
            '净重': item.netWeight,
            '毛重': item.grossWeight,
            '105证书': item.certificate105,
            '325证书': item.certificate325,
            '519证书': item.certificate519,
            '113证书': item.certificate113,
            '检验检疫货物规格': item.inspectionSpec,
            '生产日期': item.productionDate,
            '备注': item.remark
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, '报关数据');
        
        const fileName = `报关数据_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        alert(`导出完成！共导出 ${filteredCustomsData.length} 条报关数据`);
        
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败，请重试');
    }
}

// 导入报关数据功能
function showImportCustomsModal() {
    document.getElementById('importCustomsFile').value = '';
    document.getElementById('importCustomsPreviewBody').innerHTML = '';
    document.getElementById('confirmCustomsImport').disabled = true;
    
    const modal = new bootstrap.Modal(document.getElementById('importCustomsModal'));
    modal.show();
}

// 处理文件选择
function handleCustomsFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewBody = document.getElementById('importCustomsPreviewBody');
    previewBody.innerHTML = '<tr><td colspan="10" class="text-center">正在解析文件...</td></tr>';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                previewBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">文件没有数据</td></tr>';
                return;
            }
            
            const headers = jsonData[0];
            console.log('文件表头:', headers);
            
            const previewData = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length === 0) continue;
                
                const item = {
                    status: 'valid',
                    containerNo: row[0] || '',
                    arrivalDate: excelDateToJSDate(row[1]),
                    billNo: row[2] || '',
                    customsNo: row[3] || '',
                    country: row[4] || '',
                    productName: row[5] || '',
                    preEntryNo: row[6] || '',
                    declareDate: excelDateToJSDate(row[7]),
                    customsStatus: row[8] || '',
                    instruction: row[9] || '',
                    euDeposit: row[10] || '',
                    domesticConsignee: row[11] || '',
                    consumptionUnit: row[12] || '',
                    foreignConsignee: row[13] || '',
                    hsCode: row[14] || '',
                    supervisionCategory: row[15] || '',
                    specification: row[16] || '',
                    goodsValue: row[17] || '',
                    currency: row[18] || '',
                    factoryNo: row[19] || '',
                    shipperRecordNo: row[20] || '',
                    packageCount: row[21] || '',
                    netWeight: row[22] || '',
                    grossWeight: row[23] || '',
                    certificate105: row[24] || '',
                    certificate325: row[25] || '',
                    certificate519: row[26] || '',
                    certificate113: row[27] || '',
                    inspectionSpec: row[28] || '',
                    productionDate: excelDateToJSDate(row[29]),
                    remark: row[30] || '',
                    errors: ''
                };
                
                if (!item.containerNo) {
                    item.status = 'error';
                    item.errors = '柜号不能为空';
                }
                if (!item.arrivalDate) {
                    item.status = 'error';
                    item.errors += item.errors ? '；到港日期不能为空' : '到港日期不能为空';
                }
                
                previewData.push(item);
            }
            
            displayCustomsImportPreview(previewData);
            
        } catch (error) {
            console.error('文件解析失败:', error);
            previewBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">文件解析失败: ' + error.message + '</td></tr>';
        }
    };
    
    reader.onerror = function() {
        previewBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">文件读取失败</td></tr>';
    };
    
    reader.readAsArrayBuffer(file);
}

function displayCustomsImportPreview(data) {
    const previewBody = document.getElementById('importCustomsPreviewBody');
    const confirmButton = document.getElementById('confirmCustomsImport');

    let validCount = 0;
    let html = '';

    data.forEach((item, index) => {
        const statusClass = item.status === 'valid' ? 'import-status-valid' : 'import-status-error';
        const statusText = item.status === 'valid' ? '✓ 有效' : '✗ 错误';
        
        html += `<tr class="${statusClass}">
            <td>${statusText}</td>
            <td>${item.containerNo}</td>
            <td>${item.arrivalDate}</td>
            <td>${item.billNo}</td>
            <td>${item.customsNo}</td>
            <td>${item.country}</td>
            <td>${item.productName}</td>
            <td>${item.preEntryNo}</td>
            <td>${item.declareDate}</td>
            <td class="text-danger small">${item.errors}</td>
        </tr>`;
        
        if (item.status === 'valid') {
            validCount++;
        }
    });

    previewBody.innerHTML = html;
    confirmButton.disabled = validCount === 0;
    
    window.customsImportData = data;
}

// 确认导入 - 修复数据隔离问题
async function confirmCustomsImport() {
    const confirmButton = document.getElementById('confirmCustomsImport');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导入中...';

    try {
        const importData = window.customsImportData || [];
        const validData = importData.filter(item => item.status === 'valid');
        
        console.log('📊 导入数据统计:');
        console.log('- 总数据:', importData.length);
        console.log('- 有效数据:', validData.length);
        
        if (validData.length === 0) {
            alert('没有有效数据可导入');
            confirmButton.disabled = false;
            confirmButton.innerHTML = '确认导入';
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const item of validData) {
            try {
                console.log(`🔄 处理数据: ${item.containerNo}`);
                
                // 检查是否已存在相同柜号的记录
                const query = new AV.Query('Tracking');
                query.equalTo('containerNo', item.containerNo);
                const existing = await query.first();

                if (existing) {
                    console.log(`📝 更新现有记录: ${item.containerNo}`);
                    // 更新现有记录 - 完整字段
                    existing.set('arrivalDate', item.arrivalDate.toString());
                    existing.set('billNo', item.billNo.toString());
                    existing.set('customsNo', item.customsNo.toString());
                    existing.set('country', item.country.toString());
                    existing.set('productName', item.productName.toString());
                    existing.set('preEntryNo', item.preEntryNo.toString());
                    existing.set('declareDate', item.declareDate.toString());
                    existing.set('customsStatus', item.customsStatus.toString());
                    existing.set('instruction', item.instruction.toString());
                    existing.set('euDeposit', item.euDeposit.toString());
                    existing.set('domesticConsignee', item.domesticConsignee.toString());
                    existing.set('consumptionUnit', item.consumptionUnit.toString());
                    existing.set('foreignConsignee', item.foreignConsignee.toString());
                    existing.set('hsCode', item.hsCode.toString());
                    existing.set('supervisionCategory', item.supervisionCategory.toString());
                    existing.set('specification', item.specification.toString());
                    existing.set('goodsValue', item.goodsValue.toString());
                    existing.set('currency', item.currency.toString());
                    existing.set('factoryNo', item.factoryNo.toString());
                    existing.set('shipperRecordNo', item.shipperRecordNo.toString());
                    existing.set('packageCount', item.packageCount.toString());
                    existing.set('netWeight', item.netWeight.toString());
                    existing.set('grossWeight', item.grossWeight.toString());
                    existing.set('certificate105', item.certificate105.toString());
                    existing.set('certificate325', item.certificate325.toString());
                    existing.set('certificate519', item.certificate519.toString());
                    existing.set('certificate113', item.certificate113.toString());
                    existing.set('inspectionSpec', item.inspectionSpec.toString());
                    existing.set('productionDate', item.productionDate.toString());
                    existing.set('remark', item.remark.toString());
                    existing.set('operation', '申报'); // 关键：设置为已申报
                    await existing.save();
                    console.log(`✅ 更新记录成功: ${item.containerNo}, operation: 申报`);
                } else {
                    console.log(`🆕 创建新记录: ${item.containerNo}`);
                    // 创建新记录 - 完整字段
                    const trackingObj = new AV.Object('Tracking');
                    trackingObj.set('containerNo', item.containerNo.toString());
                    trackingObj.set('arrivalDate', item.arrivalDate.toString());
                    trackingObj.set('billNo', item.billNo.toString());
                    trackingObj.set('customsNo', item.customsNo.toString());
                    trackingObj.set('country', item.country.toString());
                    trackingObj.set('productName', item.productName.toString());
                    trackingObj.set('preEntryNo', item.preEntryNo.toString());
                    trackingObj.set('declareDate', item.declareDate.toString());
                    trackingObj.set('customsStatus', item.customsStatus.toString());
                    trackingObj.set('instruction', item.instruction.toString());
                    trackingObj.set('euDeposit', item.euDeposit.toString());
                    trackingObj.set('domesticConsignee', item.domesticConsignee.toString());
                    trackingObj.set('consumptionUnit', item.consumptionUnit.toString());
                    trackingObj.set('foreignConsignee', item.foreignConsignee.toString());
                    trackingObj.set('hsCode', item.hsCode.toString());
                    trackingObj.set('supervisionCategory', item.supervisionCategory.toString());
                    trackingObj.set('specification', item.specification.toString());
                    trackingObj.set('goodsValue', item.goodsValue.toString());
                    trackingObj.set('currency', item.currency.toString());
                    trackingObj.set('factoryNo', item.factoryNo.toString());
                    trackingObj.set('shipperRecordNo', item.shipperRecordNo.toString());
                    trackingObj.set('packageCount', item.packageCount.toString());
                    trackingObj.set('netWeight', item.netWeight.toString());
                    trackingObj.set('grossWeight', item.grossWeight.toString());
                    trackingObj.set('certificate105', item.certificate105.toString());
                    trackingObj.set('certificate325', item.certificate325.toString());
                    trackingObj.set('certificate519', item.certificate519.toString());
                    trackingObj.set('certificate113', item.certificate113.toString());
                    trackingObj.set('inspectionSpec', item.inspectionSpec.toString());
                    trackingObj.set('productionDate', item.productionDate.toString());
                    trackingObj.set('remark', item.remark.toString());
                    trackingObj.set('operation', '申报'); // 关键：设置为已申报
                    await trackingObj.save();
                    console.log(`✅ 创建记录成功: ${item.containerNo}, operation: 申报`);
                }
                
                successCount++;
            } catch (error) {
                console.error(`❌ 导入失败 ${item.containerNo}:`, error);
                errorCount++;
            }
        }

        const importModal = bootstrap.Modal.getInstance(document.getElementById('importCustomsModal'));
        importModal.hide();
        
        console.log(`📈 导入完成: 成功 ${successCount} 条，失败 ${errorCount} 条`);
        
        if (errorCount === 0) {
            alert(`导入完成！成功导入 ${successCount} 条报关数据`);
        } else {
            alert(`导入完成！成功 ${successCount} 条，失败 ${errorCount} 条`);
        }
        
        // 重新加载数据
        console.log('🔄 重新加载报关数据...');
        await loadCustomsData();
        
        console.log('🔄 重新加载跟单数据...');
        if (typeof loadTrackingData === 'function') {
            await loadTrackingData();
        }
        
    } catch (error) {
        console.error('导入失败:', error);
        alert('导入过程中发生错误: ' + error.message);
    } finally {
        confirmButton.disabled = false;
        confirmButton.innerHTML = '确认导入';
    }
}

// 下载报关数据模板
function downloadCustomsTemplate() {
    try {
        const wb = XLSX.utils.book_new();
        
        const headers = [
            '柜号', '到港日期', '提单号', '报关单号', '国家', '品名', '预录入号', '申报日期',
            '报关状态', '指令', '欧盟保证金', '境内收发货人', '消费使用单位', '境外收发货人',
            'HS编码', '监管类别名称', '规格型号', '货值', '币制', '厂号', '发货人备案号',
            '件数', '净重', '毛重', '105证书', '325证书', '519证书', '113证书',
            '检验检疫货物规格', '生产日期', '备注'
        ];
        
        const sampleData = [
            [
                'CONT1234567', '2024-01-15', 'BL20240001', 'CUS20240001', '德国', '机械设备', 
                'PRE20240001', '2024-01-16', '放行', '直通', '1000', '境内公司A', '消费公司B', 
                '境外公司C', '8479890000', '无', '标准型号', '50000', 'CNY', 'F001', 'S20240001', 
                '100', '5000', '5200', 'C105001', 'C325001', 'C519001', 'C113001', '标准规格', 
                '2024-01-01', '测试备注'
            ]
        ];
        
        const wsData = [headers, ...sampleData];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        XLSX.utils.book_append_sheet(wb, ws, '报关数据导入模板');
        XLSX.writeFile(wb, '报关数据导入模板.xlsx');
        
    } catch (error) {
        console.error('模板下载失败:', error);
        alert('模板下载失败，请重试');
    }
}

// 绑定报关数据管理事件 - 强力修复版本
function bindCustomsEvents() {
    console.log('绑定报关数据事件...');
    
    const searchCustomsBtn = document.getElementById('searchCustoms');
    if (searchCustomsBtn) {
        searchCustomsBtn.addEventListener('click', function() {
            applyCustomsFilters();
            customsCurrentPageIndex = 1;
            updateCustomsPagination();
            renderCustomsTable();
        });
    }
    
    const clearCustomsBtn = document.getElementById('clearCustoms');
    if (clearCustomsBtn) {
        clearCustomsBtn.addEventListener('click', clearCustoms);
    }
    
    const customsPageSizeSelect = document.getElementById('customsPageSizeSelect');
    if (customsPageSizeSelect) {
        customsPageSizeSelect.addEventListener('change', function() {
            customsItemsPerPage = parseInt(this.value);
            customsCurrentPageIndex = 1;
            updateCustomsPagination();
            renderCustomsTable();
        });
    }
    
    const importCustomsBtn = document.getElementById('importCustoms');
    if (importCustomsBtn) {
        importCustomsBtn.addEventListener('click', showImportCustomsModal);
    }
    
    const importCustomsFileInput = document.getElementById('importCustomsFile');
    if (importCustomsFileInput) {
        importCustomsFileInput.addEventListener('change', handleCustomsFileSelect);
    }
    
    const confirmCustomsImportBtn = document.getElementById('confirmCustomsImport');
    if (confirmCustomsImportBtn) {
        confirmCustomsImportBtn.addEventListener('click', confirmCustomsImport);
    }
    
    const downloadCustomsTemplateBtn = document.getElementById('downloadCustomsTemplate');
    if (downloadCustomsTemplateBtn) {
        downloadCustomsTemplateBtn.addEventListener('click', downloadCustomsTemplate);
    }
    
    const exportCustomsBtn = document.getElementById('exportCustoms');
    if (exportCustomsBtn) {
        exportCustomsBtn.addEventListener('click', exportCustomsData);
    }
    
    const saveCustomsDataBtn = document.getElementById('saveCustomsData');
    if (saveCustomsDataBtn) {
        saveCustomsDataBtn.addEventListener('click', saveCustomsData);
    }
    
    // 强力修复：报关附件按钮事件绑定
    setTimeout(() => {
        bindCustomsAttachmentEvents();
        
        // 额外的事件委托绑定 - 确保能捕获所有点击
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('customs-attachment-btn') || 
                e.target.closest('.customs-attachment-btn')) {
                const btn = e.target.classList.contains('customs-attachment-btn') ? 
                    e.target : e.target.closest('.customs-attachment-btn');
                const id = btn.getAttribute('data-id');
                if (id) {
                    console.log('💥 全局事件捕获报关附件点击，ID:', id);
                    e.preventDefault();
                    e.stopPropagation();
                    showAttachmentModal(id);
                }
            }
        });
    }, 1000);
}

// 🔥 添加：手动触发报关数据加载的函数（用于调试）
window.manualLoadCustomsData = function() {
    console.log('🔧 手动触发报关数据加载...');
    loadCustomsData();
};

// 导出函数
window.loadCustomsData = loadCustomsData;
window.renderCustomsTable = renderCustomsTable;
window.showCustomsDataModal = showCustomsDataModal;
window.addCustomsItem = addCustomsItem;
window.removeCustomsItem = removeCustomsItem;
window.updateCustomsItemField = updateCustomsItemField;
window.renderCustomsItems = renderCustomsItems;

// 页面加载时绑定事件
document.addEventListener('DOMContentLoaded', function() {
    console.log('报关数据管理初始化...');
});

// 🔥 强力修复：报关数据附件同步
function syncCustomsAttachments(id, attachments) {
    console.log('🔄 同步报关数据附件，ID:', id, '附件数:', attachments.length);
    
    // 更新主数据
    const customsItem = customsData.find(item => item.id === id);
    if (customsItem) {
        customsItem.attachments = attachments;
        console.log('✅ 同步报关主数据完成');
    }
    
    // 更新筛选数据
    const filteredItem = filteredCustomsData.find(item => item.id === id);
    if (filteredItem) {
        filteredItem.attachments = attachments;
        console.log('✅ 同步报关筛选数据完成');
    }
    
    // 立即重新渲染
    renderCustomsTable();
}

// 监听附件更新事件
document.addEventListener('attachmentUpdated', function(e) {
    const { id, attachments } = e.detail;
    console.log('📢 报关数据收到附件更新:', id, attachments.length);
    
    // 同步附件数据
    syncCustomsAttachments(id, attachments);
});

// 导出函数
window.syncCustomsAttachments = syncCustomsAttachments;

// 🔥 简化修复：强制刷新报关表格
function forceRefreshCustomsTable() {
    if (typeof renderCustomsTable === 'function') {
        console.log('🔄 强制刷新报关表格');
        renderCustomsTable();
    }
}

// 监听附件计数更新，强制刷新表格
document.addEventListener('attachmentCountUpdated', function(e) {
    console.log('📢 收到附件计数更新，刷新报关表格');
    setTimeout(forceRefreshCustomsTable, 100);
});

// 🔥 修复：监听报关页面初始化事件
document.addEventListener('customsPageInit', function(e) {
    console.log('📢 收到报关页面初始化事件');
    console.log('📋 准备调用 loadCustomsData...');
    
    // 延迟执行，确保DOM完全渲染
    setTimeout(() => {
        if (typeof loadCustomsData === 'function') {
            console.log('✅ 调用 loadCustomsData...');
            loadCustomsData();
        } else {
            console.error('❌ loadCustomsData 函数仍然不存在');
        }
    }, 100);
});

// 🔥 修复：强制刷新报关表格
function forceRefreshCustomsTable() {
    if (typeof renderCustomsTable === 'function') {
        console.log('🔄 强制刷新报关表格');
        renderCustomsTable();
    }
}

// 监听附件计数更新，强制刷新表格
document.addEventListener('attachmentCountUpdated', function(e) {
    console.log('📢 收到附件计数更新，刷新报关表格');
    setTimeout(forceRefreshCustomsTable, 100);
});

// 导出函数
window.forceRefreshCustomsTable = forceRefreshCustomsTable;