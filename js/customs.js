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
    console.log('📋 事件详情:', e.detail);

    // 🔥 修改：初始化时不自动加载数据，只渲染空表格，等待用户点击查询
    const table = document.getElementById('customsTable');
    if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="33" class="loading">请输入查询条件后点击查询按钮</td></tr>';
        }
    }
    console.log('✅ 报关页面已就绪，请输入查询条件');

    // 🔥 初始化时绑定按钮事件
    console.log('🔗 开始绑定报关按钮事件...');
    bindCustomsEvents();
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

// 加载报关数据 - 支持分页查询所有数据
async function loadCustomsData(searchConditions = {}) {
    try {
        // 🔥 设置加载标志
        if (isCustomsLoading) {
            console.log('⚠️ 报关数据已在加载中，跳过本次请求');
            return;
        }
        isCustomsLoading = true;
        console.log('🚀 开始加载报关数据...');
        console.log('📋 当前时间:', new Date().toLocaleString());
        console.log('📋 查询条件:', searchConditions);

        // 🔥 添加页面就绪检查
        if (!checkCustomsPageReady()) {
            console.error('❌ 报关页面未就绪，延迟1秒后重试...');
            setTimeout(() => {
                console.log('🔄 重新尝试加载报关数据...');
                loadCustomsData(searchConditions);
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

        tbody.innerHTML = '<tr><td colspan="33" class="loading">正在从LeanCloud查询数据...</td></tr>';

        // 🔥 修复：只查询 operation 为 "申报" 的数据
        console.log('🔍 开始构建查询条件...');
        const query = new AV.Query('Tracking');
        query.equalTo('operation', '申报');
        console.log('✅ 查询条件: operation="申报"');

        // 🔥 添加查询条件
        if (searchConditions.billNo) {
            query.contains('billNo', searchConditions.billNo);
            console.log('✅ 添加条件: billNo contains', searchConditions.billNo);
        }
        if (searchConditions.containerNo) {
            query.contains('containerNo', searchConditions.containerNo);
            console.log('✅ 添加条件: containerNo contains', searchConditions.containerNo);
        }
        if (searchConditions.customsNo) {
            query.contains('customsNo', searchConditions.customsNo);
            console.log('✅ 添加条件: customsNo contains', searchConditions.customsNo);
        }
        if (searchConditions.arrivalDateStart) {
            query.greaterThanOrEqualTo('arrivalDate', searchConditions.arrivalDateStart);
            console.log('✅ 添加条件: arrivalDate >=', searchConditions.arrivalDateStart);
        }
        if (searchConditions.arrivalDateEnd) {
            query.lessThanOrEqualTo('arrivalDate', searchConditions.arrivalDateEnd);
            console.log('✅ 添加条件: arrivalDate <=', searchConditions.arrivalDateEnd);
        }
        if (searchConditions.declareDateStart) {
            query.greaterThanOrEqualTo('declareDate', searchConditions.declareDateStart);
            console.log('✅ 添加条件: declareDate >=', searchConditions.declareDateStart);
        }
        if (searchConditions.declareDateEnd) {
            query.lessThanOrEqualTo('declareDate', searchConditions.declareDateEnd);
            console.log('✅ 添加条件: declareDate <=', searchConditions.declareDateEnd);
        }

        // 🔥 修复：使用分页查询获取超过1000条的数据
        const batchSize = 1000;
        let allResults = [];
        let skip = 0;
        let hasMore = true;

        query.include('attachments');
        console.log('✅ 添加 include(attachments)');

        // 循环查询直到获取所有数据
        while (hasMore) {
            query.limit(batchSize);
            query.skip(skip);
            console.log(`📡 正在从LeanCloud查询数据 (skip=${skip}, limit=${batchSize})...`);
            const results = await query.find();
            console.log(`✅ 第${Math.floor(skip/batchSize) + 1}批查询完成，获取`, results.length, '条数据');
            allResults = allResults.concat(results);

            if (results.length < batchSize) {
                hasMore = false;
            } else {
                skip += batchSize;
            }
        }

        console.log('✅ 查询完成，共获取', allResults.length, '条数据');

        customsData = allResults.map(item => {
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

// 应用报关数据筛选条件 - 支持从LeanCloud查询
async function applyCustomsFilters() {
    const arrivalDate = document.getElementById('customsArrivalDate').value;
    const billNo = document.getElementById('customsBillNo').value.trim();
    const containerNo = document.getElementById('customsContainerNo').value.trim();
    const declareDate = document.getElementById('customsDeclareDate').value;
    const customsNoFilter = document.getElementById('customsNoFilter').value.trim();

    // 🔥 新增：检查是否有查询条件
    const hasSearchCondition = billNo || containerNo || customsNoFilter || arrivalDate || declareDate;

    if (!hasSearchCondition) {
        // 🔥 没有查询条件时提示用户
        alert('请输入至少一个查询条件');
        return;
    }

    // 🔥 构建查询条件对象
    const searchConditions = {
        billNo: billNo,
        containerNo: containerNo,
        customsNo: customsNoFilter
    };

    // 解析到港日期范围
    if (arrivalDate && arrivalDate.trim() !== '') {
        let separator = ' to ';
        if (arrivalDate.includes('至')) {
            separator = '至';
        } else if (arrivalDate.includes(' - ')) {
            separator = ' - ';
        }
        const dates = arrivalDate.split(separator).map(date => date.trim());
        if (dates.length === 2) {
            searchConditions.arrivalDateStart = dates[0];
            searchConditions.arrivalDateEnd = dates[1];
        } else {
            searchConditions.arrivalDateStart = arrivalDate;
            searchConditions.arrivalDateEnd = arrivalDate;
        }
    }

    // 解析申报日期范围
    if (declareDate && declareDate.trim() !== '') {
        let separator = ' to ';
        if (declareDate.includes('至')) {
            separator = '至';
        } else if (declareDate.includes(' - ')) {
            separator = ' - ';
        }
        const dates = declareDate.split(separator).map(date => date.trim());
        if (dates.length === 2) {
            searchConditions.declareDateStart = dates[0];
            searchConditions.declareDateEnd = dates[1];
        } else {
            searchConditions.declareDateStart = declareDate;
            searchConditions.declareDateEnd = declareDate;
        }
    }

    console.log('🔍 开始查询，条件:', searchConditions);

    // 🔥 从LeanCloud查询数据
    await loadCustomsData(searchConditions);
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

// 绑定境外收发货人输入事件
function bindForeignConsigneeInputEvent() {
    const foreignConsigneeInput = document.getElementById('editForeignConsignee');
    if (!foreignConsigneeInput) return;

    // 移除旧的事件监听器
    foreignConsigneeInput.removeEventListener('blur', handleForeignConsigneeInput);
    foreignConsigneeInput.removeEventListener('change', handleForeignConsigneeInput);

    // 添加新的事件监听器
    foreignConsigneeInput.addEventListener('blur', handleForeignConsigneeInput);
    foreignConsigneeInput.addEventListener('change', handleForeignConsigneeInput);
}

// 处理境外收发货人输入
async function handleForeignConsigneeInput(e) {
    const foreignConsignee = e.target.value.trim();

    if (!foreignConsignee) {
        return;
    }

    console.log('🔍 检测到境外收发货人输入:', foreignConsignee);

    // 显示加载状态
    const shipperRecordNoField = document.getElementById('editShipperRecordNo');
    if (shipperRecordNoField) {
        shipperRecordNoField.style.backgroundColor = '#fff3cd';
        shipperRecordNoField.placeholder = '正在查询...';
    }

    // 从LeanCloud动态查询发货人备案号
    try {
        const shipperRecordNos = await getShipperRecordNoByExporter(foreignConsignee);

        if (shipperRecordNos && shipperRecordNos.length > 0) {
            console.log('✅ 查询到的发货人备案号:', shipperRecordNos);

            if (shipperRecordNos.length === 1) {
                // 只有一个匹配结果，直接填充
                const shipperRecordNo = shipperRecordNos[0];

                // 更新当前数据
                if (currentCustomsDataItem) {
                    currentCustomsDataItem.shipperRecordNo = shipperRecordNo;
                }

                // 更新界面
                if (shipperRecordNoField) {
                    shipperRecordNoField.value = shipperRecordNo;
                    shipperRecordNoField.placeholder = '发货人备案号';
                    shipperRecordNoField.style.backgroundColor = '#d4edda';
                    setTimeout(() => {
                        shipperRecordNoField.style.backgroundColor = '';
                    }, 1500);
                }

                // 显示成功通知
                showExporterMatchNotification(foreignConsignee, shipperRecordNo, true);
            } else {
                // 多个匹配结果，显示选择下拉框
                showShipperRecordNoSelector(shipperRecordNos, shipperRecordNoField);
                // 显示提示通知
                showExporterMatchNotification(foreignConsignee, shipperRecordNos, 'multiple');
            }
        } else {
            // 未找到对应的发货人备案号
            console.log('⚠️ 未找到对应的发货人备案号');

            // 更新界面反馈
            if (shipperRecordNoField) {
                shipperRecordNoField.placeholder = '未找到对应备案号';
                shipperRecordNoField.style.backgroundColor = '#f8d7da';
                setTimeout(() => {
                    shipperRecordNoField.style.backgroundColor = '';
                    shipperRecordNoField.placeholder = '发货人备案号';
                }, 2000);
            }

            // 显示未找到的提示
            showExporterMatchNotification(foreignConsignee, null, false);
        }
    } catch (error) {
        console.error('❌ 查询发货人备案号时发生错误:', error);

        // 更新界面反馈
        if (shipperRecordNoField) {
            shipperRecordNoField.placeholder = '查询失败';
            shipperRecordNoField.style.backgroundColor = '#f8d7da';
            setTimeout(() => {
                shipperRecordNoField.style.backgroundColor = '';
                shipperRecordNoField.placeholder = '发货人备案号';
            }, 2000);
        }

        // 显示错误提示
        showExporterMatchNotification(foreignConsignee, null, 'error');
    }
}

// 显示发货人备案号选择下拉框
function showShipperRecordNoSelector(shipperRecordNos, targetField) {
    // 移除已存在的选择框
    const existingSelector = document.getElementById('shipperRecordNoSelector');
    if (existingSelector) {
        existingSelector.remove();
    }

    // 计算下拉框位置
    const fieldRect = targetField.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // 创建选择框容器
    const selector = document.createElement('div');
    selector.id = 'shipperRecordNoSelector';
    selector.style.cssText = `
        position: absolute;
        top: ${fieldRect.bottom + scrollTop + 5}px;
        left: ${fieldRect.left + scrollLeft}px;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        min-width: 300px;
        max-height: 300px;
        overflow-y: auto;
        animation: slideDown 0.2s ease-out;
    `;

    // 创建标题
    const title = document.createElement('div');
    title.style.cssText = `
        padding: 10px 15px;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        font-weight: 600;
        color: #495057;
        font-size: 13px;
    `;
    title.textContent = `找到 ${shipperRecordNos.length} 个备案号，请选择：`;
    selector.appendChild(title);

    // 创建选项列表
    const list = document.createElement('div');
    list.style.cssText = 'padding: 5px 0;';

    shipperRecordNos.forEach((recordNo, index) => {
        const option = document.createElement('div');
        option.style.cssText = `
            padding: 10px 15px;
            cursor: pointer;
            font-size: 13px;
            color: #495057;
            border-bottom: 1px solid #f1f3f5;
            transition: background 0.2s;
        `;
        option.textContent = recordNo;

        option.addEventListener('mouseenter', function() {
            this.style.background = '#f8f9fa';
        });

        option.addEventListener('mouseleave', function() {
            this.style.background = 'white';
        });

        option.addEventListener('click', function() {
            // 更新数据
            if (currentCustomsDataItem) {
                currentCustomsDataItem.shipperRecordNo = recordNo;
            }

            // 更新界面
            targetField.value = recordNo;
            targetField.placeholder = '发货人备案号';
            targetField.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                targetField.style.backgroundColor = '';
            }, 1500);

            // 移除选择框
            selector.remove();

            console.log('✅ 用户选择了发货人备案号:', recordNo);
        });

        list.appendChild(option);
    });

    selector.appendChild(list);

    // 添加"手动输入"选项
    const manualInputOption = document.createElement('div');
    manualInputOption.style.cssText = `
        padding: 10px 15px;
        cursor: pointer;
        font-size: 13px;
        color: #007bff;
        border-top: 1px solid #dee2e6;
        transition: background 0.2s;
        font-weight: 500;
    `;
    manualInputOption.innerHTML = '<i class="fas fa-edit"></i> 手动输入';
    manualInputOption.addEventListener('mouseenter', function() {
        this.style.background = '#f8f9fa';
    });
    manualInputOption.addEventListener('mouseleave', function() {
        this.style.background = 'white';
    });
    manualInputOption.addEventListener('click', function() {
        // 移除选择框
        selector.remove();

        // 聚焦到输入框并清空，允许用户手动输入
        targetField.value = '';
        targetField.placeholder = '请输入发货人备案号';
        targetField.style.backgroundColor = '';
        targetField.focus();
    });
    selector.appendChild(manualInputOption);

    // 添加取消按钮
    const cancelBtn = document.createElement('div');
    cancelBtn.style.cssText = `
        padding: 10px 15px;
        text-align: center;
        cursor: pointer;
        color: #6c757d;
        font-size: 12px;
        border-top: 1px solid #dee2e6;
        transition: color 0.2s;
    `;
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('mouseenter', function() {
        this.style.color = '#495057';
    });
    cancelBtn.addEventListener('mouseleave', function() {
        this.style.color = '#6c757d';
    });
    cancelBtn.addEventListener('click', function() {
        selector.remove();
        targetField.style.backgroundColor = '';
        targetField.placeholder = '发货人备案号';
    });

    selector.appendChild(cancelBtn);

    document.body.appendChild(selector);

    // 点击其他区域关闭选择框
    setTimeout(() => {
        document.addEventListener('click', closeShipperRecordNoSelectorHandler);
    }, 100);

    function closeShipperRecordNoSelectorHandler(e) {
        if (!selector.contains(e.target) && e.target !== targetField) {
            selector.remove();
            targetField.style.backgroundColor = '';
            targetField.placeholder = '发货人备案号';
            document.removeEventListener('click', closeShipperRecordNoSelectorHandler);
        }
    }
}

// 显示出口商匹配通知
function showExporterMatchNotification(foreignConsignee, shipperRecordNoInfo, status) {
    // 移除现有通知
    const existingNotifications = document.querySelectorAll('.exporter-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = 'exporter-notification';
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
        // 成功找到单个匹配
        notification.style.background = '#28a745';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>✅ 发货人备案号匹配成功</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>境外收发货人: <strong>${foreignConsignee}</strong></div>
                <div>备案号: <strong>${shipperRecordNoInfo}</strong></div>
            </div>
        `;
        console.log(`🎉 境外收发货人 ${foreignConsignee} 自动匹配备案号: ${shipperRecordNoInfo}`);

        // 3秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

    } else if (status === 'multiple') {
        // 找到多个匹配结果
        notification.style.background = '#17a2b8';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>📋 找到多个备案号</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>境外收发货人: <strong>${foreignConsignee}</strong></div>
                <div>共找到 <strong>${shipperRecordNoInfo.length}</strong> 个备案号</div>
                <div style="margin-top: 5px;">请从下拉列表选择或手动输入</div>
            </div>
        `;
        console.log(`📋 境外收发货人 ${foreignConsignee} 找到 ${shipperRecordNoInfo.length} 个备案号`);

        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);

    } else if (status === 'error') {
        // 查询出错
        notification.style.background = '#dc3545';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>❌ 查询失败</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>境外收发货人: ${foreignConsignee}</div>
                <div>网络错误或服务异常，请稍后重试</div>
            </div>
        `;
        console.log(`❌ 境外收发货人 ${foreignConsignee} 查询失败`);

        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);

    } else {
        // 未找到备案号
        notification.style.background = '#ffc107';
        notification.style.color = '#856404';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>⚠️ 未找到备案号</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>境外收发货人: <strong>${foreignConsignee}</strong></div>
                <div>请手动输入备案号或联系管理员</div>
            </div>
        `;
        console.log(`⚠️ 境外收发货人 ${foreignConsignee} 未找到对应备案号`);

        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    document.body.appendChild(notification);
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

    // 绑定境外收发货人输入事件
    bindForeignConsigneeInputEvent();

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

// 从出口商管理中查询发货人备案号（支持多个匹配）
async function getShipperRecordNoByExporter(foreignConsignee) {
    try {
        console.log('🔍 查询境外收发货人:', foreignConsignee);

        // 查询LeanCloud中的Exporter_Base表，获取所有匹配的记录
        const query = new AV.Query('Exporter_Base');
        query.equalTo('foreignConsignee', foreignConsignee);
        query.limit(100); // 允许查询多个匹配结果

        const results = await query.find();

        if (results.length > 0) {
            // 提取所有的发货人备案号（去重）
            const shipperRecordNos = [...new Set(
                results
                    .map(r => r.get('shipperRecordNo'))
                    .filter(no => no && no.trim() !== '')
            )];

            console.log('✅ 找到境外收发货人对应的备案号:', shipperRecordNos);
            return shipperRecordNos;
        } else {
            console.log('⚠️ 未找到境外收发货人对应信息:', foreignConsignee);
            return null;
        }
    } catch (error) {
        console.error('❌ 查询境外收发货人失败:', error);
        return null;
    }
}

// 从HS编码管理中查询监管类别名称（支持多个匹配）
async function getSupervisionCategoryByHSCode(hsCode) {
    try {
        console.log('🔍 查询HS编码:', hsCode);

        // 查询LeanCloud中的HS_Code_Base表，获取所有匹配的记录
        const query = new AV.Query('HS_Code_Base');
        query.equalTo('hsCode', hsCode);
        query.limit(100); // 允许查询多个匹配结果

        const results = await query.find();

        if (results.length > 0) {
            // 提取所有的监管类别名称（去重）
            const supervisionCategories = [...new Set(
                results
                    .map(r => r.get('supervisionCategory'))
                    .filter(cat => cat && cat.trim() !== '')
            )];

            console.log('✅ 找到HS编码对应监管类别:', supervisionCategories);
            return supervisionCategories;
        } else {
            console.log('⚠️ 未找到HS编码对应信息:', hsCode);
            return null;
        }
    } catch (error) {
        console.error('❌ 查询HS编码失败:', error);
        return null;
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

        // 🔥 修改：如果是HS编码字段，从LeanCloud动态查询监管类别名称
        if (fieldName === 'hsCode' && value && value.trim() !== '') {
            console.log('🔍 检测到HS编码输入:', value);

            // 显示加载状态
            const supervisionCategoryField = document.querySelector(`input.item-field[data-field="supervisionCategory"][data-item="${itemNo}"]`);

            if (supervisionCategoryField) {
                supervisionCategoryField.style.backgroundColor = '#fff3cd';
                supervisionCategoryField.placeholder = '正在查询...';
            }

            // 从LeanCloud动态查询HS编码信息
            try {
                const supervisionCategories = await getSupervisionCategoryByHSCode(value.trim());

                if (supervisionCategories && supervisionCategories.length > 0) {
                    console.log('✅ 查询到的监管类别:', supervisionCategories);

                    if (supervisionCategories.length === 1) {
                        // 只有一个匹配结果，直接填充
                        item.supervisionCategory = supervisionCategories[0];
                        console.log('✅ 已更新数据中的监管类别名称为:', supervisionCategories[0]);

                        // 更新界面上的输入框
                        if (supervisionCategoryField) {
                            supervisionCategoryField.value = supervisionCategories[0];
                            supervisionCategoryField.placeholder = '监管类别名称';
                            supervisionCategoryField.style.backgroundColor = '#d4edda';
                            setTimeout(() => {
                                supervisionCategoryField.style.backgroundColor = '';
                            }, 1500);
                        }

                        // 显示成功通知
                        showHSCodeMatchNotification(value.trim(), supervisionCategories[0], true);
                    } else {
                        // 多个匹配结果，显示选择下拉框
                        showSupervisionCategorySelector(itemNo, supervisionCategories, supervisionCategoryField);
                        // 显示提示通知
                        showHSCodeMatchNotification(value.trim(), supervisionCategories, 'multiple');
                    }
                } else {
                    // 未找到对应的HS编码信息
                    console.log('⚠️ 未找到对应的HS编码信息');

                    // 更新界面反馈
                    if (supervisionCategoryField) {
                        supervisionCategoryField.placeholder = '未找到对应信息';
                        supervisionCategoryField.style.backgroundColor = '#f8d7da';
                        setTimeout(() => {
                            supervisionCategoryField.style.backgroundColor = '';
                            supervisionCategoryField.placeholder = '监管类别名称';
                        }, 2000);
                    }

                    // 显示未找到映射的提示
                    showHSCodeMatchNotification(value.trim(), null, false);
                }
            } catch (error) {
                console.error('❌ 查询HS编码信息时发生错误:', error);

                // 更新界面反馈
                if (supervisionCategoryField) {
                    supervisionCategoryField.placeholder = '查询失败';
                    supervisionCategoryField.style.backgroundColor = '#f8d7da';
                    setTimeout(() => {
                        supervisionCategoryField.style.backgroundColor = '';
                        supervisionCategoryField.placeholder = '监管类别名称';
                    }, 2000);
                }

                // 显示错误提示
                showHSCodeMatchNotification(value.trim(), null, 'error');
            }
        }
        
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
                        // 未找到对应的厂号，显示快捷添加按钮
                        console.log('⚠️ 未找到对应的厂号，显示快捷添加按钮');

                        // 更新界面反馈
                        if (factoryNoField) {
                            factoryNoField.placeholder = '未找到对应厂号';
                            factoryNoField.style.backgroundColor = '#fff3cd';

                            // 添加快捷添加按钮
                            showQuickAddFactoryNoButton(itemNo, value.trim(), factoryNoField);

                            // 延迟恢复背景色
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

// 显示监管类别选择下拉框
function showSupervisionCategorySelector(itemNo, supervisionCategories, targetField) {
    // 移除已存在的选择框
    const existingSelector = document.getElementById('supervisionCategorySelector');
    if (existingSelector) {
        existingSelector.remove();
    }

    // 计算下拉框位置
    const fieldRect = targetField.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // 创建选择框容器
    const selector = document.createElement('div');
    selector.id = 'supervisionCategorySelector';
    selector.style.cssText = `
        position: absolute;
        top: ${fieldRect.bottom + scrollTop + 5}px;
        left: ${fieldRect.left + scrollLeft}px;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        min-width: 250px;
        max-height: 300px;
        overflow-y: auto;
        animation: slideDown 0.2s ease-out;
    `;

    // 创建标题
    const title = document.createElement('div');
    title.style.cssText = `
        padding: 10px 15px;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        font-weight: 600;
        color: #495057;
        font-size: 13px;
    `;
    title.textContent = `找到 ${supervisionCategories.length} 个监管类别，请选择：`;
    selector.appendChild(title);

    // 创建选项列表
    const list = document.createElement('div');
    list.style.cssText = 'padding: 5px 0;';

    supervisionCategories.forEach((category, index) => {
        const option = document.createElement('div');
        option.style.cssText = `
            padding: 10px 15px;
            cursor: pointer;
            font-size: 13px;
            color: #495057;
            border-bottom: 1px solid #f1f3f5;
            transition: background 0.2s;
        `;
        option.textContent = category;

        option.addEventListener('mouseenter', function() {
            this.style.background = '#f8f9fa';
        });

        option.addEventListener('mouseleave', function() {
            this.style.background = 'white';
        });

        option.addEventListener('click', function() {
            // 更新数据
            const item = currentCustomsItems.find(item => item.itemNo === itemNo);
            if (item) {
                item.supervisionCategory = category;
            }

            // 更新界面
            targetField.value = category;
            targetField.placeholder = '监管类别名称';
            targetField.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                targetField.style.backgroundColor = '';
            }, 1500);

            // 移除选择框
            selector.remove();

            console.log('✅ 用户选择了监管类别:', category);
        });

        list.appendChild(option);
    });

    selector.appendChild(list);

    // 添加取消按钮
    const cancelBtn = document.createElement('div');
    cancelBtn.style.cssText = `
        padding: 10px 15px;
        text-align: center;
        cursor: pointer;
        color: #6c757d;
        font-size: 12px;
        border-top: 1px solid #dee2e6;
        transition: color 0.2s;
    `;
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('mouseenter', function() {
        this.style.color = '#495057';
    });
    cancelBtn.addEventListener('mouseleave', function() {
        this.style.color = '#6c757d';
    });
    cancelBtn.addEventListener('click', function() {
        selector.remove();
        targetField.style.backgroundColor = '';
        targetField.placeholder = '监管类别名称';
    });

    selector.appendChild(cancelBtn);

    document.body.appendChild(selector);

    // 点击其他区域关闭选择框
    setTimeout(() => {
        document.addEventListener('click', closeSelectorHandler);
    }, 100);

    function closeSelectorHandler(e) {
        if (!selector.contains(e.target) && e.target !== targetField) {
            selector.remove();
            targetField.style.backgroundColor = '';
            targetField.placeholder = '监管类别名称';
            document.removeEventListener('click', closeSelectorHandler);
        }
    }
}

// 显示HS编码匹配通知
function showHSCodeMatchNotification(hsCode, hsCodeInfo, status) {
    // 移除现有通知
    const existingNotifications = document.querySelectorAll('.hscode-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = 'hscode-notification';
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
        // 成功找到HS编码信息（单个匹配）
        notification.style.background = '#28a745';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>✅ HS编码匹配成功</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>HS编码: <strong>${hsCode}</strong></div>
                <div>监管类别: <strong>${hsCodeInfo}</strong></div>
            </div>
        `;
        console.log(`🎉 HS编码 ${hsCode} 自动匹配成功`);

        // 3秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

    } else if (status === 'multiple') {
        // 找到多个匹配结果
        notification.style.background = '#17a2b8';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>📋 找到多个监管类别</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>HS编码: <strong>${hsCode}</strong></div>
                <div>共找到 <strong>${hsCodeInfo.length}</strong> 个监管类别</div>
                <div style="margin-top: 5px;">请从下拉列表中选择</div>
            </div>
        `;
        console.log(`📋 HS编码 ${hsCode} 找到 ${hsCodeInfo.length} 个监管类别`);

        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);

    } else if (status === 'error') {
        // 查询出错
        notification.style.background = '#dc3545';
        notification.style.color = 'white';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>❌ 查询失败</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>HS编码: ${hsCode}</div>
                <div>网络错误或服务异常，请稍后重试</div>
            </div>
        `;
        console.log(`❌ HS编码 ${hsCode} 查询失败`);

        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);

    } else {
        // 未找到HS编码信息
        notification.style.background = '#ffc107';
        notification.style.color = '#856404';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <strong>⚠️ 未找到HS编码信息</strong>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
                <div>HS编码: <strong>${hsCode}</strong></div>
                <div>请手动输入信息或联系管理员</div>
            </div>
        `;
        console.log(`⚠️ HS编码 ${hsCode} 未找到对应信息`);

        // 4秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    document.body.appendChild(notification);
}

// 显示快捷添加厂号按钮
function showQuickAddFactoryNoButton(itemNo, certificate519, targetField) {
    // 移除已存在的按钮
    const existingBtn = document.getElementById('quickAddFactoryNoBtn');
    if (existingBtn) {
        existingBtn.remove();
    }

    // 获取厂号输入框的父元素
    const parentDiv = targetField.closest('.col-md-3');
    if (!parentDiv) return;

    // 创建按钮容器
    const btnContainer = document.createElement('div');
    btnContainer.id = 'quickAddFactoryNoBtn';
    btnContainer.className = 'mt-1';
    btnContainer.style.cssText = `
        animation: slideDown 0.3s ease-out;
    `;

    // 创建按钮
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-primary w-100';
    btn.innerHTML = '<i class="fas fa-plus"></i> 快捷添加厂号';
    btn.style.cssText = `
        font-size: 12px;
        padding: 4px 8px;
    `;

    // 点击事件
    btn.addEventListener('click', function() {
        showQuickAddFactoryNoModal(itemNo, certificate519, targetField);
    });

    btnContainer.appendChild(btn);
    parentDiv.appendChild(btnContainer);

    // 3秒后自动移除（除非用户点击）
    setTimeout(() => {
        if (btnContainer.parentElement) {
            btnContainer.style.opacity = '0';
            btnContainer.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (btnContainer.parentElement) {
                    btnContainer.remove();
                }
            }, 300);
        }
    }, 5000);
}

// 显示快捷添加厂号模态框
function showQuickAddFactoryNoModal(itemNo, certificate519, targetField) {
    // 移除已存在的模态框
    const existingModal = document.getElementById('quickAddFactoryNoModal');
    if (existingModal) {
        existingModal.remove();
    }

    // 创建模态框HTML
    const modalHTML = `
        <div class="modal fade" id="quickAddFactoryNoModal" tabindex="-1">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-plus-circle"></i> 快捷添加厂号
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="quickAddFactoryNoForm">
                            <div class="mb-3">
                                <label class="form-label">519证书号</label>
                                <input type="text" class="form-control" id="quickCertificate519" value="${certificate519}" readonly style="background-color: #f8f9fa;">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">厂号 *</label>
                                <input type="text" class="form-control" id="quickFactoryNo" placeholder="请输入厂号" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">国家</label>
                                <input type="text" class="form-control" id="quickCountry" placeholder="请输入国家（可选）">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="quickSaveBtn">
                            <i class="fas fa-save"></i> 保存并填充
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 获取模态框元素
    const modalElement = document.getElementById('quickAddFactoryNoModal');

    // 绑定保存按钮事件
    const quickSaveBtn = document.getElementById('quickSaveBtn');
    quickSaveBtn.onclick = async function() {
        await handleQuickSaveFactoryNo(itemNo, certificate519, targetField);
    };

    // 显示模态框
    const modal = new bootstrap.Modal(modalElement);

    // 模态框关闭时清理
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.remove();
    });

    modal.show();

    // 自动聚焦到厂号输入框
    setTimeout(() => {
        document.getElementById('quickFactoryNo').focus();
    }, 300);
}

// 处理快捷保存厂号
async function handleQuickSaveFactoryNo(itemNo, certificate519, targetField) {
    try {
        // 获取表单数据
        const factoryNo = document.getElementById('quickFactoryNo').value.trim();
        const country = document.getElementById('quickCountry').value.trim();

        // 验证
        if (!factoryNo) {
            alert('厂号不能为空');
            return;
        }

        // 检查是否已存在
        const query = new AV.Query('ciferquery519');
        query.equalTo('certificate519', certificate519);
        query.equalTo('factoryNo', factoryNo);
        const existing = await query.first();

        if (existing) {
            alert('该519证书号和厂号已存在');
            return;
        }

        // 保存到LeanCloud
        const cert519Obj = new AV.Object('ciferquery519');
        cert519Obj.set('certificate519', certificate519);
        cert519Obj.set('factoryNo', factoryNo);
        cert519Obj.set('country', country);
        await cert519Obj.save();

        console.log('✅ 厂号保存成功:', { certificate519, factoryNo, country });

        // 更新当前项数据
        const item = currentCustomsItems.find(item => item.itemNo === itemNo);
        if (item) {
            item.factoryNo = factoryNo;
        }

        // 更新界面
        targetField.value = factoryNo;
        targetField.placeholder = '厂号';
        targetField.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            targetField.style.backgroundColor = '';
        }, 1500);

        // 移除快捷添加按钮
        const existingBtn = document.getElementById('quickAddFactoryNoBtn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // 关闭模态框
        const modalElement = document.getElementById('quickAddFactoryNoModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }

        // 显示成功通知
        alert('厂号保存成功！已同步到519厂号管理');

        // 刷新519厂号管理数据（如果页面打开）
        if (typeof loadCert519Data === 'function') {
            await loadCert519Data();
        }

    } catch (error) {
        console.error('❌ 保存厂号失败:', error);
        alert('保存失败: ' + error.message);
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
        
        // 重新加载数据（无查询条件，加载所有数据）
        console.log('🔄 重新加载报关数据...');
        await loadCustomsData({});
        
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
        // 移除旧的事件监听器避免重复绑定
        searchCustomsBtn.onclick = null;
        searchCustomsBtn.addEventListener('click', async function() {
            console.log('🔘 查询按钮被点击');
            await applyCustomsFilters();
            // loadCustomsData 内部已经调用了 renderCustomsTable 和 updateCustomsPagination
        });
        console.log('✅ 绑定查询按钮事件成功');
    } else {
        console.error('❌ 找不到查询按钮 #searchCustoms');
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
window.manualLoadCustomsData = function(searchConditions = {}) {
    console.log('🔧 手动触发报关数据加载...', searchConditions);
    loadCustomsData(searchConditions);
};

// 导出函数
window.loadCustomsData = loadCustomsData;
window.renderCustomsTable = renderCustomsTable;
window.showCustomsDataModal = showCustomsDataModal;
window.addCustomsItem = addCustomsItem;
window.removeCustomsItem = removeCustomsItem;
window.updateCustomsItemField = updateCustomsItemField;
window.renderCustomsItems = renderCustomsItems;
window.bindForeignConsigneeInputEvent = bindForeignConsigneeInputEvent;
window.handleForeignConsigneeInput = handleForeignConsigneeInput;

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
    console.log('📢 收到报关页面初始化事件（来自文件末尾监听器）');
    // 🔥 修改：初始化时不加载数据，等待用户点击查询
    const table = document.getElementById('customsTable');
    if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="33" class="loading">请输入查询条件后点击查询按钮</td></tr>';
        }
    }
    console.log('✅ 报关页面已就绪，请输入查询条件');
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