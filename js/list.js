// 账单管理功能模块
let billsData = [];
let filteredBillsData = [];
let customsDataForBilling = [];
let selectedItemsForBill = [];
let billsItemsPerPage = 10;
let billsCurrentPageIndex = 1;
let billsTotalPages = 1;
let customFees = [];
let currentCustomFeeId = 3; // 从3开始，因为1和2已经被其他费用1和2占用

// 搜索相关变量
let searchBillQuery = '';
let searchBillType = 'containerNo';

// 加载账单数据
async function loadListData() {
    try {
        const tbody = document.querySelector('#billsTable tbody');
        if (!tbody) {
            console.warn('账单管理表格元素尚未加载');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="10" class="loading">正在加载数据...</td></tr>';
        
        // 检查表是否存在
        const tableExists = await checkTableExists('Bills');
        if (!tableExists) {
            tbody.innerHTML = '<tr><td colspan="10" class="no-data">账单表不存在，请先在LeanCloud后台创建Bills表</td></tr>';
            updateStatistics();
            return;
        }
        
        const query = new AV.Query('Bills');
        query.descending('billDate');
        const results = await query.find();
        
        billsData = results.map(item => {
            const data = item.toJSON();
            return {
                id: data.objectId,
                billNo: data.billNo || generateBillNo(),
                billDate: data.billDate || '',
                companyName: data.companyName || '',
                containerNo: data.containerNo || '',
                customsNo: data.customsNo || '',
                billNoSearch: data.billNoSearch || '',
                domesticConsignee: data.domesticConsignee || '',
                totalAmount: data.totalAmount || 0,
                currency: data.currency || 'CNY',
                billStatus: data.billStatus || '未确认',
                paymentDate: data.paymentDate || '',
                payee: data.payee || '',
                remark: data.remark || '',
                billItems: data.billItems || [],
                attachments: data.attachments || [],
                customFees: data.customFees || [],
                leanCloudObject: item
            };
        });
        
        filteredBillsData = [...billsData];
        applyBillsFilters();
        billsCurrentPageIndex = 1;
        updateBillsPagination();
        renderBillsTable();
        updateStatistics();
        
    } catch (error) {
        console.error('加载账单数据失败:', error);
        const tbody = document.querySelector('#billsTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" class="no-data">数据加载失败，请刷新页面重试</td></tr>';
        }
        updateStatistics();
    }
}

// 生成账单编号
function generateBillNo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BILL${year}${month}${day}${random}`;
}

// 更新统计信息
function updateStatistics() {
    const totalAmount = filteredBillsData.reduce((sum, bill) => sum + (parseFloat(bill.totalAmount) || 0), 0);
    const unconfirmedAmount = filteredBillsData
        .filter(bill => bill.billStatus === '未确认')
        .reduce((sum, bill) => sum + (parseFloat(bill.totalAmount) || 0), 0);
    const confirmedAmount = filteredBillsData
        .filter(bill => bill.billStatus === '已确认')
        .reduce((sum, bill) => sum + (parseFloat(bill.totalAmount) || 0), 0);
    
    document.getElementById('totalAmount').textContent = `¥${totalAmount.toFixed(2)}`;
    document.getElementById('unconfirmedAmount').textContent = `¥${unconfirmedAmount.toFixed(2)}`;
    document.getElementById('confirmedAmount').textContent = `¥${confirmedAmount.toFixed(2)}`;
    document.getElementById('billCount').textContent = filteredBillsData.length;
}

// 应用账单筛选条件
function applyBillsFilters() {
    const billDateRange = document.getElementById('billDateRange').value;
    const billStatus = document.getElementById('billStatusFilter').value;
    
    filteredBillsData = billsData.filter(item => {
        let match = true;
        
        if (billStatus && billStatus.trim() !== '') {
            if (item.billStatus !== billStatus) {
                match = false;
            }
        }
        
        if (billDateRange && billDateRange.trim() !== '') {
            const separator = billDateRange.includes('至') ? '至' : 'to';
            const dates = billDateRange.split(separator).map(date => date.trim());
            
            if (dates.length === 2) {
                const startDateStr = dates[0];
                const endDateStr = dates[1];
                
                if (!item.billDate || item.billDate.trim() === '') {
                    match = false;
                } else {
                    const itemDate = new Date(item.billDate);
                    const startDate = new Date(startDateStr);
                    const endDate = new Date(endDateStr);
                    
                    if (isNaN(itemDate.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
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
        }
        
        return match;
    });
}

// 渲染账单表格
function renderBillsTable() {
    const tbody = document.querySelector('#billsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredBillsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="10" class="text-center no-data">没有找到匹配的数据</td>`;
        tbody.appendChild(row);
        return;
    }
    
    const startIndex = (billsCurrentPageIndex - 1) * billsItemsPerPage;
    const endIndex = Math.min(startIndex + billsItemsPerPage, filteredBillsData.length);
    const currentPageData = filteredBillsData.slice(startIndex, endIndex);
    
    currentPageData.forEach((item, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index;
        
        // 根据状态设置行样式
        let rowClass = '';
        if (item.billStatus === '未确认') {
            rowClass = 'table-warning';
        } else if (item.billStatus === '已确认') {
            rowClass = 'table-info';
        } else if (item.billStatus === '已收款') {
            rowClass = 'table-success';
        }
        
        row.innerHTML = `
            <td>${globalIndex + 1}</td>
            <td>${item.billNo}</td>
            <td>${item.billDate}</td>
            <td>${item.companyName}</td>
            <td class="fw-bold">${formatCurrency(item.totalAmount || 0, item.currency)}</td>
            <td>${item.currency}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(item.billStatus)}">${item.billStatus}</span>
            </td>
            <td>${item.paymentDate || '-'}</td>
            <td>${item.remark || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-bill" data-id="${item.id}">
                    <i class="fas fa-eye"></i> 查看
                </button>
                ${item.billStatus !== '已收款' ? `
                <button class="btn btn-sm btn-outline-danger delete-bill" data-id="${item.id}">
                    <i class="fas fa-trash"></i> 删除
                </button>
                ` : ''}
            </td>
        `;
        
        if (rowClass) {
            row.className = rowClass;
        }
        
        tbody.appendChild(row);
    });
    
    bindBillsEvents();
    updateBillsPaginationInfo();
}

// 格式化货币显示
function formatCurrency(amount, currency) {
    const numAmount = parseFloat(amount) || 0;
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${numAmount.toFixed(2)}`;
}

// 获取货币符号
function getCurrencySymbol(currency) {
    const symbols = {
        'CNY': '¥',
        'USD': '$',
        'EUR': '€',
        'JPY': '¥'
    };
    return symbols[currency] || currency;
}

// 获取状态标签样式
function getStatusBadgeClass(status) {
    const classes = {
        '未确认': 'bg-warning',
        '已确认': 'bg-info',
        '已收款': 'bg-success'
    };
    return classes[status] || 'bg-secondary';
}

// 绑定账单事件
function bindBillsEvents() {
    // 查看账单详情
    document.querySelectorAll('.view-bill').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            showBillDetail(id);
        });
    });
    
    // 删除账单
    document.querySelectorAll('.delete-bill').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await deleteBill(id);
        });
    });
}

// 显示生成账单模态框
function showGenerateBillModal() {
    // 清空表单
    const form = document.querySelector('#generateBillModal form');
    if (form) form.reset();
    
    // 初始化年份和月份选择
    initYearMonthSelectors();
    
    // 清空选择的数据
    selectedItemsForBill = [];
    customsDataForBilling = [];
    customFees = [];
    currentCustomFeeId = 3;
    
    // 清空搜索条件
    searchBillQuery = '';
    searchBillType = 'containerNo';
    
    // 清空表格
    document.getElementById('customsDataBody').innerHTML = '';
    document.getElementById('billPreviewBody').innerHTML = '';
    
    // 重置费用输入
    document.getElementById('customsFee').value = '0';
    document.getElementById('inspectionFee').value = '0';
    document.getElementById('documentFee').value = '0';
    document.getElementById('otherFee1').value = '0';
    document.getElementById('otherFee2').value = '0';
    document.getElementById('otherFee1Name').value = '其他费用1';
    document.getElementById('otherFee2Name').value = '其他费用2';
    
    // 清空自定义费用区域
    document.getElementById('customFeesContainer').innerHTML = '';
    
    // 更新其他费用表头
    document.getElementById('otherFee1Header').textContent = '其他费用1';
    document.getElementById('otherFee2Header').textContent = '其他费用2';
    document.getElementById('otherFee3Header').style.display = 'none';
    document.getElementById('otherFee4Header').style.display = 'none';
    document.getElementById('totalOtherFee3').style.display = 'none';
    document.getElementById('totalOtherFee4').style.display = 'none';
    
    // 重置总计
    document.getElementById('totalCustomsFee').textContent = '0.00';
    document.getElementById('totalInspectionFee').textContent = '0.00';
    document.getElementById('totalDocumentFee').textContent = '0.00';
    document.getElementById('totalOtherFee1').textContent = '0.00';
    document.getElementById('totalOtherFee2').textContent = '0.00';
    document.getElementById('grandTotal').textContent = '0.00';
    
    const modal = new bootstrap.Modal(document.getElementById('generateBillModal'));
    modal.show();
}

// 初始化年份和月份选择器
function initYearMonthSelectors() {
    const yearSelect = document.getElementById('billYear');
    const monthSelect = document.getElementById('billMonth');
    
    // 清空现有选项
    yearSelect.innerHTML = '<option value="">选择年份</option>';
    monthSelect.innerHTML = '<option value="">选择月份</option>';
    
    // 添加年份选项（当前年份及前后5年）
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
    
    // 添加月份选项
    for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month + '月';
        if (month === new Date().getMonth() + 1) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    }
}

// 查询报关数据
async function searchCustomsData() {
    const companyName = document.getElementById('companyName').value;
    const year = document.getElementById('billYear').value;
    const month = document.getElementById('billMonth').value;
    
    if (!companyName || !year || !month) {
        alert('请填写公司名称、年份和月份');
        return;
    }
    
    try {
        // 查询报关数据 - 按申报日期筛选
        const query = new AV.Query('Tracking');
        
        // 添加查询条件：按申报日期筛选
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        query.greaterThanOrEqualTo('declareDate', startDate.toISOString().split('T')[0]);
        query.lessThanOrEqualTo('declareDate', endDate.toISOString().split('T')[0]);
        
        query.ascending('declareDate');
        const results = await query.find();
        
        customsDataForBilling = results.map(item => {
            const data = item.toJSON();
            return {
                id: data.objectId,
                arrivalDate: data.arrivalDate || '',
                declareDate: data.declareDate || '',
                billNo: data.billNo || '',
                containerNo: data.containerNo || '',
                customsNo: data.customsNo || '',
                domesticConsignee: data.domesticConsignee || '',
                consumptionUnit: data.consumptionUnit || '',
                country: data.country || '',
                productName: data.productName || '',
                selected: false,
                leanCloudObject: item
            };
        });
        
        // 过滤掉已经在账单中的数据
        await filterUsedCustomsData();
        
        // 应用查询条件
        applyCustomsDataFilters();
        
        // 渲染报关数据表格
        renderCustomsDataTable();
        
    } catch (error) {
        console.error('查询报关数据失败:', error);
        alert('查询报关数据失败: ' + error.message);
    }
}

// 过滤掉已经在账单中使用的报关数据
async function filterUsedCustomsData() {
    try {
        // 查询已生成账单的数据
        const billQuery = new AV.Query('Bills');
        const billResults = await billQuery.find();
        
        const usedIds = new Set();
        billResults.forEach(bill => {
            const billData = bill.toJSON();
            if (billData.billItems) {
                billData.billItems.forEach(item => {
                    if (item.customsDataId) {
                        usedIds.add(item.customsDataId);
                    }
                });
            }
        });
        
        // 过滤掉已使用的数据
        customsDataForBilling = customsDataForBilling.filter(item => !usedIds.has(item.id));
        
    } catch (error) {
        console.error('过滤已使用数据失败:', error);
    }
}

// 应用报关数据筛选条件
function applyCustomsDataFilters() {
    const containerNo = document.getElementById('searchContainerNo').value;
    const billNo = document.getElementById('searchBillNo').value;
    const customsNo = document.getElementById('searchCustomsNo').value;
    
    if (containerNo || billNo || customsNo) {
        customsDataForBilling = customsDataForBilling.filter(item => {
            let match = true;
            
            if (containerNo && containerNo.trim() !== '') {
                if (!item.containerNo || !item.containerNo.includes(containerNo)) {
                    match = false;
                }
            }
            
            if (billNo && billNo.trim() !== '') {
                if (!item.billNo || !item.billNo.includes(billNo)) {
                    match = false;
                }
            }
            
            if (customsNo && customsNo.trim() !== '') {
                if (!item.customsNo || !item.customsNo.includes(customsNo)) {
                    match = false;
                }
            }
            
            return match;
        });
    }
}

// 渲染报关数据表格
function renderCustomsDataTable() {
    const tbody = document.getElementById('customsDataBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (customsDataForBilling.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">没有找到报关数据</td></tr>';
        return;
    }
    
    customsDataForBilling.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="item-checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}>
            </td>
            <td>${index + 1}</td>
            <td>${item.arrivalDate}</td>
            <td>${item.declareDate}</td>
            <td>${item.billNo}</td>
            <td>${item.containerNo}</td>
            <td>${item.customsNo}</td>
            <td>${item.domesticConsignee}</td>
            <td>${item.consumptionUnit}</td>
            <td>${item.country}</td>
            <td>${item.productName}</td>
        `;
        tbody.appendChild(row);
    });
    
    // 绑定复选框事件
    bindCustomsDataCheckboxes();
}

// 绑定报关数据复选框事件
function bindCustomsDataCheckboxes() {
    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const id = this.getAttribute('data-id');
            const item = customsDataForBilling.find(item => item.id === id);
            if (item) {
                item.selected = this.checked;
            }
            
            // 更新全选状态
            updateSelectAllCheckbox();
            
            // 更新已选择项目
            selectedItemsForBill = customsDataForBilling.filter(item => item.selected);
        });
    });
    
    // 全选复选框
    const selectAllCheckbox = document.getElementById('selectAllItems');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.item-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
                const id = checkbox.getAttribute('data-id');
                const item = customsDataForBilling.find(item => item.id === id);
                if (item) {
                    item.selected = this.checked;
                }
            });
            
            selectedItemsForBill = this.checked ? [...customsDataForBilling] : [];
        });
    }
}

// 更新全选复选框状态
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllItems');
    if (!selectAllCheckbox) return;
    
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const checkedCount = document.querySelectorAll('.item-checkbox:checked').length;
    
    selectAllCheckbox.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

// 添加自定义费用
function addCustomFee() {
    const customFeesContainer = document.getElementById('customFeesContainer');
    
    // 最多支持4个其他费用
    if (currentCustomFeeId > 4) {
        alert('最多只能添加4个其他费用');
        return;
    }
    
    const feeId = currentCustomFeeId;
    const feeHtml = `
        <div class="custom-fee-item" id="customFee${feeId}">
            <div class="row g-2">
                <div class="col-md-4">
                    <label class="form-label">其他费用${feeId}</label>
                    <div class="input-group">
                        <input type="text" class="form-control" id="otherFee${feeId}Name" placeholder="费用名称" value="其他费用${feeId}">
                        <input type="number" class="form-control fee-input" id="otherFee${feeId}" step="0.01" min="0" value="0">
                        <button class="btn btn-outline-danger" type="button" onclick="removeCustomFee(${feeId})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    customFeesContainer.insertAdjacentHTML('beforeend', feeHtml);
    
    // 添加到自定义费用数组
    customFees.push({
        id: feeId,
        name: `其他费用${feeId}`,
        value: 0
    });
    
    // 显示对应的表头
    document.getElementById(`otherFee${feeId}Header`).style.display = 'table-cell';
    document.getElementById(`totalOtherFee${feeId}`).style.display = 'table-cell';
    
    currentCustomFeeId++;
}

// 移除自定义费用
function removeCustomFee(feeId) {
    const feeElement = document.getElementById(`customFee${feeId}`);
    if (feeElement) {
        feeElement.remove();
        
        // 从自定义费用数组中移除
        customFees = customFees.filter(fee => fee.id !== feeId);
        
        // 隐藏对应的表头
        document.getElementById(`otherFee${feeId}Header`).style.display = 'none';
        document.getElementById(`totalOtherFee${feeId}`).style.display = 'none';
    }
}

// 应用费用到所有选中项 - 增强版本
function applyAllFees() {
    if (selectedItemsForBill.length === 0) {
        alert('请先选择报关数据');
        return;
    }
    
    // 获取费用设置
    const customsFee = parseFloat(document.getElementById('customsFee').value) || 0;
    const inspectionFee = parseFloat(document.getElementById('inspectionFee').value) || 0;
    const documentFee = parseFloat(document.getElementById('documentFee').value) || 0;
    const otherFee1 = parseFloat(document.getElementById('otherFee1').value) || 0;
    const otherFee2 = parseFloat(document.getElementById('otherFee2').value) || 0;
    
    // 获取自定义费用
    const customFeeValues = {};
    customFees.forEach(fee => {
        const feeValue = parseFloat(document.getElementById(`otherFee${fee.id}`).value) || 0;
        customFeeValues[fee.id] = feeValue;
    });
    
    // 应用到所有选中项
    selectedItemsForBill.forEach(item => {
        // 设置基础费用
        item.customsFee = customsFee;
        item.inspectionFee = inspectionFee;
        item.documentFee = documentFee;
        item.otherFee1 = otherFee1;
        item.otherFee2 = otherFee2;
        
        // 设置自定义费用
        customFees.forEach(fee => {
            item[`otherFee${fee.id}`] = customFeeValues[fee.id] || 0;
        });
    });
    
    // 触发预览更新
    previewBill();
    
    alert(`已成功将费用设置应用到 ${selectedItemsForBill.length} 个选中项`);
}

// 搜索账单预览数据
function searchBillPreview() {
    const query = document.getElementById('billPreviewSearch').value.trim();
    const searchType = document.getElementById('billPreviewSearchType').value;
    
    searchBillQuery = query;
    searchBillType = searchType;
    
    if (!query) {
        // 清空搜索，显示所有数据
        renderBillPreviewTable();
        return;
    }
    
    // 筛选数据
    const filteredItems = selectedItemsForBill.filter(item => {
        const searchField = item[searchType] || '';
        return searchField.toString().toLowerCase().includes(query.toLowerCase());
    });
    
    if (filteredItems.length === 0) {
        alert('未找到匹配的数据');
        return;
    }
    
    // 高亮显示匹配的数据
    highlightSearchResults(filteredItems);
}

// 高亮显示搜索结果
function highlightSearchResults(filteredItems) {
    const tbody = document.getElementById('billPreviewBody');
    const rows = tbody.querySelectorAll('tr');
    
    // 先移除所有高亮
    rows.forEach(row => {
        row.classList.remove('table-warning');
    });
    
    // 高亮匹配的行
    filteredItems.forEach(item => {
        const row = tbody.querySelector(`tr[data-id="${item.id}"]`);
        if (row) {
            row.classList.add('table-warning');
            
            // 滚动到第一个匹配项
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    alert(`找到 ${filteredItems.length} 条匹配数据`);
}

// 预览账单
function previewBill() {
    if (selectedItemsForBill.length === 0) {
        alert('请选择要生成账单的报关数据');
        return;
    }
    
    renderBillPreviewTable();
}

// 渲染账单预览表格 - 增强版本
function renderBillPreviewTable() {
    if (selectedItemsForBill.length === 0) {
        document.getElementById('billPreviewBody').innerHTML = '<tr><td colspan="15" class="text-center">请先选择报关数据</td></tr>';
        return;
    }
    
    // 获取费用设置
    const customsFee = parseFloat(document.getElementById('customsFee').value) || 0;
    const inspectionFee = parseFloat(document.getElementById('inspectionFee').value) || 0;
    const documentFee = parseFloat(document.getElementById('documentFee').value) || 0;
    const otherFee1 = parseFloat(document.getElementById('otherFee1').value) || 0;
    const otherFee2 = parseFloat(document.getElementById('otherFee2').value) || 0;
    
    // 获取其他费用名称
    const otherFee1Name = document.getElementById('otherFee1Name').value || '其他费用1';
    const otherFee2Name = document.getElementById('otherFee2Name').value || '其他费用2';
    
    // 获取自定义费用
    const customFeeValues = {};
    customFees.forEach(fee => {
        const feeValue = parseFloat(document.getElementById(`otherFee${fee.id}`).value) || 0;
        const feeName = document.getElementById(`otherFee${fee.id}Name`).value || `其他费用${fee.id}`;
        customFeeValues[fee.id] = {
            name: feeName,
            value: feeValue
        };
    });
    
    // 更新表头
    document.getElementById('otherFee1Header').textContent = otherFee1Name;
    document.getElementById('otherFee2Header').textContent = otherFee2Name;
    
    customFees.forEach(fee => {
        document.getElementById(`otherFee${fee.id}Header`).textContent = customFeeValues[fee.id].name;
    });
    
    // 渲染账单预览
    const tbody = document.getElementById('billPreviewBody');
    tbody.innerHTML = '';
    
    let totalCustomsFee = 0;
    let totalInspectionFee = 0;
    let totalDocumentFee = 0;
    let totalOtherFee1 = 0;
    let totalOtherFee2 = 0;
    let totalOtherFee3 = 0;
    let totalOtherFee4 = 0;
    let grandTotal = 0;
    
    selectedItemsForBill.forEach((item, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.id);
        
        // 使用预设费用或默认费用
        const itemCustomsFee = item.customsFee !== undefined ? item.customsFee : customsFee;
        const itemInspectionFee = item.inspectionFee !== undefined ? item.inspectionFee : inspectionFee;
        const itemDocumentFee = item.documentFee !== undefined ? item.documentFee : documentFee;
        const itemOtherFee1 = item.otherFee1 !== undefined ? item.otherFee1 : otherFee1;
        const itemOtherFee2 = item.otherFee2 !== undefined ? item.otherFee2 : otherFee2;
        
        // 计算自定义费用
        const itemCustomFees = {};
        let itemCustomFeesTotal = 0;
        customFees.forEach(fee => {
            itemCustomFees[fee.id] = item[`otherFee${fee.id}`] !== undefined ? item[`otherFee${fee.id}`] : customFeeValues[fee.id].value;
            itemCustomFeesTotal += itemCustomFees[fee.id];
        });
        
        const itemTotal = itemCustomsFee + itemInspectionFee + itemDocumentFee + itemOtherFee1 + itemOtherFee2 + itemCustomFeesTotal;
        
        // 累加总计
        totalCustomsFee += itemCustomsFee;
        totalInspectionFee += itemInspectionFee;
        totalDocumentFee += itemDocumentFee;
        totalOtherFee1 += itemOtherFee1;
        totalOtherFee2 += itemOtherFee2;
        
        customFees.forEach(fee => {
            if (fee.id === 3) totalOtherFee3 += itemCustomFees[fee.id] || 0;
            if (fee.id === 4) totalOtherFee4 += itemCustomFees[fee.id] || 0;
        });
        
        grandTotal += itemTotal;
        
        let customFeesHtml = '';
        customFees.forEach(fee => {
            customFeesHtml += `
                <td>
                    <input type="number" class="form-control form-control-sm fee-edit-input" 
                           data-id="${item.id}" data-fee="otherFee${fee.id}" 
                           value="${(itemCustomFees[fee.id] || 0).toFixed(2)}" step="0.01" min="0">
                </td>`;
        });
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.arrivalDate}</td>
            <td>${item.billNo}</td>
            <td>${item.containerNo}</td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" 
                       data-id="${item.id}" data-fee="customsFee" 
                       value="${itemCustomsFee.toFixed(2)}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" 
                       data-id="${item.id}" data-fee="inspectionFee" 
                       value="${itemInspectionFee.toFixed(2)}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" 
                       data-id="${item.id}" data-fee="documentFee" 
                       value="${itemDocumentFee.toFixed(2)}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" 
                       data-id="${item.id}" data-fee="otherFee1" 
                       value="${itemOtherFee1.toFixed(2)}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" 
                       data-id="${item.id}" data-fee="otherFee2" 
                       value="${itemOtherFee2.toFixed(2)}" step="0.01" min="0">
            </td>
            ${customFeesHtml}
            <td class="fw-bold">${itemTotal.toFixed(2)}</td>
            <td>
                <input type="text" class="form-control form-control-sm" placeholder="备注" 
                       data-id="${item.id}" value="${item.remark || ''}">
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // 更新总计行
    document.getElementById('totalCustomsFee').textContent = totalCustomsFee.toFixed(2);
    document.getElementById('totalInspectionFee').textContent = totalInspectionFee.toFixed(2);
    document.getElementById('totalDocumentFee').textContent = totalDocumentFee.toFixed(2);
    document.getElementById('totalOtherFee1').textContent = totalOtherFee1.toFixed(2);
    document.getElementById('totalOtherFee2').textContent = totalOtherFee2.toFixed(2);
    
    if (customFees.some(fee => fee.id === 3)) {
        document.getElementById('totalOtherFee3').textContent = totalOtherFee3.toFixed(2);
    }
    if (customFees.some(fee => fee.id === 4)) {
        document.getElementById('totalOtherFee4').textContent = totalOtherFee4.toFixed(2);
    }
    
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
    
    // 绑定费用编辑事件
    bindFeeEditEvents();
    
    // 启用PDF导出按钮
    document.getElementById('exportBillPdf').disabled = false;
    
    // 如果有搜索条件，高亮显示结果
    if (searchBillQuery) {
        const filteredItems = selectedItemsForBill.filter(item => {
            const searchField = item[searchBillType] || '';
            return searchField.toString().toLowerCase().includes(searchBillQuery.toLowerCase());
        });
        highlightSearchResults(filteredItems);
    }
}

// 绑定费用编辑事件
function bindFeeEditEvents() {
    document.querySelectorAll('.fee-edit-input').forEach(input => {
        input.addEventListener('change', function() {
            const itemId = this.getAttribute('data-id');
            const feeType = this.getAttribute('data-fee');
            const value = parseFloat(this.value) || 0;
            
            // 更新对应数据项的费用
            const item = selectedItemsForBill.find(item => item.id === itemId);
            if (item) {
                item[feeType] = value;
                
                // 重新计算并更新该行的总计
                updateRowTotal(itemId);
            }
        });
    });
    
    // 绑定备注输入事件
    document.querySelectorAll('input[placeholder="备注"]').forEach(input => {
        input.addEventListener('change', function() {
            const itemId = this.getAttribute('data-id');
            const value = this.value;
            
            const item = selectedItemsForBill.find(item => item.id === itemId);
            if (item) {
                item.remark = value;
            }
        });
    });
}

// 更新单行总计
function updateRowTotal(itemId) {
    const item = selectedItemsForBill.find(item => item.id === itemId);
    if (!item) return;
    
    // 计算该行总计
    let rowTotal = 0;
    
    // 基础费用
    rowTotal += item.customsFee || 0;
    rowTotal += item.inspectionFee || 0;
    rowTotal += item.documentFee || 0;
    rowTotal += item.otherFee1 || 0;
    rowTotal += item.otherFee2 || 0;
    
    // 自定义费用
    customFees.forEach(fee => {
        rowTotal += item[`otherFee${fee.id}`] || 0;
    });
    
    // 更新显示的总计
    const row = document.querySelector(`tr[data-id="${itemId}"]`);
    if (row) {
        const totalCell = row.querySelector('td.fw-bold');
        if (totalCell) {
            totalCell.textContent = rowTotal.toFixed(2);
        }
    }
    
    // 更新全局总计
    updateGrandTotal();
}

// 更新全局总计
function updateGrandTotal() {
    let totalCustomsFee = 0;
    let totalInspectionFee = 0;
    let totalDocumentFee = 0;
    let totalOtherFee1 = 0;
    let totalOtherFee2 = 0;
    let totalOtherFee3 = 0;
    let totalOtherFee4 = 0;
    let grandTotal = 0;
    
    selectedItemsForBill.forEach(item => {
        totalCustomsFee += item.customsFee || 0;
        totalInspectionFee += item.inspectionFee || 0;
        totalDocumentFee += item.documentFee || 0;
        totalOtherFee1 += item.otherFee1 || 0;
        totalOtherFee2 += item.otherFee2 || 0;
        
        customFees.forEach(fee => {
            if (fee.id === 3) totalOtherFee3 += item[`otherFee${fee.id}`] || 0;
            if (fee.id === 4) totalOtherFee4 += item[`otherFee${fee.id}`] || 0;
        });
        
        grandTotal += (item.customsFee || 0) + (item.inspectionFee || 0) + (item.documentFee || 0) + 
                     (item.otherFee1 || 0) + (item.otherFee2 || 0);
        
        customFees.forEach(fee => {
            grandTotal += item[`otherFee${fee.id}`] || 0;
        });
    });
    
    // 更新总计显示
    document.getElementById('totalCustomsFee').textContent = totalCustomsFee.toFixed(2);
    document.getElementById('totalInspectionFee').textContent = totalInspectionFee.toFixed(2);
    document.getElementById('totalDocumentFee').textContent = totalDocumentFee.toFixed(2);
    document.getElementById('totalOtherFee1').textContent = totalOtherFee1.toFixed(2);
    document.getElementById('totalOtherFee2').textContent = totalOtherFee2.toFixed(2);
    
    if (customFees.some(fee => fee.id === 3)) {
        document.getElementById('totalOtherFee3').textContent = totalOtherFee3.toFixed(2);
    }
    if (customFees.some(fee => fee.id === 4)) {
        document.getElementById('totalOtherFee4').textContent = totalOtherFee4.toFixed(2);
    }
    
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
}

// 导出账单Excel - 严格按照模板格式
function exportBillExcel() {
    if (selectedItemsForBill.length === 0) {
        alert('请先选择报关数据并生成预览');
        return;
    }

    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 获取费用设置
        const customsFee = parseFloat(document.getElementById('customsFee').value) || 0;
        const inspectionFee = parseFloat(document.getElementById('inspectionFee').value) || 0;
        const documentFee = parseFloat(document.getElementById('documentFee').value) || 0;
        const otherFee1 = parseFloat(document.getElementById('otherFee1').value) || 0;
        const otherFee2 = parseFloat(document.getElementById('otherFee2').value) || 0;
        
        // 获取其他费用名称
        const otherFee1Name = document.getElementById('otherFee1Name').value || '其他费用1';
        const otherFee2Name = document.getElementById('otherFee2Name').value || '其他费用2';
        
        // 获取自定义费用
        const customFeeValues = {};
        customFees.forEach(fee => {
            const feeValue = parseFloat(document.getElementById(`otherFee${fee.id}`).value) || 0;
            const feeName = document.getElementById(`otherFee${fee.id}Name`).value || `其他费用${fee.id}`;
            customFeeValues[fee.id] = {
                name: feeName,
                value: feeValue
            };
        });

        // 准备数据
        const companyName = document.getElementById('companyName').value;
        const year = document.getElementById('billYear').value;
        const month = document.getElementById('billMonth').value;
        
        // 创建标题行 - 第一行：合并单元格
        const titleRow = [`${companyName}    ${year}年${month}月报关费`];
        
        // 创建表头 - 第二行
        const headers = ['序号', '到港时间', '提单号', '柜号', '报关费', '查验服务费', '代理换单费', otherFee1Name, otherFee2Name];
        
        // 添加自定义费用表头
        customFees.forEach(fee => {
            headers.push(customFeeValues[fee.id].name);
        });
        
        headers.push('合计', '备注');
        
        // 创建数据行
        const dataRows = [];
        let totalCustomsFee = 0;
        let totalInspectionFee = 0;
        let totalDocumentFee = 0;
        let totalOtherFee1 = 0;
        let totalOtherFee2 = 0;
        let totalOtherFee3 = 0;
        let totalOtherFee4 = 0;
        let grandTotal = 0;
        
        selectedItemsForBill.forEach((item, index) => {
            // 使用实际设置的费用，而不是默认费用
            const itemCustomsFee = item.customsFee !== undefined ? item.customsFee : customsFee;
            const itemInspectionFee = item.inspectionFee !== undefined ? item.inspectionFee : inspectionFee;
            const itemDocumentFee = item.documentFee !== undefined ? item.documentFee : documentFee;
            const itemOtherFee1 = item.otherFee1 !== undefined ? item.otherFee1 : otherFee1;
            const itemOtherFee2 = item.otherFee2 !== undefined ? item.otherFee2 : otherFee2;
            
            // 计算自定义费用
            const itemCustomFees = {};
            let itemCustomFeesTotal = 0;
            customFees.forEach(fee => {
                itemCustomFees[fee.id] = item[`otherFee${fee.id}`] !== undefined ? item[`otherFee${fee.id}`] : customFeeValues[fee.id].value;
                itemCustomFeesTotal += itemCustomFees[fee.id];
            });
            
            const itemTotal = itemCustomsFee + itemInspectionFee + itemDocumentFee + itemOtherFee1 + itemOtherFee2 + itemCustomFeesTotal;
            
            // 累加总计
            totalCustomsFee += itemCustomsFee;
            totalInspectionFee += itemInspectionFee;
            totalDocumentFee += itemDocumentFee;
            totalOtherFee1 += itemOtherFee1;
            totalOtherFee2 += itemOtherFee2;
            
            customFees.forEach(fee => {
                if (fee.id === 3) totalOtherFee3 += itemCustomFees[fee.id] || 0;
                if (fee.id === 4) totalOtherFee4 += itemCustomFees[fee.id] || 0;
            });
            
            grandTotal += itemTotal;
            
            const row = [
                index + 1,
                item.arrivalDate,
                item.billNo,
                item.containerNo,
                itemCustomsFee,
                itemInspectionFee,
                itemDocumentFee,
                itemOtherFee1,
                itemOtherFee2
            ];
            
            // 添加自定义费用列
            customFees.forEach(fee => {
                row.push(itemCustomFees[fee.id] || 0);
            });
            
            row.push(itemTotal, item.remark || '');
            
            dataRows.push(row);
        });
        
        // 创建总计行
        const totalRow = ['合计', '', '', '', totalCustomsFee, totalInspectionFee, totalDocumentFee, totalOtherFee1, totalOtherFee2];
        
        // 添加自定义费用总计
        customFees.forEach(fee => {
            if (fee.id === 3) totalRow.push(totalOtherFee3);
            if (fee.id === 4) totalRow.push(totalOtherFee4);
        });
        
        totalRow.push(grandTotal, '');
        
        // 创建备注行
        const remarkRow = ['备注：如冷库根据本模板提供每月费用明细清单，则优合给予冷库优先对账政策。'];
        
        // 合并所有数据
        const wsData = [
            titleRow,
            headers,
            ...dataRows,
            totalRow,
            remarkRow
        ];
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 设置合并单元格（标题行）
        if (!ws['!merges']) ws['!merges'] = [];
        // 合并第一行的所有列
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
        
        // 设置列宽
        const colWidths = [
            { wch: 8 },  // 序号
            { wch: 12 }, // 到港时间
            { wch: 15 }, // 提单号
            { wch: 15 }, // 柜号
            { wch: 10 }, // 报关费
            { wch: 12 }, // 查验服务费
            { wch: 12 }, // 代理换单费
            { wch: 15 }, // 其他费用1
            { wch: 15 }, // 其他费用2
        ];
        
        // 添加自定义费用列宽
        customFees.forEach(() => {
            colWidths.push({ wch: 15 });
        });
        
        // 添加合计和备注列宽
        colWidths.push({ wch: 10 }, { wch: 20 });
        
        ws['!cols'] = colWidths;
        
        // 设置单元格样式
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // 遍历所有单元格设置样式
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cell_address = {c: C, r: R};
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                
                if (!ws[cell_ref]) continue;
                
                // 设置边框
                if (!ws[cell_ref].s) ws[cell_ref].s = {};
                ws[cell_ref].s.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                // 设置对齐方式
                ws[cell_ref].s.alignment = {
                    horizontal: 'center',
                    vertical: 'center'
                };
                
                // 第一行：标题行样式
                if (R === 0) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 18,
                        bold: true
                    };
                }
                // 第二行：表头行样式
                else if (R === 1) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 12
                    };
                }
                // 数据行样式
                else if (R < wsData.length - 2) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 11
                    };
                }
                // 合计行样式
                else if (R === wsData.length - 2) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 11,
                        bold: true
                    };
                }
                // 备注行样式
                else if (R === wsData.length - 1) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 11,
                        bold: true
                    };
                    ws[cell_ref].s.alignment = {
                        horizontal: 'left',
                        vertical: 'center'
                    };
                }
            }
        }
        
        // 添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '账单');
        
        // 生成文件名
        const fileName = `${companyName}${year}年${month}月报关费.xlsx`;
        
        // 导出文件
        XLSX.writeFile(wb, fileName);
        
    } catch (error) {
        console.error('导出Excel失败:', error);
        alert('导出Excel失败: ' + error.message);
    }
}

// 保存生成的账单
async function saveGeneratedBill() {
    if (selectedItemsForBill.length === 0) {
        alert('请选择要生成账单的报关数据');
        return;
    }
    
    const companyName = document.getElementById('companyName').value;
    const year = document.getElementById('billYear').value;
    const month = document.getElementById('billMonth').value;
    
    if (!companyName) {
        alert('请填写公司名称');
        return;
    }
    
    try {
        // 获取费用设置
        const customsFee = parseFloat(document.getElementById('customsFee').value) || 0;
        const inspectionFee = parseFloat(document.getElementById('inspectionFee').value) || 0;
        const documentFee = parseFloat(document.getElementById('documentFee').value) || 0;
        const otherFee1 = parseFloat(document.getElementById('otherFee1').value) || 0;
        const otherFee2 = parseFloat(document.getElementById('otherFee2').value) || 0;
        
        // 获取其他费用名称
        const otherFee1Name = document.getElementById('otherFee1Name').value || '其他费用1';
        const otherFee2Name = document.getElementById('otherFee2Name').value || '其他费用2';
        
        // 获取自定义费用
        const customFeeValues = [];
        customFees.forEach(fee => {
            const feeValue = parseFloat(document.getElementById(`otherFee${fee.id}`).value) || 0;
            const feeName = document.getElementById(`otherFee${fee.id}Name`).value || `其他费用${fee.id}`;
            customFeeValues.push({
                id: fee.id,
                name: feeName,
                value: feeValue
            });
        });
        
        // 获取备注
        const billItems = selectedItemsForBill.map((item, index) => {
            const remarkInput = document.querySelector(`input[data-id="${item.id}"]`);
            const remark = remarkInput ? remarkInput.value : '';
            
            // 使用实际设置的费用，而不是默认费用
            const itemCustomsFee = item.customsFee !== undefined ? item.customsFee : customsFee;
            const itemInspectionFee = item.inspectionFee !== undefined ? item.inspectionFee : inspectionFee;
            const itemDocumentFee = item.documentFee !== undefined ? item.documentFee : documentFee;
            const itemOtherFee1 = item.otherFee1 !== undefined ? item.otherFee1 : otherFee1;
            const itemOtherFee2 = item.otherFee2 !== undefined ? item.otherFee2 : otherFee2;
            
            // 计算自定义费用
            let itemCustomFeesTotal = 0;
            const itemCustomFees = {};
            customFees.forEach(fee => {
                itemCustomFees[`otherFee${fee.id}`] = item[`otherFee${fee.id}`] !== undefined ? item[`otherFee${fee.id}`] : customFeeValues.find(f => f.id === fee.id)?.value || 0;
                itemCustomFeesTotal += itemCustomFees[`otherFee${fee.id}`];
            });
            
            const itemTotal = itemCustomsFee + itemInspectionFee + itemDocumentFee + itemOtherFee1 + itemOtherFee2 + itemCustomFeesTotal;
            
            return {
                id: index + 1,
                customsDataId: item.id,
                arrivalDate: item.arrivalDate,
                declareDate: item.declareDate,
                billNo: item.billNo,
                containerNo: item.containerNo,
                customsNo: item.customsNo,
                domesticConsignee: item.domesticConsignee,
                consumptionUnit: item.consumptionUnit,
                country: item.country,
                productName: item.productName,
                customsFee: itemCustomsFee,
                inspectionFee: itemInspectionFee,
                documentFee: itemDocumentFee,
                otherFee1: itemOtherFee1,
                otherFee2: itemOtherFee2,
                otherFee1Name: otherFee1Name,
                otherFee2Name: otherFee2Name,
                ...itemCustomFees,
                total: itemTotal,
                remark: remark
            };
        });
        
        // 计算总金额
        const totalAmount = billItems.reduce((sum, item) => sum + item.total, 0);
        
        // 创建自定义费用配置
        const customFeesConfig = [
            { name: '报关费', value: customsFee },
            { name: '查验服务费', value: inspectionFee },
            { name: '代理换单费', value: documentFee },
            { name: otherFee1Name, value: otherFee1 },
            { name: otherFee2Name, value: otherFee2 },
            ...customFeeValues
        ];
        
        // 创建账单对象
        const newBill = {
            billNo: generateBillNo(),
            billDate: new Date().toISOString().split('T')[0],
            companyName: companyName,
            year: year,
            month: month,
            billItems: billItems,
            totalAmount: totalAmount,
            currency: 'CNY',
            billStatus: '未确认',
            customFees: customFeesConfig
        };
        
        // 保存到LeanCloud
        const success = await saveBillToLeanCloud(newBill, true);
        
        if (success) {
            alert('账单保存成功');
            const modal = bootstrap.Modal.getInstance(document.getElementById('generateBillModal'));
            modal.hide();
            await loadListData();
        } else {
            alert('保存失败，请重试');
        }
        
    } catch (error) {
        console.error('保存账单失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 显示账单详情
function showBillDetail(id) {
    const item = billsData.find(item => item.id === id);
    if (!item) {
        alert('找不到对应的账单数据');
        return;
    }

    // 设置当前账单ID
    document.getElementById('billDetailModal').setAttribute('data-current-id', id);

    // 填充基本信息
    document.getElementById('detailBillNo').textContent = item.billNo;
    document.getElementById('detailCompanyName').textContent = item.companyName;
    document.getElementById('detailBillDate').textContent = item.billDate;
    document.getElementById('detailBillStatus').textContent = item.billStatus;
    document.getElementById('detailTotalAmount').textContent = formatCurrency(item.totalAmount || 0, item.currency);
    document.getElementById('detailPaymentDate').textContent = item.paymentDate || '-';
    document.getElementById('detailPayee').textContent = item.payee || '-';
    document.getElementById('detailRemark').textContent = item.remark || '-';
    
    // 更新其他费用表头
    const customFeesConfig = item.customFees || [];
    document.getElementById('detailOtherFee1Header').textContent = customFeesConfig[3]?.name || '其他费用1';
    document.getElementById('detailOtherFee2Header').textContent = customFeesConfig[4]?.name || '其他费用2';
    
    // 显示自定义费用表头
    if (customFeesConfig[5]) {
        document.getElementById('detailOtherFee3Header').style.display = 'table-cell';
        document.getElementById('detailOtherFee3Header').textContent = customFeesConfig[5].name;
    } else {
        document.getElementById('detailOtherFee3Header').style.display = 'none';
    }
    
    if (customFeesConfig[6]) {
        document.getElementById('detailOtherFee4Header').style.display = 'table-cell';
        document.getElementById('detailOtherFee4Header').textContent = customFeesConfig[6].name;
    } else {
        document.getElementById('detailOtherFee4Header').style.display = 'none';
    }
    
    // 填充账单明细
    const tbody = document.getElementById('billDetailItems');
    tbody.innerHTML = '';
    
    if (item.billItems && item.billItems.length > 0) {
        item.billItems.forEach(billItem => {
            const row = document.createElement('tr');
            
            let customFeesHtml = '';
            if (customFeesConfig[5]) {
                customFeesHtml += `<td>${(billItem.otherFee3 || 0).toFixed(2)}</td>`;
            }
            if (customFeesConfig[6]) {
                customFeesHtml += `<td>${(billItem.otherFee4 || 0).toFixed(2)}</td>`;
            }
            
            row.innerHTML = `
                <td>${billItem.id}</td>
                <td>${billItem.arrivalDate}</td>
                <td>${billItem.billNo}</td>
                <td>${billItem.containerNo}</td>
                <td>${billItem.customsNo}</td>
                <td>${billItem.customsFee.toFixed(2)}</td>
                <td>${billItem.inspectionFee.toFixed(2)}</td>
                <td>${billItem.documentFee.toFixed(2)}</td>
                <td>${billItem.otherFee1.toFixed(2)}</td>
                <td>${billItem.otherFee2.toFixed(2)}</td>
                ${customFeesHtml}
                <td>${billItem.total.toFixed(2)}</td>
                <td>${billItem.remark || ''}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 填充发票列表
    const invoiceTbody = document.getElementById('invoiceList');
    invoiceTbody.innerHTML = '';
    
    if (item.attachments && item.attachments.length > 0) {
        item.attachments.forEach((attachment, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <a href="${attachment.fileUrl}" target="_blank">${attachment.name}</a>
                </td>
                <td>${attachment.type || '发票'}</td>
                <td>${attachment.uploadTime}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-invoice" 
                            data-id="${item.id}" 
                            data-attachment-id="${attachment.id}">
                        删除
                    </button>
                </td>
            `;
            invoiceTbody.appendChild(row);
        });
    } else {
        invoiceTbody.innerHTML = '<tr><td colspan="4" class="text-center">暂无发票</td></tr>';
    }
    
    // 绑定发票删除事件
    document.querySelectorAll('.delete-invoice').forEach(btn => {
        btn.addEventListener('click', function() {
            const billId = this.getAttribute('data-id');
            const attachmentId = this.getAttribute('data-attachment-id');
            deleteInvoice(billId, attachmentId);
        });
    });
    
    // 添加Excel导出按钮到详情模态框
    const modalFooter = document.querySelector('#billDetailModal .modal-footer');
    const existingExcelBtn = document.getElementById('exportDetailExcel');
    if (!existingExcelBtn) {
        const excelBtn = document.createElement('button');
        excelBtn.id = 'exportDetailExcel';
        excelBtn.className = 'btn btn-outline-success';
        excelBtn.innerHTML = '<i class="fas fa-file-excel"></i> 导出Excel';
        excelBtn.onclick = () => exportDetailExcel(item);
        modalFooter.insertBefore(excelBtn, modalFooter.querySelector('#exportDetailPdf'));
    }
    
    // 根据账单状态控制按钮
    const confirmBtn = document.getElementById('confirmBill');
    const exportPdfBtn = document.getElementById('exportDetailPdf');
    
    if (item.billStatus === '未确认') {
        confirmBtn.style.display = 'inline-block';
        confirmBtn.disabled = false;
        exportPdfBtn.disabled = true;
    } else if (item.billStatus === '已确认') {
        confirmBtn.style.display = 'none';
        exportPdfBtn.disabled = false;
    } else if (item.billStatus === '已收款') {
        confirmBtn.style.display = 'none';
        exportPdfBtn.disabled = false;
    }
    
    // 隐藏上传区域
    document.getElementById('invoiceUploadSection').style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('billDetailModal'));
    modal.show();
}

// 导出详情Excel - 严格按照模板格式
function exportDetailExcel(billItem) {
    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 准备数据
        const companyName = billItem.companyName;
        const year = billItem.year;
        const month = billItem.month;
        const customFeesConfig = billItem.customFees || [];
        
        // 创建标题行
        const titleRow = [`${companyName}    ${year}年${month}月报关费`];
        
        // 创建表头
        const headers = ['序号', '到港时间', '提单号', '柜号', '报关费', '查验服务费', '代理换单费'];
        
        // 添加其他费用表头
        headers.push(
            customFeesConfig[3]?.name || '其他费用1',
            customFeesConfig[4]?.name || '其他费用2'
        );
        
        // 添加自定义费用表头
        if (customFeesConfig[5]) headers.push(customFeesConfig[5].name);
        if (customFeesConfig[6]) headers.push(customFeesConfig[6].name);
        
        headers.push('合计', '备注');
        
        // 创建数据行
        const dataRows = [];
        let totalCustomsFee = 0;
        let totalInspectionFee = 0;
        let totalDocumentFee = 0;
        let totalOtherFee1 = 0;
        let totalOtherFee2 = 0;
        let totalOtherFee3 = 0;
        let totalOtherFee4 = 0;
        let grandTotal = 0;
        
        if (billItem.billItems && billItem.billItems.length > 0) {
            billItem.billItems.forEach((item, index) => {
                totalCustomsFee += item.customsFee || 0;
                totalInspectionFee += item.inspectionFee || 0;
                totalDocumentFee += item.documentFee || 0;
                totalOtherFee1 += item.otherFee1 || 0;
                totalOtherFee2 += item.otherFee2 || 0;
                totalOtherFee3 += item.otherFee3 || 0;
                totalOtherFee4 += item.otherFee4 || 0;
                grandTotal += item.total || 0;
                
                const row = [
                    index + 1,
                    item.arrivalDate,
                    item.billNo,
                    item.containerNo,
                    item.customsFee || 0,
                    item.inspectionFee || 0,
                    item.documentFee || 0,
                    item.otherFee1 || 0,
                    item.otherFee2 || 0
                ];
                
                // 添加自定义费用列
                if (customFeesConfig[5]) row.push(item.otherFee3 || 0);
                if (customFeesConfig[6]) row.push(item.otherFee4 || 0);
                
                row.push(item.total || 0, item.remark || '');
                
                dataRows.push(row);
            });
        }
        
        // 创建总计行
        const totalRow = ['合计', '', '', '', totalCustomsFee, totalInspectionFee, totalDocumentFee, totalOtherFee1, totalOtherFee2];
        
        // 添加自定义费用总计
        if (customFeesConfig[5]) totalRow.push(totalOtherFee3);
        if (customFeesConfig[6]) totalRow.push(totalOtherFee4);
        
        totalRow.push(grandTotal, '');
        
        // 创建备注行
        const remarkRow = ['备注：如冷库根据本模板提供每月费用明细清单，则优合给予冷库优先对账政策。'];
        
        // 合并所有数据
        const wsData = [
            titleRow,
            headers,
            ...dataRows,
            totalRow,
            remarkRow
        ];
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 设置合并单元格（标题行）
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
        
        // 设置列宽
        const colWidths = [
            { wch: 8 },  // 序号
            { wch: 12 }, // 到港时间
            { wch: 15 }, // 提单号
            { wch: 15 }, // 柜号
            { wch: 10 }, // 报关费
            { wch: 12 }, // 查验服务费
            { wch: 12 }, // 代理换单费
            { wch: 15 }, // 其他费用1
            { wch: 15 }, // 其他费用2
        ];
        
        // 添加自定义费用列宽
        if (customFeesConfig[5]) colWidths.push({ wch: 15 });
        if (customFeesConfig[6]) colWidths.push({ wch: 15 });
        
        // 添加合计和备注列宽
        colWidths.push({ wch: 10 }, { wch: 20 });
        
        ws['!cols'] = colWidths;
        
        // 设置单元格样式（与上面相同的样式设置逻辑）
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cell_address = {c: C, r: R};
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                
                if (!ws[cell_ref]) continue;
                
                // 设置边框
                if (!ws[cell_ref].s) ws[cell_ref].s = {};
                ws[cell_ref].s.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                // 设置对齐方式
                ws[cell_ref].s.alignment = {
                    horizontal: 'center',
                    vertical: 'center'
                };
                
                // 第一行：标题行样式
                if (R === 0) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 18,
                        bold: true
                    };
                }
                // 第二行：表头行样式
                else if (R === 1) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 12
                    };
                }
                // 数据行样式
                else if (R < wsData.length - 2) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 11
                    };
                }
                // 合计行样式
                else if (R === wsData.length - 2) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 11,
                        bold: true
                    };
                }
                // 备注行样式
                else if (R === wsData.length - 1) {
                    ws[cell_ref].s.font = {
                        name: '宋体',
                        sz: 11,
                        bold: true
                    };
                    ws[cell_ref].s.alignment = {
                        horizontal: 'left',
                        vertical: 'center'
                    };
                }
            }
        }
        
        // 添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '账单');
        
        // 生成文件名
        const fileName = `${companyName}${year}年${month}月报关费.xlsx`;
        
        // 导出文件
        XLSX.writeFile(wb, fileName);
        
    } catch (error) {
        console.error('导出Excel失败:', error);
        alert('导出Excel失败: ' + error.message);
    }
}

// 确认账单
async function confirmBill() {
    const billId = document.getElementById('billDetailModal').getAttribute('data-current-id');
    if (!billId) {
        alert('无法确定当前账单');
        return;
    }
    
    if (!confirm('确认后账单将无法修改，确定要确认此账单吗？')) {
        return;
    }
    
    try {
        const item = billsData.find(item => item.id === billId);
        if (!item) {
            alert('找不到对应的账单数据');
            return;
        }
        
        // 更新账单状态
        item.billStatus = '已确认';
        
        // 保存到LeanCloud
        if (item.leanCloudObject) {
            item.leanCloudObject.set('billStatus', '已确认');
            await item.leanCloudObject.save();
            
            alert('账单确认成功');
            
            // 关闭模态框并刷新数据
            const modal = bootstrap.Modal.getInstance(document.getElementById('billDetailModal'));
            modal.hide();
            await loadListData();
        }
        
    } catch (error) {
        console.error('确认账单失败:', error);
        alert('确认失败: ' + error.message);
    }
}

// 上传发票
function showUploadInvoice() {
    document.getElementById('invoiceUploadSection').style.display = 'block';
}

// 确认上传发票
async function confirmUploadInvoice() {
    const fileInput = document.getElementById('invoiceUpload');
    const billId = document.getElementById('billDetailModal').getAttribute('data-current-id');
    
    if (!fileInput || fileInput.files.length === 0) {
        alert('请选择要上传的发票文件');
        return;
    }
    
    if (!billId) {
        alert('无法确定当前账单');
        return;
    }
    
    try {
        const file = fileInput.files[0];
        const avFile = new AV.File(file.name, file);
        await avFile.save();
        
        // 获取账单对象
        const item = billsData.find(item => item.id === billId);
        if (!item) {
            alert('找不到对应的账单数据');
            return;
        }
        
        // 更新附件列表
        const attachments = item.attachments || [];
        const newAttachment = {
            id: attachments.length > 0 ? Math.max(...attachments.map(a => a.id || 0)) + 1 : 1,
            type: '发票',
            name: file.name,
            uploadTime: new Date().toLocaleString('zh-CN'),
            fileUrl: avFile.url(),
            fileId: avFile.id
        };
        attachments.push(newAttachment);
        
        // 保存到LeanCloud
        if (item.leanCloudObject) {
            item.leanCloudObject.set('attachments', attachments);
            await item.leanCloudObject.save();
            
            // 更新本地数据
            item.attachments = attachments;
            
            alert('发票上传成功');
            fileInput.value = '';
            document.getElementById('invoiceUploadSection').style.display = 'none';
            
            // 刷新发票列表
            showBillDetail(billId);
        }
        
    } catch (error) {
        console.error('上传发票失败:', error);
        alert('上传失败: ' + error.message);
    }
}

// 取消上传
function cancelUpload() {
    document.getElementById('invoiceUpload').value = '';
    document.getElementById('invoiceUploadSection').style.display = 'none';
}

// 删除发票
async function deleteInvoice(billId, attachmentId) {
    if (!confirm('确定要删除这个发票吗？')) return;
    
    try {
        const item = billsData.find(item => item.id === billId);
        if (!item) {
            alert('找不到对应的账单数据');
            return;
        }
        
        // 找到要删除的附件
        const attachmentToDelete = item.attachments.find(att => att.id == attachmentId);
        if (!attachmentToDelete) {
            alert('找不到要删除的发票');
            return;
        }
        
        const updatedAttachments = item.attachments.filter(att => att.id != attachmentId);
        
        // 1. 先删除 LeanCloud 上的实际文件
        if (attachmentToDelete.fileId && typeof deleteFileFromLeanCloud === 'function') {
            await deleteFileFromLeanCloud(attachmentToDelete.fileId);
        }
        
        // 2. 更新LeanCloud记录
        if (item.leanCloudObject) {
            item.leanCloudObject.set('attachments', updatedAttachments);
            await item.leanCloudObject.save();
            
            // 更新本地数据
            item.attachments = updatedAttachments;
            
            alert('发票删除成功');
            
            // 刷新发票列表
            showBillDetail(billId);
        }
        
    } catch (error) {
        console.error('删除发票失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 导出账单PDF
function exportBillPdf() {
    alert('PDF导出功能正在开发中...');
}

// 删除账单
async function deleteBill(id) {
    if (confirm('确定要删除这条账单记录吗？此操作不可恢复。')) {
        try {
            const itemToDelete = billsData.find(item => item.id === id);
            
            if (itemToDelete) {
                const success = await deleteBillFromLeanCloud(itemToDelete);
                
                if (success) {
                    await loadListData();
                } else {
                    alert('删除失败，请重试');
                }
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请重试');
        }
    }
}

// 清空账单筛选条件
function clearBills() {
    document.getElementById('billDateRange').value = '';
    document.getElementById('billStatusFilter').value = '';

    filteredBillsData = [...billsData];
    billsCurrentPageIndex = 1;
    updateBillsPagination();
    renderBillsTable();
    updateStatistics();
}

// 更新账单分页
function updateBillsPagination() {
    billsTotalPages = Math.ceil(filteredBillsData.length / billsItemsPerPage);
    const paginationElement = document.getElementById('billsPagination');
    
    if (billsTotalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    if (billsCurrentPageIndex > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${billsCurrentPageIndex - 1}">上一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">上一页</a></li>`;
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, billsCurrentPageIndex - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(billsTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === billsCurrentPageIndex) {
            paginationHTML += `<li class="page-item active"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
    }
    
    if (billsCurrentPageIndex < billsTotalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${billsCurrentPageIndex + 1}">下一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">下一页</a></li>`;
    }
    
    paginationElement.innerHTML = paginationHTML;
    
    document.querySelectorAll('#billsPagination .page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== billsCurrentPageIndex) {
                billsCurrentPageIndex = page;
                renderBillsTable();
                updateBillsPagination();
            }
        });
    });
}

// 更新账单分页信息
function updateBillsPaginationInfo() {
    const totalItems = filteredBillsData.length;
    const startItem = totalItems > 0 ? (billsCurrentPageIndex - 1) * billsItemsPerPage + 1 : 0;
    const endItem = Math.min(billsCurrentPageIndex * billsItemsPerPage, totalItems);
    
    document.getElementById('billsPaginationInfo').innerHTML = 
        `共 ${billsTotalPages} 页，每页显示 ${billsItemsPerPage} 条，共 ${totalItems} 条记录，当前显示第 ${startItem}-${endItem} 条`;
}

// LeanCloud账单数据操作
async function saveBillToLeanCloud(billItem, isNew = false) {
    try {
        let billObject;
        
        if (isNew) {
            billObject = new AV.Object('Bills');
        } else {
            billObject = billItem.leanCloudObject;
        }
        
        billObject.set('billNo', billItem.billNo);
        billObject.set('billDate', billItem.billDate);
        billObject.set('companyName', billItem.companyName);
        billObject.set('containerNo', billItem.containerNo);
        billObject.set('customsNo', billItem.customsNo);
        billObject.set('billNoSearch', billItem.billNoSearch);
        billObject.set('domesticConsignee', billItem.domesticConsignee);
        billObject.set('totalAmount', billItem.totalAmount);
        billObject.set('currency', billItem.currency);
        billObject.set('billStatus', billItem.billStatus);
        billObject.set('paymentDate', billItem.paymentDate);
        billObject.set('payee', billItem.payee);
        billObject.set('remark', billItem.remark);
        billObject.set('billItems', billItem.billItems);
        billObject.set('attachments', billItem.attachments || []);
        billObject.set('customFees', billItem.customFees || []);
        
        await billObject.save();
        
        if (isNew) {
            billItem.leanCloudObject = billObject;
            billItem.id = billObject.id;
        }
        
        return true;
    } catch (error) {
        console.error('保存到LeanCloud失败:', error);
        return false;
    }
}

async function deleteBillFromLeanCloud(billItem) {
    try {
        if (billItem.leanCloudObject) {
            // 先删除所有关联的文件
            if (billItem.attachments && billItem.attachments.length > 0) {
                for (const attachment of billItem.attachments) {
                    if (attachment.fileId && typeof deleteFileFromLeanCloud === 'function') {
                        await deleteFileFromLeanCloud(attachment.fileId);
                    }
                }
            }
            
            // 再删除账单记录
            await billItem.leanCloudObject.destroy();
            return true;
        }
        return false;
    } catch (error) {
        console.error('从LeanCloud删除失败:', error);
        return false;
    }
}

// 绑定账单管理事件
document.addEventListener('DOMContentLoaded', function() {
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
    
    // 生成账单按钮
    const generateBillBtn = document.getElementById('generateBill');
    if (generateBillBtn) {
        generateBillBtn.addEventListener('click', showGenerateBillModal);
    }
    
    // 查询报关数据按钮
    const searchCustomsDataBtn = document.getElementById('searchCustomsData');
    if (searchCustomsDataBtn) {
        searchCustomsDataBtn.addEventListener('click', searchCustomsData);
    }
    
    // 应用到所有选中项按钮
    const applyAllFeesBtn = document.getElementById('applyAllFees');
    if (applyAllFeesBtn) {
        applyAllFeesBtn.addEventListener('click', applyAllFees);
    }
    
    // 预览账单按钮
    const previewBillBtn = document.getElementById('previewBill');
    if (previewBillBtn) {
        previewBillBtn.addEventListener('click', previewBill);
    }
    
    // 保存生成账单按钮
    const saveGeneratedBillBtn = document.getElementById('saveGeneratedBill');
    if (saveGeneratedBillBtn) {
        saveGeneratedBillBtn.addEventListener('click', saveGeneratedBill);
    }
    
    // 导出Excel按钮
    const exportBillExcelBtn = document.getElementById('exportBillExcel');
    if (exportBillExcelBtn) {
        exportBillExcelBtn.addEventListener('click', exportBillExcel);
    }
    
    // 导出PDF按钮
    const exportBillPdfBtn = document.getElementById('exportBillPdf');
    if (exportBillPdfBtn) {
        exportBillPdfBtn.addEventListener('click', exportBillPdf);
    }
    
    // 添加自定义费用按钮
    const addCustomFeeBtn = document.getElementById('addCustomFee');
    if (addCustomFeeBtn) {
        addCustomFeeBtn.addEventListener('click', addCustomFee);
    }
    
    // 确认账单按钮
    const confirmBillBtn = document.getElementById('confirmBill');
    if (confirmBillBtn) {
        confirmBillBtn.addEventListener('click', confirmBill);
    }
    
    // 导出详情PDF按钮
    const exportDetailPdfBtn = document.getElementById('exportDetailPdf');
    if (exportDetailPdfBtn) {
        exportDetailPdfBtn.addEventListener('click', exportBillPdf);
    }
    
    // 上传发票按钮
    const uploadInvoiceBtn = document.getElementById('uploadInvoiceBtn');
    if (uploadInvoiceBtn) {
        uploadInvoiceBtn.addEventListener('click', showUploadInvoice);
    }
    
    // 确认上传按钮
    const confirmUploadBtn = document.getElementById('confirmUpload');
    if (confirmUploadBtn) {
        confirmUploadBtn.addEventListener('click', confirmUploadInvoice);
    }
    
    // 取消上传按钮
    const cancelUploadBtn = document.getElementById('cancelUpload');
    if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener('click', cancelUpload);
    }
    
    // 账单预览搜索按钮
    const billPreviewSearchBtn = document.getElementById('billPreviewSearchBtn');
    if (billPreviewSearchBtn) {
        billPreviewSearchBtn.addEventListener('click', searchBillPreview);
    }
    
    // 账单预览搜索输入框回车事件
    const billPreviewSearchInput = document.getElementById('billPreviewSearch');
    if (billPreviewSearchInput) {
        billPreviewSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBillPreview();
            }
        });
    }
    
    // 初始化日期选择器
    const billDatePicker = flatpickr('#billDateRange', {
        mode: 'range',
        locale: 'zh',
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    // 存储日期选择器实例
    if (!window.datePickers) window.datePickers = {};
    window.datePickers.billDateRange = billDatePicker;
    
    // 绑定费用输入变化事件
    document.querySelectorAll('.fee-input').forEach(input => {
        input.addEventListener('change', function() {
            if (selectedItemsForBill.length > 0) {
                previewBill();
            }
        });
    });
    
    // 绑定费用名称变化事件
    document.getElementById('otherFee1Name').addEventListener('change', function() {
        if (selectedItemsForBill.length > 0) {
            previewBill();
        }
    });
    
    document.getElementById('otherFee2Name').addEventListener('change', function() {
        if (selectedItemsForBill.length > 0) {
            previewBill();
        }
    });
});

// 导出全局函数
window.addCustomFee = addCustomFee;
window.removeCustomFee = removeCustomFee;
window.searchBillPreview = searchBillPreview;