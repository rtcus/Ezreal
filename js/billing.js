// 账单管理模块

// 全局变量
let billsData = [];
let filteredBillsData = [];
let billsCurrentPageIndex = 1;
let billsTotalPages = 1;
let billsItemsPerPage = 10;

// 账单预览数据
let selectedCustomsData = [];
let billPreviewItems = [];

// 标记模块是否已初始化
let billingModuleInitialized = false;

// 导出全局函数供 common.js 调用
window.initBillingModule = initBillingModule;

// 初始化账单管理模块
function initBillingModule() {
    console.log('初始化账单管理模块');
    
    try {
        // 如果已经初始化过,直接返回
        if (billingModuleInitialized) {
            console.log('账单管理模块已初始化,跳过');
            return;
        }

        console.log('开始检查DOM元素...');

        // 检查必要的DOM元素是否存在
        const billingPage = document.getElementById('billing');
        if (!billingPage) {
            console.error('账单页面元素不存在');
            return;
        }
        console.log('账单页面元素存在');

        // 检查页面是否可见
        console.log('账单页面class:', billingPage.className);
        console.log('账单页面display:', window.getComputedStyle(billingPage).display);

        // 绑定查询按钮
        const searchBillsBtn = document.getElementById('searchBills');
        if (searchBillsBtn) {
            searchBillsBtn.addEventListener('click', function() {
                loadBills();
            });
        } else {
            console.warn('searchBills按钮不存在');
        }

        // 绑定清空按钮
        const clearBillsBtn = document.getElementById('clearBills');
        if (clearBillsBtn) {
            clearBillsBtn.addEventListener('click', clearBills);
        } else {
            console.warn('clearBills按钮不存在');
        }

        // 绑定生成账单按钮
        const generateBillBtn = document.getElementById('generateBill');
        if (generateBillBtn) {
            generateBillBtn.addEventListener('click', showGenerateBillModal);
        } else {
            console.warn('generateBill按钮不存在');
        }

        // 绑定导出按钮
        const exportBillsBtn = document.getElementById('exportBills');
        if (exportBillsBtn) {
            exportBillsBtn.addEventListener('click', exportBills);
        } else {
            console.warn('exportBills按钮不存在');
        }

        // 绑定历史账单按钮
        const showHistoryBillsBtn = document.getElementById('showHistoryBills');
        if (showHistoryBillsBtn) {
            showHistoryBillsBtn.addEventListener('click', showHistoryBillsModal);
        } else {
            console.warn('showHistoryBills按钮不存在');
        }

        // 绑定分页相关事件
        const billsPageSizeSelect = document.getElementById('billsPageSizeSelect');
        if (billsPageSizeSelect) {
            billsPageSizeSelect.addEventListener('change', function() {
                billsItemsPerPage = parseInt(this.value);
                billsCurrentPageIndex = 1;
                renderBillsTable();
                updateBillsPagination();
            });
        } else {
            console.warn('billsPageSizeSelect不存在');
        }

        // 绑定生成账单模态框相关事件
        console.log('开始绑定模态框事件...');
        initGenerateBillModalEvents();

        // 初始化日期选择器
        console.log('开始初始化日期选择器...');
        initBillDatePickers();

        // 加载账单数据
        console.log('开始加载账单数据...');
        loadBills();
        
        // 标记为已初始化
        billingModuleInitialized = true;
        
        console.log('账单管理模块初始化完成');
    } catch (error) {
        console.error('初始化账单管理模块时发生错误:', error);
        console.error('错误堆栈:', error.stack);
    }
}

// 初始化日期选择器
function initBillDatePickers() {
    try {
        const billDateRange = document.getElementById('billDateRange');
        if (billDateRange && typeof flatpickr !== 'undefined') {
            flatpickr(billDateRange, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                locale: 'zh',
                allowInvalid: true
            });
            console.log('日期选择器初始化完成');
        } else {
            console.log('flatpickr未加载或billDateRange元素不存在');
        }
    } catch (error) {
        console.error('初始化日期选择器时发生错误:', error);
    }
}

// 加载账单数据
async function loadBills() {
    try {
        console.log('开始加载账单数据...');

        // 检查AV是否已初始化
        if (typeof AV === 'undefined') {
            console.error('LeanCloud (AV) 未初始化');
            alert('系统未正确初始化,请刷新页面重试');
            return;
        }

        const query = new AV.Query('Bills');
        query.descending('billDate');
        query.limit(1000);

        const results = await query.find();

        billsData = results.map(bill => ({
            id: bill.id,
            billNo: bill.get('billNo'),
            billDate: bill.get('billDate'),
            companyName: bill.get('companyName'),
            totalAmount: bill.get('totalAmount'),
            currency: bill.get('currency') || 'CNY',
            billStatus: bill.get('billStatus') || '未确认',
            paymentDate: bill.get('paymentDate'),
            payee: bill.get('payee'),
            remark: bill.get('remark'),
            year: bill.get('year'),
            month: bill.get('month'),
            billItems: bill.get('billItems') || [],
            attachments: bill.get('attachments') || [],
            leanCloudObject: bill
        }));

        console.log('账单数据加载完成，共', billsData.length, '条');

        // 应用筛选条件
        applyBillsFilters();

        // 渲染表格
        renderBillsTable();

        // 更新分页
        updateBillsPagination();

        // 更新统计
        updateStatistics();

    } catch (error) {
        console.error('加载账单数据失败:', error);
        
        // 显示错误信息但不要阻断页面
        if (error.code === 101) {
            console.log('Bills表不存在，显示空数据');
            billsData = [];
            filteredBillsData = [];
            renderBillsTable();
            updateBillsPagination();
            updateStatistics();
        } else {
            console.error('错误详情:', error.message);
            // 只在控制台输出错误,不弹窗影响用户体验
        }
    }
}

// 应用筛选条件
function applyBillsFilters() {
    const dateRangeInput = document.getElementById('billDateRange');
    const statusFilterInput = document.getElementById('billStatusFilter');
    const companyNameFilterInput = document.getElementById('companyNameFilter');
    
    const dateRange = dateRangeInput ? dateRangeInput.value : '';
    const statusFilter = statusFilterInput ? statusFilterInput.value : '';
    const companyNameFilter = companyNameFilterInput ? companyNameFilterInput.value.toLowerCase() : '';

    filteredBillsData = billsData.filter(bill => {
        // 日期筛选
        if (dateRange && bill.billDate) {
            const dates = dateRange.split(/至|to| - /);
            if (dates.length === 2) {
                const startDate = new Date(dates[0].trim());
                const endDate = new Date(dates[1].trim());
                const billDate = new Date(bill.billDate);
                if (billDate < startDate || billDate > endDate) {
                    return false;
                }
            }
        }

        // 状态筛选
        if (statusFilter && bill.billStatus !== statusFilter) {
            return false;
        }

        // 公司名称筛选
        if (companyNameFilter && bill.companyName && !bill.companyName.toLowerCase().includes(companyNameFilter)) {
            return false;
        }

        return true;
    });

    billsCurrentPageIndex = 1;
}

// 渲染账单列表表格
function renderBillsTable() {
    try {
        const tbody = document.querySelector('#billsTable tbody');
        if (!tbody) {
            console.warn('billsTable tbody元素不存在');
            return;
        }

        if (!filteredBillsData || filteredBillsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">暂无数据</td></tr>';
            return;
        }

        const startIndex = (billsCurrentPageIndex - 1) * billsItemsPerPage;
        const endIndex = Math.min(startIndex + billsItemsPerPage, filteredBillsData.length);
        const pageData = filteredBillsData.slice(startIndex, endIndex);

        tbody.innerHTML = pageData.map((bill, index) => {
            const statusClass = getBillStatusRowClass(bill.billStatus);
            return `
                <tr class="${statusClass}">
                    <td>${startIndex + index + 1}</td>
                    <td>${bill.billNo || ''}</td>
                    <td>${bill.billDate || ''}</td>
                    <td>${bill.companyName || ''}</td>
                    <td>${formatCurrency(bill.totalAmount, bill.currency)}</td>
                    <td>${bill.currency || 'CNY'}</td>
                    <td><span class="badge ${getBillStatusBadgeClass(bill.billStatus)}">${bill.billStatus}</span></td>
                    <td>${bill.paymentDate || ''}</td>
                    <td>${bill.remark || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="showBillDetail('${bill.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteBill('${bill.id}')" ${bill.billStatus === '已确认' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('渲染账单表格时发生错误:', error);
    }
}

// 获取账单状态对应的表格行CSS类
function getBillStatusRowClass(status) {
    switch (status) {
        case '未确认':
            return 'table-warning';
        case '已确认':
            return 'table-info';
        case '已收款':
            return 'table-success';
        default:
            return '';
    }
}

// 获取账单状态对应的徽章CSS类
function getBillStatusBadgeClass(status) {
    switch (status) {
        case '未确认':
            return 'bg-warning';
        case '已确认':
            return 'bg-info';
        case '已收款':
            return 'bg-success';
        default:
            return 'bg-secondary';
    }
}

// 格式化货币
function formatCurrency(amount, currency = 'CNY') {
    if (amount === null || amount === undefined) return '¥0.00';

    const symbols = {
        'CNY': '¥',
        'USD': '$',
        'EUR': '€'
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

// 更新统计卡片
function updateStatistics() {
    try {
        let totalAmount = 0;
        let unconfirmedAmount = 0;
        let confirmedAmount = 0;

        if (filteredBillsData && filteredBillsData.length > 0) {
            filteredBillsData.forEach(bill => {
                const amount = parseFloat(bill.totalAmount) || 0;
                totalAmount += amount;

                if (bill.billStatus === '未确认') {
                    unconfirmedAmount += amount;
                } else if (bill.billStatus === '已确认' || bill.billStatus === '已收款') {
                    confirmedAmount += amount;
                }
            });
        }

        const totalAmountEl = document.getElementById('totalAmount');
        const unconfirmedAmountEl = document.getElementById('unconfirmedAmount');
        const confirmedAmountEl = document.getElementById('confirmedAmount');
        const billCountEl = document.getElementById('billCount');

        if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalAmount);
        if (unconfirmedAmountEl) unconfirmedAmountEl.textContent = formatCurrency(unconfirmedAmount);
        if (confirmedAmountEl) confirmedAmountEl.textContent = formatCurrency(confirmedAmount);
        if (billCountEl) billCountEl.textContent = filteredBillsData ? filteredBillsData.length : 0;
    } catch (error) {
        console.error('更新统计数据时发生错误:', error);
    }
}

// 更新分页控件
function updateBillsPagination() {
    try {
        const totalLength = filteredBillsData ? filteredBillsData.length : 0;
        billsTotalPages = Math.ceil(totalLength / billsItemsPerPage) || 1;

        const pagination = document.getElementById('billsPagination');
        if (!pagination) return;

        let paginationHTML = '';

        // 上一页
        paginationHTML += `
            <li class="page-item ${billsCurrentPageIndex === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${billsCurrentPageIndex - 1}">上一页</a>
            </li>
        `;

        // 页码
        for (let i = 1; i <= billsTotalPages; i++) {
            if (i === 1 || i === billsTotalPages || (i >= billsCurrentPageIndex - 1 && i <= billsCurrentPageIndex + 1)) {
                paginationHTML += `
                    <li class="page-item ${i === billsCurrentPageIndex ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === billsCurrentPageIndex - 2 || i === billsCurrentPageIndex + 2) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // 下一页
        paginationHTML += `
            <li class="page-item ${billsCurrentPageIndex === billsTotalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${billsCurrentPageIndex + 1}">下一页</a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;

        // 绑定分页点击事件
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

        // 更新分页信息
        updateBillsPaginationInfo();
    } catch (error) {
        console.error('更新分页控件时发生错误:', error);
    }
}

// 更新分页信息
function updateBillsPaginationInfo() {
    try {
        const totalItems = filteredBillsData ? filteredBillsData.length : 0;
        const startItem = totalItems > 0 ? (billsCurrentPageIndex - 1) * billsItemsPerPage + 1 : 0;
        const endItem = Math.min(billsCurrentPageIndex * billsItemsPerPage, totalItems);

        const infoElement = document.getElementById('billsPaginationInfo');
        if (infoElement) {
            infoElement.innerHTML =
                `共 ${billsTotalPages} 页，每页显示 ${billsItemsPerPage} 条，共 ${totalItems} 条记录，当前显示第 ${startItem}-${endItem} 条`;
        }
    } catch (error) {
        console.error('更新分页信息时发生错误:', error);
    }
}

// 清空筛选条件
function clearBills() {
    document.getElementById('billDateRange').value = '';
    document.getElementById('billStatusFilter').value = '';
    document.getElementById('companyNameFilter').value = '';

    filteredBillsData = [...billsData];
    billsCurrentPageIndex = 1;

    renderBillsTable();
    updateBillsPagination();
    updateStatistics();
}

// 显示生成账单模态框
function showGenerateBillModal() {
    const modal = document.getElementById('generateBillModal');
    if (!modal) return;

    // 清空表单
    document.getElementById('billCompanyName').value = '';
    document.getElementById('billYear').value = '';
    document.getElementById('billMonth').value = '';
    document.getElementById('billSearchContainerNo').value = '';
    document.getElementById('billSearchBillNo').value = '';
    document.getElementById('billSearchCustomsNo').value = '';

    // 初始化年份选择器
    initYearMonthSelectors();

    // 清空报关数据表格
    const customsDataBody = document.getElementById('customsDataBody');
    if (customsDataBody) {
        customsDataBody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">请先查询报关数据</td></tr>';
    }

    // 清空账单预览
    const billPreviewBody = document.getElementById('billPreviewBody');
    if (billPreviewBody) {
        billPreviewBody.innerHTML = '';
    }

    // 重置费用
    resetFeeInputs();

    // 清空选中数据
    selectedCustomsData = [];
    billPreviewItems = [];

    // 显示模态框
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// 初始化年份和月份选择器
function initYearMonthSelectors() {
    const billYear = document.getElementById('billYear');
    const billMonth = document.getElementById('billMonth');
    const historyYear = document.getElementById('historyYear');

    // 初始化年份选择器（当前年份前后5年）
    const currentYear = new Date().getFullYear();
    if (billYear) {
        billYear.innerHTML = '<option value="">选择年份</option>';
        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year + '年';
            if (year === currentYear) {
                option.selected = true;
            }
            billYear.appendChild(option);
        }
    }

    // 初始化月份选择器
    if (billMonth) {
        billMonth.innerHTML = '<option value="">选择月份</option>';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month + '月';
            if (month === currentYear && month === new Date().getMonth() + 1) {
                option.selected = true;
            }
            billMonth.appendChild(option);
        }
    }

    // 初始化历史账单年份选择器
    if (historyYear) {
        historyYear.innerHTML = '<option value="">选择年份</option>';
        for (let year = currentYear - 5; year <= currentYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year + '年';
            if (year === currentYear) {
                option.selected = true;
            }
            historyYear.appendChild(option);
        }
    }
}

// 初始化生成账单模态框事件
function initGenerateBillModalEvents() {
    try {
        console.log('开始初始化模态框事件...');
        
        // 查询报关数据
        const searchCustomsDataBtn = document.getElementById('searchCustomsData');
        if (searchCustomsDataBtn) {
            searchCustomsDataBtn.addEventListener('click', searchCustomsDataForBill);
        }

        // 全选/取消全选
        const selectAllItems = document.getElementById('selectAllItems');
        if (selectAllItems) {
            selectAllItems.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('#customsDataBody input[type="checkbox"]:not(#selectAllItems)');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                    const rowDataId = checkbox.getAttribute('data-row-id');
                    toggleRowSelection(rowDataId, this.checked);
                });
                updateSelectAllState();
            });
        }

        // 应用所有费用
        const applyAllFeesBtn = document.getElementById('applyAllFees');
        if (applyAllFeesBtn) {
            applyAllFeesBtn.addEventListener('click', applyAllFees);
        }

        // 添加自定义费用
        const addCustomFeeBtn = document.getElementById('addCustomFee');
        if (addCustomFeeBtn) {
            addCustomFeeBtn.addEventListener('click', addCustomFee);
        }

        // 预览账单
        const previewBillBtn = document.getElementById('previewBill');
        if (previewBillBtn) {
            previewBillBtn.addEventListener('click', previewBill);
        }

        // 导出Excel
        const exportBillExcelBtn = document.getElementById('exportBillExcel');
        if (exportBillExcelBtn) {
            exportBillExcelBtn.addEventListener('click', exportBillExcel);
        }

        // 保存账单
        const saveGeneratedBillBtn = document.getElementById('saveGeneratedBill');
        if (saveGeneratedBillBtn) {
            saveGeneratedBillBtn.addEventListener('click', saveGeneratedBill);
        }

        // 搜索预览
        const billPreviewSearchBtn = document.getElementById('billPreviewSearchBtn');
        if (billPreviewSearchBtn) {
            billPreviewSearchBtn.addEventListener('click', searchBillPreview);
        }

        // 历史账单查询
        const searchHistoryBillsBtn = document.getElementById('searchHistoryBills');
        if (searchHistoryBillsBtn) {
            searchHistoryBillsBtn.addEventListener('click', searchHistoryBills);
        }

        // 添加历史账单
        const showUploadHistoryBillFormBtn = document.getElementById('showUploadHistoryBillForm');
        if (showUploadHistoryBillFormBtn) {
            showUploadHistoryBillFormBtn.addEventListener('click', showUploadHistoryBillForm);
        }

        // 提交历史账单
        const submitHistoryBillBtn = document.getElementById('submitHistoryBill');
        if (submitHistoryBillBtn) {
            submitHistoryBillBtn.addEventListener('click', submitHistoryBill);
        }

        // 取消添加历史账单
        const cancelAddHistoryBillBtn = document.getElementById('cancelAddHistoryBill');
        if (cancelAddHistoryBillBtn) {
            cancelAddHistoryBillBtn.addEventListener('click', hideUploadHistoryBillForm);
        }

        // 账单详情相关事件
        const uploadInvoiceBtn = document.getElementById('uploadInvoiceBtn');
        if (uploadInvoiceBtn) {
            uploadInvoiceBtn.addEventListener('click', showUploadInvoice);
        }

        const confirmUploadBtn = document.getElementById('confirmUpload');
        if (confirmUploadBtn) {
            confirmUploadBtn.addEventListener('click', confirmUploadInvoice);
        }

        const cancelUploadBtn = document.getElementById('cancelUpload');
        if (cancelUploadBtn) {
            cancelUploadBtn.addEventListener('click', cancelUpload);
        }

        const confirmBillBtn = document.getElementById('confirmBill');
        if (confirmBillBtn) {
            confirmBillBtn.addEventListener('click', confirmBill);
        }

        const exportDetailExcelBtn = document.getElementById('exportDetailExcel');
        if (exportDetailExcelBtn) {
            exportDetailExcelBtn.addEventListener('click', exportDetailExcel);
        }
        
        console.log('模态框事件初始化完成');
    } catch (error) {
        console.error('初始化模态框事件时发生错误:', error);
    }
}

// 查询报关数据（用于生成账单）
async function searchCustomsDataForBill() {
    const companyName = document.getElementById('billCompanyName').value.trim();
    const year = document.getElementById('billYear').value;
    const month = document.getElementById('billMonth').value;
    const searchContainerNo = document.getElementById('billSearchContainerNo').value.trim();
    const searchBillNo = document.getElementById('billSearchBillNo').value.trim();
    const searchCustomsNo = document.getElementById('billSearchCustomsNo').value.trim();

    if (!year || !month) {
        alert('请选择年份和月份');
        return;
    }

    try {
        // 查询报关数据 - 使用 Tracking 表
        const query = new AV.Query('Tracking');

        // 只查询申报类型的数据
        query.equalTo('operation', '申报');

        console.log('🔍 查询所有申报数据(将在前端按申报日期筛选)...');

        if (searchContainerNo) {
            query.contains('containerNo', searchContainerNo);
        }
        if (searchBillNo) {
            query.contains('billNo', searchBillNo);
        }
        if (searchCustomsNo) {
            query.contains('customsNo', searchCustomsNo);
        }

        query.ascending('arrivalDate');
        query.limit(1000);

        const results = await query.find();
        console.log('✅ 查询到', results.length, '条申报数据(未按日期筛选)');

        // 🔥 在前端按 declareDate (申报日期) 筛选,与报关数据管理页面一致
        const monthPrefix = `${year}-${month.padStart(2, '0')}`;
        const filteredResults = results.filter(item => {
            const declareDate = item.get('declareDate');
            return declareDate && declareDate.startsWith(monthPrefix);
        });

        console.log(`✅ 按 declareDate (${monthPrefix}) 筛选后: ${filteredResults.length} 条数据`);

        // 打印所有数据的申报日期用于调试
        if (results.length > 0) {
            console.log('📋 所有数据的申报日期(declareDate):');
            results.forEach((item, index) => {
                const date = item.get('declareDate');
                const match = date && date.startsWith(monthPrefix) ? '✅' : '❌';
                if (index < 10 || match === '✅') {
                    console.log(`  ${index + 1}. ${date} - ${item.get('containerNo')} ${match}`);
                }
            });
        }

        const customsData = filteredResults.map(item => ({
            id: item.id,
            arrivalDate: item.get('arrivalDate'),
            declareDate: item.get('declareDate') || item.get('arrivalDate'),
            billNo: item.get('billNo'),
            containerNo: item.get('containerNo'),
            customsNo: item.get('customsNo'),
            domesticConsignee: item.get('domesticConsignee'),
            consumptionUnit: item.get('consumptionUnit'),
            country: item.get('country'),
            productName: item.get('productName') || '',
            selected: false,
            leanCloudObject: item
        }));

        // 渲染报关数据表格
        renderCustomsDataTable(customsData);

    } catch (error) {
        console.error('查询报关数据失败:', error);
        
        // 检查是否是表不存在的错误
        if (error.code === 404 || (error.message && error.message.includes("doesn't exists"))) {
            alert('报关数据表(Tracking)不存在,请先在LeanCloud控制台创建该表。\n\n或者您可以使用"历史账单"功能直接添加历史账单。');
        } else {
            alert('查询报关数据失败: ' + (error.message || '未知错误'));
        }
        
        // 清空表格
        renderCustomsDataTable([]);
    }
}

// 渲染报关数据表格
function renderCustomsDataTable(data) {
    const tbody = document.getElementById('customsDataBody');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">未找到匹配的报关数据</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item, index) => `
        <tr data-row-id="${item.id}">
            <td>
                <input type="checkbox" data-row-id="${item.id}" ${item.selected ? 'checked' : ''}>
            </td>
            <td>${index + 1}</td>
            <td>${item.arrivalDate || ''}</td>
            <td>${item.declareDate || ''}</td>
            <td>${item.billNo || ''}</td>
            <td>${item.containerNo || ''}</td>
            <td>${item.customsNo || ''}</td>
            <td>${item.domesticConsignee || ''}</td>
            <td>${item.consumptionUnit || ''}</td>
            <td>${item.country || ''}</td>
            <td>${item.productName || ''}</td>
        </tr>
    `).join('');

    // 绑定复选框事件
    tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const rowId = this.getAttribute('data-row-id');
            toggleRowSelection(rowId, this.checked);
            updateSelectAllState();
        });
    });

    selectedCustomsData = data.filter(item => item.selected);
}

// 切换行选择状态
function toggleRowSelection(rowId, selected) {
    const row = document.querySelector(`#customsDataBody tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const itemIndex = selectedCustomsData.findIndex(item => item.id === rowId);

    if (selected && itemIndex === -1) {
        // 添加到选中列表
        const allData = Array.from(document.querySelectorAll('#customsDataBody tr[data-row-id]')).map(tr => {
            const id = tr.getAttribute('data-row-id');
            const cells = tr.querySelectorAll('td');
            return {
                id: id,
                arrivalDate: cells[2].textContent,
                declareDate: cells[3].textContent,
                billNo: cells[4].textContent,
                containerNo: cells[5].textContent,
                customsNo: cells[6].textContent,
                domesticConsignee: cells[7].textContent,
                consumptionUnit: cells[8].textContent,
                country: cells[9].textContent,
                productName: cells[10].textContent,
                selected: true
            };
        });

        const item = allData.find(item => item.id === rowId);
        if (item) {
            selectedCustomsData.push(item);
        }
    } else if (!selected && itemIndex !== -1) {
        // 从选中列表移除
        selectedCustomsData.splice(itemIndex, 1);
    }
}

// 更新全选状态
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllItems');
    const checkboxes = document.querySelectorAll('#customsDataBody input[type="checkbox"]:not(#selectAllItems)');

    if (checkboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }

    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// 重置费用输入
function resetFeeInputs() {
    document.getElementById('customsFee').value = 0;
    document.getElementById('inspectionFee').value = 0;
    document.getElementById('documentFee').value = 0;
    document.getElementById('otherFee1').value = 0;
    document.getElementById('otherFee2').value = 0;
    document.getElementById('otherFee1Name').value = '其他费用1';
    document.getElementById('otherFee2Name').value = '其他费用2';

    // 清空自定义费用
    const customFeesContainer = document.getElementById('customFeesContainer');
    if (customFeesContainer) {
        customFeesContainer.innerHTML = '';
    }
}

// 应用所有费用
function applyAllFees() {
    if (selectedCustomsData.length === 0) {
        alert('请先选择报关数据');
        return;
    }

    const customsFee = parseFloat(document.getElementById('customsFee').value) || 0;
    const inspectionFee = parseFloat(document.getElementById('inspectionFee').value) || 0;
    const documentFee = parseFloat(document.getElementById('documentFee').value) || 0;
    const otherFee1 = parseFloat(document.getElementById('otherFee1').value) || 0;
    const otherFee2 = parseFloat(document.getElementById('otherFee2').value) || 0;
    const otherFee1Name = document.getElementById('otherFee1Name').value;
    const otherFee2Name = document.getElementById('otherFee2Name').value;

    billPreviewItems = selectedCustomsData.map((item, index) => ({
        id: index + 1,
        ...item,
        customsFee: customsFee,
        inspectionFee: inspectionFee,
        documentFee: documentFee,
        otherFee1: otherFee1,
        otherFee2: otherFee2,
        otherFee1Name: otherFee1Name,
        otherFee2Name: otherFee2Name,
        otherFee3: 0,
        otherFee4: 0,
        otherFee3Name: '',
        otherFee4Name: '',
        remark: '',
        total: customsFee + inspectionFee + documentFee + otherFee1 + otherFee2
    }));

    renderBillPreviewTable();
}

// 渲染账单预览表格
function renderBillPreviewTable() {
    const tbody = document.getElementById('billPreviewBody');
    if (!tbody) return;

    if (billPreviewItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="text-center text-muted">请先选择报关数据并应用费用</td></tr>';
        return;
    }

    tbody.innerHTML = billPreviewItems.map((item, index) => `
        <tr data-item-id="${item.id}">
            <td>${item.id}</td>
            <td>${item.arrivalDate || ''}</td>
            <td>${item.billNo || ''}</td>
            <td>${item.containerNo || ''}</td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" data-field="customsFee" data-item-id="${item.id}" value="${item.customsFee}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" data-field="inspectionFee" data-item-id="${item.id}" value="${item.inspectionFee}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" data-field="documentFee" data-item-id="${item.id}" value="${item.documentFee}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" data-field="otherFee1" data-item-id="${item.id}" value="${item.otherFee1}" step="0.01" min="0">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm fee-edit-input" data-field="otherFee2" data-item-id="${item.id}" value="${item.otherFee2}" step="0.01" min="0">
            </td>
            <td id="total-${item.id}">${item.total.toFixed(2)}</td>
            <td>
                <input type="text" class="form-control form-control-sm" data-field="remark" data-item-id="${item.id}" value="${item.remark}" placeholder="备注">
            </td>
        </tr>
    `).join('');

    // 绑定费用编辑事件
    bindFeeEditEvents();

    // 更新总计
    updateGrandTotal();
}

// 绑定费用编辑事件
function bindFeeEditEvents() {
    const inputs = document.querySelectorAll('#billPreviewBody .fee-edit-input');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            const itemId = this.getAttribute('data-item-id');
            const field = this.getAttribute('data-field');
            const value = parseFloat(this.value) || 0;

            const item = billPreviewItems.find(item => item.id === parseInt(itemId));
            if (item) {
                item[field] = value;
                updateRowTotal(itemId);
                updateGrandTotal();
            }
        });
    });

    // 绑定备注编辑事件
    const remarkInputs = document.querySelectorAll('#billPreviewBody input[data-field="remark"]');
    remarkInputs.forEach(input => {
        input.addEventListener('change', function() {
            const itemId = this.getAttribute('data-item-id');
            const value = this.value;

            const item = billPreviewItems.find(item => item.id === parseInt(itemId));
            if (item) {
                item.remark = value;
            }
        });
    });
}

// 更新单行合计
function updateRowTotal(itemId) {
    const item = billPreviewItems.find(item => item.id === parseInt(itemId));
    if (!item) return;

    item.total = (item.customsFee || 0) + (item.inspectionFee || 0) + (item.documentFee || 0) +
                 (item.otherFee1 || 0) + (item.otherFee2 || 0) + (item.otherFee3 || 0) + (item.otherFee4 || 0);

    const totalCell = document.getElementById(`total-${itemId}`);
    if (totalCell) {
        totalCell.textContent = item.total.toFixed(2);
    }
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

    billPreviewItems.forEach(item => {
        totalCustomsFee += item.customsFee || 0;
        totalInspectionFee += item.inspectionFee || 0;
        totalDocumentFee += item.documentFee || 0;
        totalOtherFee1 += item.otherFee1 || 0;
        totalOtherFee2 += item.otherFee2 || 0;
        totalOtherFee3 += item.otherFee3 || 0;
        totalOtherFee4 += item.otherFee4 || 0;
        grandTotal += item.total || 0;
    });

    const totalCustomsFeeCell = document.getElementById('totalCustomsFee');
    const totalInspectionFeeCell = document.getElementById('totalInspectionFee');
    const totalDocumentFeeCell = document.getElementById('totalDocumentFee');
    const totalOtherFee1Cell = document.getElementById('totalOtherFee1');
    const totalOtherFee2Cell = document.getElementById('totalOtherFee2');
    const totalOtherFee3Cell = document.getElementById('totalOtherFee3');
    const totalOtherFee4Cell = document.getElementById('totalOtherFee4');
    const grandTotalCell = document.getElementById('grandTotal');

    if (totalCustomsFeeCell) totalCustomsFeeCell.textContent = totalCustomsFee.toFixed(2);
    if (totalInspectionFeeCell) totalInspectionFeeCell.textContent = totalInspectionFee.toFixed(2);
    if (totalDocumentFeeCell) totalDocumentFeeCell.textContent = totalDocumentFee.toFixed(2);
    if (totalOtherFee1Cell) totalOtherFee1Cell.textContent = totalOtherFee1.toFixed(2);
    if (totalOtherFee2Cell) totalOtherFee2Cell.textContent = totalOtherFee2.toFixed(2);
    if (totalOtherFee3Cell) totalOtherFee3Cell.textContent = totalOtherFee3.toFixed(2);
    if (totalOtherFee4Cell) totalOtherFee4Cell.textContent = totalOtherFee4.toFixed(2);
    if (grandTotalCell) grandTotalCell.textContent = grandTotal.toFixed(2);
}

// 预览账单
function previewBill() {
    if (billPreviewItems.length === 0) {
        alert('请先选择报关数据并应用费用');
        return;
    }

    renderBillPreviewTable();
    alert('账单预览已更新');
}

// 搜索账单预览
function searchBillPreview() {
    const searchType = document.getElementById('billPreviewSearchType').value;
    const searchText = document.getElementById('billPreviewSearch').value.trim();

    if (!searchText) {
        renderBillPreviewTable();
        return;
    }

    const filteredItems = billPreviewItems.filter(item => {
        switch (searchType) {
            case 'containerNo':
                return item.containerNo && item.containerNo.includes(searchText);
            case 'billNo':
                return item.billNo && item.billNo.includes(searchText);
            case 'customsNo':
                return item.customsNo && item.customsNo.includes(searchText);
            default:
                return false;
        }
    });

    // 临时渲染过滤后的结果
    const tbody = document.getElementById('billPreviewBody');
    if (!tbody) return;

    if (filteredItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="text-center text-muted">未找到匹配结果</td></tr>';
        return;
    }

    tbody.innerHTML = filteredItems.map((item, index) => `
        <tr data-item-id="${item.id}">
            <td>${index + 1}</td>
            <td>${item.arrivalDate || ''}</td>
            <td>${item.billNo || ''}</td>
            <td>${item.containerNo || ''}</td>
            <td>${item.customsFee.toFixed(2)}</td>
            <td>${item.inspectionFee.toFixed(2)}</td>
            <td>${item.documentFee.toFixed(2)}</td>
            <td>${item.otherFee1.toFixed(2)}</td>
            <td>${item.otherFee2.toFixed(2)}</td>
            <td>${item.total.toFixed(2)}</td>
            <td>${item.remark || ''}</td>
        </tr>
    `).join('');
}

// 添加自定义费用
function addCustomFee() {
    const customFeesContainer = document.getElementById('customFeesContainer');
    if (!customFeesContainer) return;

    const feeId = Date.now();
    const feeHTML = `
        <div class="row g-3 custom-fee-item" id="custom-fee-${feeId}">
            <div class="col-md-6">
                <div class="input-group">
                    <input type="text" class="form-control" placeholder="费用名称" id="custom-fee-name-${feeId}">
                    <input type="number" class="form-control fee-input" id="custom-fee-value-${feeId}" step="0.01" min="0" value="0">
                </div>
            </div>
            <div class="col-md-3">
                <button class="btn btn-outline-danger" onclick="removeCustomFee(${feeId})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        </div>
    `;

    customFeesContainer.insertAdjacentHTML('beforeend', feeHTML);
}

// 删除自定义费用
function removeCustomFee(feeId) {
    const feeElement = document.getElementById(`custom-fee-${feeId}`);
    if (feeElement) {
        feeElement.remove();
    }
}

// 导出账单Excel
function exportBillExcel() {
    if (billPreviewItems.length === 0) {
        alert('请先生成账单预览');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('XLSX库未加载，请检查网络连接');
        return;
    }

    try {
        // 获取账单基本信息
        const companyName = document.getElementById('billCompanyName').value.trim();
        const year = document.getElementById('billYear').value;
        const month = document.getElementById('billMonth').value;

        // 第一行：公司名称和期间（合并单元格A-G，居中）
        const headerRow1 = [`${companyName}  ${year}年${month}月报关费`, '', '', '', '', '', ''];

        // 第二行：表头
        const headerRow2 = ['序号', '到港时间', '提单号', '柜号', '报关费', '合计', '备注'];

        // 准备数据行
        const dataRows = billPreviewItems.map((item, index) => [
            index + 1,
            item.arrivalDate || '',
            item.billNo || '',
            item.containerNo || '',
            item.customsFee || 0,
            item.total || 0,
            item.remark || ''
        ]);

        // 空行
        const emptyRow = ['', '', '', '', '', '', ''];

        // 合计金额行：A列写"合计"，E列报关费求和，F列合计求和
        const totalRow = [
            '合计',
            '',
            '',
            '',
            billPreviewItems.reduce((sum, item) => sum + (item.customsFee || 0), 0),
            billPreviewItems.reduce((sum, item) => sum + (item.total || 0), 0),
            ''
        ];

        // 备注行（合并单元格A-G）
        const remarkRow = ['备注：如冷库根据本模板提供每月费用明细清单，则优合给予冷库优先对账政策。', '', '', '', '', '', ''];

        // 合并所有行
        const wsData = [
            headerRow1,
            headerRow2,
            ...dataRows,
            emptyRow,
            totalRow,
            remarkRow
        ];

        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // 设置合并单元格
        if (!ws['!merges']) ws['!merges'] = [];

        // 第一行合并A-G (A1:G1)
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });

        // 最后一行（备注）合并A-G
        const lastRowIndex = wsData.length - 1;
        ws['!merges'].push({ s: { r: lastRowIndex, c: 0 }, e: { r: lastRowIndex, c: 6 } });

        // 设置列宽
        ws['!cols'] = [
            { wch: 6 },   // 序号
            { wch: 12 },  // 到港时间
            { wch: 20 },  // 提单号
            { wch: 15 },  // 柜号
            { wch: 12 },  // 报关费
            { wch: 12 },  // 合计
            { wch: 30 }   // 备注
        ];

        // 定义边框样式
        const borderStyle = {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } }
        };

        // 为所有单元格设置边框
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) continue;
                if (!ws[cellAddress].s) ws[cellAddress].s = {};
                ws[cellAddress].s.border = borderStyle;
            }
        }

        // 设置第一行样式（加粗、居中、边框）
        if (ws['A1']) {
            ws['A1'].s = {
                font: { bold: true, sz: 12 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: borderStyle
            };
        }

        // 设置最后一行备注样式（加粗、左对齐、自动换行、边框）
        if (ws[`A${lastRowIndex + 1}`]) {
            ws[`A${lastRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
                border: borderStyle
            };
        }

        // 设置第二行表头样式（加粗、居中、边框）
        ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2'].forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    font: { bold: true },
                    alignment: { horizontal: 'center' },
                    border: borderStyle
                };
            }
        });

        // 设置合计行样式（加粗、边框）
        const totalRowIndex = wsData.length - 2;
        if (ws[`A${totalRowIndex + 1}`]) {
            ws[`A${totalRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'center' },
                border: borderStyle
            };
        }
        if (ws[`E${totalRowIndex + 1}`]) {
            ws[`E${totalRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'right' },
                border: borderStyle,
                numFmt: '#,##0.00'
            };
        }
        if (ws[`F${totalRowIndex + 1}`]) {
            ws[`F${totalRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'right' },
                border: borderStyle,
                numFmt: '#,##0.00'
            };
        }

        // 为数据行的数值列设置数字格式和右对齐
        for (let i = 0; i < dataRows.length; i++) {
            const row = i + 3; // 从第3行开始（前两行是标题）
            const ECell = `E${row}`;
            const FCell = `F${row}`;
            if (ws[ECell]) {
                if (!ws[ECell].s) ws[ECell].s = {};
                ws[ECell].s.numFmt = '#,##0.00';
                ws[ECell].s.alignment = { horizontal: 'right' };
                ws[ECell].s.border = borderStyle;
            }
            if (ws[FCell]) {
                if (!ws[FCell].s) ws[FCell].s = {};
                ws[FCell].s.numFmt = '#,##0.00';
                ws[FCell].s.alignment = { horizontal: 'right' };
                ws[FCell].s.border = borderStyle;
            }
        }

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '报关费账单');

        // 生成文件名
        const now = new Date();
        const yearStr = now.getFullYear();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const dayStr = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const fileName = `报关费账单_${companyName}_${year}年${month}月_${yearStr}${monthStr}${dayStr}_${hours}${minutes}.xlsx`;

        // 导出文件
        XLSX.writeFile(wb, fileName);

        console.log('账单Excel导出成功:', fileName);
        alert('账单导出成功！');

    } catch (error) {
        console.error('导出账单Excel失败:', error);
        alert('导出失败: ' + error.message);
    }
}

// 保存生成的账单
async function saveGeneratedBill() {
    const companyName = document.getElementById('billCompanyName').value.trim();
    const year = document.getElementById('billYear').value;
    const month = document.getElementById('billMonth').value;

    if (!companyName || !year || !month) {
        alert('请填写公司名称并选择年份和月份');
        return;
    }

    if (billPreviewItems.length === 0) {
        alert('请先选择报关数据并应用费用');
        return;
    }

    // 计算总金额
    const totalAmount = billPreviewItems.reduce((sum, item) => sum + (item.total || 0), 0);

    // 生成账单编号
    const billNo = generateBillNo();

    // 获取账单日期
    const billDate = new Date().toISOString().split('T')[0];

    try {
        const bill = AV.Object('Bills');
        bill.set('billNo', billNo);
        bill.set('billDate', billDate);
        bill.set('companyName', companyName);
        bill.set('totalAmount', totalAmount);
        bill.set('currency', 'CNY');
        bill.set('billStatus', '未确认');
        bill.set('year', String(year));
        bill.set('month', String(month));
        bill.set('billItems', billPreviewItems);
        bill.set('attachments', []);

        await bill.save();

        alert('账单保存成功');

        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('generateBillModal'));
        if (modal) {
            modal.hide();
        }

        // 刷新账单列表
        loadBills();

    } catch (error) {
        console.error('保存账单失败:', error);
        alert('保存账单失败: ' + error.message);
    }
}

// 生成账单编号
function generateBillNo() {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `BILL${year}${month}${day}${random}`;
}

// 显示历史账单模态框
function showHistoryBillsModal() {
    const modal = document.getElementById('historyBillsModal');
    if (!modal) return;

    // 初始化年份和月份选择器
    initYearMonthSelectors();

    // 清空历史账单列表
    const historyBillsBody = document.getElementById('historyBillsBody');
    if (historyBillsBody) {
        historyBillsBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">请查询历史账单</td></tr>';
    }

    // 隐藏添加表单
    hideUploadHistoryBillForm();

    // 显示模态框
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// 查询历史账单
async function searchHistoryBills() {
    const year = document.getElementById('historyYear').value;
    const month = document.getElementById('historyMonth').value;

    if (!year) {
        alert('请选择年份');
        return;
    }

    try {
        const query = new AV.Query('Bills');
        query.equalTo('year', String(year));

        if (month) {
            query.equalTo('month', String(month));
        }

        query.descending('billDate');
        query.limit(1000);

        const results = await query.find();

        const historyBills = results.map(bill => ({
            id: bill.id,
            billNo: bill.get('billNo'),
            billDate: bill.get('billDate'),
            companyName: bill.get('companyName'),
            totalAmount: bill.get('totalAmount'),
            year: bill.get('year'),
            month: bill.get('month'),
            billStatus: bill.get('billStatus'),
            attachments: bill.get('attachments') || [],
            leanCloudObject: bill
        }));

        renderHistoryBillsTable(historyBills);

    } catch (error) {
        console.error('查询历史账单失败:', error);
        
        // 检查是否是表不存在的错误
        if (error.code === 404 || (error.message && error.message.includes("doesn't exists"))) {
            alert('账单表(Bills)不存在,请先在LeanCloud控制台创建该表。\n\n您可以在"生成账单"功能中创建第一条账单,数据表会自动创建。');
            renderHistoryBillsTable([]);
        } else {
            alert('查询历史账单失败: ' + (error.message || '未知错误'));
        }
    }
}

// 渲染历史账单表格
function renderHistoryBillsTable(data) {
    const tbody = document.getElementById('historyBillsBody');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">未找到历史账单</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((bill, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${bill.billNo || ''}</td>
            <td>${bill.billDate || ''}</td>
            <td>${bill.companyName || ''}</td>
            <td>${formatCurrency(bill.totalAmount)}</td>
            <td>${bill.year || ''}</td>
            <td>${bill.month || ''}</td>
            <td><span class="badge ${getBillStatusBadgeClass(bill.billStatus)}">${bill.billStatus}</span></td>
            <td>${bill.attachments.length > 0 ? bill.attachments.length + '个附件' : '无'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="showBillDetail('${bill.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteBill('${bill.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 显示添加历史账单表单
function showUploadHistoryBillForm() {
    const form = document.getElementById('addHistoryBillForm');
    if (form) {
        form.style.display = 'block';
    }
}

// 隐藏添加历史账单表单
function hideUploadHistoryBillForm() {
    const form = document.getElementById('addHistoryBillForm');
    if (form) {
        form.style.display = 'none';
    }
}

// 提交历史账单
async function submitHistoryBill() {
    const companyName = document.getElementById('historyCompanyName').value.trim();
    const totalAmount = document.getElementById('historyTotalAmount').value;
    const historyBillFile = document.getElementById('historyBillFile').files[0];

    if (!companyName || !totalAmount || !historyBillFile) {
        alert('请填写完整信息');
        return;
    }

    try {
        // 上传文件
        const file = new AV.File(historyBillFile.name, historyBillFile);
        const savedFile = await file.save();

        // 创建账单记录
        const bill = AV.Object('Bills');
        bill.set('billNo', generateBillNo());
        bill.set('billDate', new Date().toISOString().split('T')[0]);
        bill.set('companyName', companyName);
        bill.set('totalAmount', parseFloat(totalAmount));
        bill.set('currency', 'CNY');
        bill.set('billStatus', '已确认');
        bill.set('billItems', []);
        bill.set('attachments', [{
            id: 1,
            type: getFileType(historyBillFile.name),
            name: historyBillFile.name,
            uploadTime: new Date().toISOString(),
            fileUrl: savedFile.url(),
            fileId: savedFile.id,
            fileName: historyBillFile.name
        }]);

        await bill.save();

        alert('历史账单保存成功');

        // 清空表单
        document.getElementById('historyCompanyName').value = '';
        document.getElementById('historyTotalAmount').value = '';
        document.getElementById('historyBillFile').value = '';

        hideUploadHistoryBillForm();

        // 刷新列表
        searchHistoryBills();

    } catch (error) {
        console.error('保存历史账单失败:', error);
        alert('保存历史账单失败: ' + error.message);
    }
}

// 获取文件类型
function getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const types = {
        'pdf': 'PDF',
        'xlsx': 'Excel',
        'xls': 'Excel',
        'json': 'JSON'
    };
    return types[ext] || '其他';
}

// 显示账单详情
async function showBillDetail(billId) {
    try {
        const query = new AV.Query('Bills');
        const bill = await query.get(billId);

        // 填充基本信息
        document.getElementById('detailBillNo').textContent = bill.get('billNo') || '';
        document.getElementById('detailCompanyName').textContent = bill.get('companyName') || '';
        document.getElementById('detailBillDate').textContent = bill.get('billDate') || '';
        document.getElementById('detailBillStatus').textContent = bill.get('billStatus') || '';
        document.getElementById('detailTotalAmount').textContent = formatCurrency(bill.get('totalAmount'), bill.get('currency'));
        document.getElementById('detailPaymentDate').textContent = bill.get('paymentDate') || '';
        document.getElementById('detailPayee').textContent = bill.get('payee') || '';
        document.getElementById('detailRemark').textContent = bill.get('remark') || '';

        // 渲染账单明细
        const billItems = bill.get('billItems') || [];
        const billDetailItems = document.getElementById('billDetailItems');
        if (billItems.length > 0) {
            billDetailItems.innerHTML = billItems.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.arrivalDate || ''}</td>
                    <td>${item.billNo || ''}</td>
                    <td>${item.containerNo || ''}</td>
                    <td>${item.customsNo || ''}</td>
                    <td>${item.customsFee || 0}</td>
                    <td>${item.inspectionFee || 0}</td>
                    <td>${item.documentFee || 0}</td>
                    <td>${item.otherFee1 || 0}</td>
                    <td>${item.otherFee2 || 0}</td>
                    <td>${item.total || 0}</td>
                    <td>${item.remark || ''}</td>
                </tr>
            `).join('');
        } else {
            billDetailItems.innerHTML = '<tr><td colspan="13" class="text-center text-muted">暂无明细</td></tr>';
        }

        // 渲染附件列表
        const attachments = bill.get('attachments') || [];
        renderInvoiceList(attachments);

        // 保存当前账单ID
        window.currentBillId = billId;
        window.currentBillObject = bill;

        // 确认账单按钮状态
        const confirmBillBtn = document.getElementById('confirmBill');
        if (confirmBillBtn) {
            confirmBillBtn.disabled = bill.get('billStatus') === '已确认';
        }

        // 显示模态框
        const modal = document.getElementById('billDetailModal');
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

    } catch (error) {
        console.error('获取账单详情失败:', error);
        alert('获取账单详情失败: ' + error.message);
    }
}

// 渲染发票列表
function renderInvoiceList(attachments) {
    const tbody = document.getElementById('invoiceList');
    if (!tbody) return;

    if (attachments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">暂无附件</td></tr>';
        return;
    }

    tbody.innerHTML = attachments.map((attachment, index) => `
        <tr>
            <td>${attachment.name || attachment.fileName || ''}</td>
            <td>${attachment.type || '其他'}</td>
            <td>${new Date(attachment.uploadTime).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="downloadAttachment(${index})">
                    <i class="fas fa-download"></i> 下载
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteInvoice(${index})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </td>
        </tr>
    `).join('');
}

// 显示上传发票区域
function showUploadInvoice() {
    const section = document.getElementById('invoiceUploadSection');
    if (section) {
        section.style.display = 'block';
    }
}

// 确认上传发票
async function confirmUploadInvoice() {
    const invoiceUpload = document.getElementById('invoiceUpload');
    const file = invoiceUpload.files[0];

    if (!file) {
        alert('请选择文件');
        return;
    }

    try {
        const avFile = new AV.File(file.name, file);
        const savedFile = await avFile.save();

        // 更新附件列表
        if (!window.currentBillObject) return;

        const attachments = window.currentBillObject.get('attachments') || [];
        attachments.push({
            id: attachments.length + 1,
            type: getFileType(file.name),
            name: file.name,
            uploadTime: new Date().toISOString(),
            fileUrl: savedFile.url(),
            fileId: savedFile.id,
            fileName: file.name
        });

        window.currentBillObject.set('attachments', attachments);
        await window.currentBillObject.save();

        renderInvoiceList(attachments);

        // 隐藏上传区域
        cancelUpload();

        alert('文件上传成功');

    } catch (error) {
        console.error('上传文件失败:', error);
        alert('上传文件失败: ' + error.message);
    }
}

// 取消上传
function cancelUpload() {
    const section = document.getElementById('invoiceUploadSection');
    const invoiceUpload = document.getElementById('invoiceUpload');

    if (section) {
        section.style.display = 'none';
    }
    if (invoiceUpload) {
        invoiceUpload.value = '';
    }
}

// 删除发票
async function deleteInvoice(index) {
    if (!confirm('确定要删除这个附件吗？')) {
        return;
    }

    try {
        if (!window.currentBillObject) return;

        const attachments = window.currentBillObject.get('attachments') || [];
        const attachment = attachments[index];

        // 删除LeanCloud文件
        if (attachment.fileId) {
            const file = AV.Object.createWithoutData('_File', attachment.fileId);
            await file.destroy();
        }

        // 从附件列表移除
        attachments.splice(index, 1);
        window.currentBillObject.set('attachments', attachments);
        await window.currentBillObject.save();

        renderInvoiceList(attachments);

        alert('附件删除成功');

    } catch (error) {
        console.error('删除附件失败:', error);
        alert('删除附件失败: ' + error.message);
    }
}

// 下载附件
function downloadAttachment(index) {
    if (!window.currentBillObject) return;

    const attachments = window.currentBillObject.get('attachments') || [];
    const attachment = attachments[index];

    if (attachment.fileUrl) {
        window.open(attachment.fileUrl, '_blank');
    }
}

// 确认账单
async function confirmBill() {
    if (!window.currentBillObject) return;

    if (!confirm('确定要确认此账单吗？确认后将不可修改。')) {
        return;
    }

    try {
        window.currentBillObject.set('billStatus', '已确认');
        await window.currentBillObject.save();

        alert('账单确认成功');

        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('billDetailModal'));
        if (modal) {
            modal.hide();
        }

        // 刷新列表
        loadBills();

    } catch (error) {
        console.error('确认账单失败:', error);
        alert('确认账单失败: ' + error.message);
    }
}

// 导出账单详情Excel
function exportDetailExcel() {
    if (!window.currentBillObject) {
        alert('未加载账单详情');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('XLSX库未加载，请检查网络连接');
        return;
    }

    try {
        const bill = window.currentBillObject;
        const billNo = bill.get('billNo') || '';
        const companyName = bill.get('companyName') || '';
        const billDate = bill.get('billDate') || '';
        const year = bill.get('year') || '';
        const month = bill.get('month') || '';
        const billItems = bill.get('billItems') || [];

        if (billItems.length === 0) {
            alert('该账单没有明细数据');
            return;
        }

        // 第一行：公司名称和期间（合并单元格A-G，居中）
        const headerRow1 = [`${companyName}  ${year}年${month}月报关费`, '', '', '', '', '', ''];

        // 第二行：表头
        const headerRow2 = ['序号', '到港时间', '提单号', '柜号', '报关费', '合计', '备注'];

        // 准备数据行
        const dataRows = billItems.map((item, index) => [
            index + 1,
            item.arrivalDate || '',
            item.billNo || '',
            item.containerNo || '',
            item.customsFee || 0,
            item.total || 0,
            item.remark || ''
        ]);

        // 空行
        const emptyRow = ['', '', '', '', '', '', ''];

        // 合计金额行：A列写"合计"，E列报关费求和，F列合计求和
        const totalRow = [
            '合计',
            '',
            '',
            '',
            billItems.reduce((sum, item) => sum + (item.customsFee || 0), 0),
            billItems.reduce((sum, item) => sum + (item.total || 0), 0),
            ''
        ];

        // 备注行（合并单元格A-G）
        const remarkRow = ['备注：如冷库根据本模板提供每月费用明细清单，则优合给予冷库优先对账政策。', '', '', '', '', '', ''];

        // 合并所有行
        const wsData = [
            headerRow1,
            headerRow2,
            ...dataRows,
            emptyRow,
            totalRow,
            remarkRow
        ];

        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // 设置合并单元格
        if (!ws['!merges']) ws['!merges'] = [];

        // 第一行合并A-G (A1:G1)
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });

        // 最后一行（备注）合并A-G
        const lastRowIndex = wsData.length - 1;
        ws['!merges'].push({ s: { r: lastRowIndex, c: 0 }, e: { r: lastRowIndex, c: 6 } });

        // 设置列宽
        ws['!cols'] = [
            { wch: 6 },   // 序号
            { wch: 12 },  // 到港时间
            { wch: 20 },  // 提单号
            { wch: 15 },  // 柜号
            { wch: 12 },  // 报关费
            { wch: 12 },  // 合计
            { wch: 30 }   // 备注
        ];

        // 定义边框样式
        const borderStyle = {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } }
        };

        // 为所有单元格设置边框
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) continue;
                if (!ws[cellAddress].s) ws[cellAddress].s = {};
                ws[cellAddress].s.border = borderStyle;
            }
        }

        // 设置第一行样式（加粗、居中、边框）
        if (ws['A1']) {
            ws['A1'].s = {
                font: { bold: true, sz: 12 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: borderStyle
            };
        }

        // 设置最后一行备注样式（加粗、左对齐、自动换行、边框）
        if (ws[`A${lastRowIndex + 1}`]) {
            ws[`A${lastRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
                border: borderStyle
            };
        }

        // 设置第二行表头样式（加粗、居中、边框）
        ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2'].forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    font: { bold: true },
                    alignment: { horizontal: 'center' },
                    border: borderStyle
                };
            }
        });

        // 设置合计行样式（加粗、边框）
        const totalRowIndex = wsData.length - 2;
        if (ws[`A${totalRowIndex + 1}`]) {
            ws[`A${totalRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'center' },
                border: borderStyle
            };
        }
        if (ws[`E${totalRowIndex + 1}`]) {
            ws[`E${totalRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'right' },
                border: borderStyle,
                numFmt: '#,##0.00'
            };
        }
        if (ws[`F${totalRowIndex + 1}`]) {
            ws[`F${totalRowIndex + 1}`].s = {
                font: { bold: true },
                alignment: { horizontal: 'right' },
                border: borderStyle,
                numFmt: '#,##0.00'
            };
        }

        // 为数据行的数值列设置数字格式和右对齐
        for (let i = 0; i < dataRows.length; i++) {
            const row = i + 3; // 从第3行开始（前两行是标题）
            const ECell = `E${row}`;
            const FCell = `F${row}`;
            if (ws[ECell]) {
                if (!ws[ECell].s) ws[ECell].s = {};
                ws[ECell].s.numFmt = '#,##0.00';
                ws[ECell].s.alignment = { horizontal: 'right' };
                ws[ECell].s.border = borderStyle;
            }
            if (ws[FCell]) {
                if (!ws[FCell].s) ws[FCell].s = {};
                ws[FCell].s.numFmt = '#,##0.00';
                ws[FCell].s.alignment = { horizontal: 'right' };
                ws[FCell].s.border = borderStyle;
            }
        }

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '报关费账单');

        // 生成文件名
        const now = new Date();
        const yearStr = now.getFullYear();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const dayStr = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const fileName = `报关费账单_${companyName}_${year}年${month}月_${yearStr}${monthStr}${dayStr}_${hours}${minutes}.xlsx`;

        // 导出文件
        XLSX.writeFile(wb, fileName);

        console.log('账单详情Excel导出成功:', fileName);
        alert('账单详情导出成功！');

    } catch (error) {
        console.error('导出账单详情Excel失败:', error);
        alert('导出失败: ' + error.message);
    }
}

// 导出账单列表
function exportBills() {
    if (!filteredBillsData || filteredBillsData.length === 0) {
        alert('没有可导出的账单数据');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('XLSX库未加载，请检查网络连接');
        return;
    }

    try {
        // 准备表头
        const headers = [
            '序号',
            '账单编号',
            '账单日期',
            '公司名称',
            '账单金额',
            '币种',
            '账单状态',
            '收款日期',
            '收款人',
            '账单数量',
            '年份',
            '月份',
            '备注'
        ];

        // 准备数据
        const data = filteredBillsData.map((bill, index) => ({
            '序号': index + 1,
            '账单编号': bill.billNo || '',
            '账单日期': bill.billDate || '',
            '公司名称': bill.companyName || '',
            '账单金额': bill.totalAmount || 0,
            '币种': bill.currency || 'CNY',
            '账单状态': bill.billStatus || '',
            '收款日期': bill.paymentDate || '',
            '收款人': bill.payee || '',
            '账单数量': bill.billItems ? bill.billItems.length : 0,
            '年份': bill.year || '',
            '月份': bill.month || '',
            '备注': bill.remark || ''
        }));

        // 计算统计信息
        let totalAmount = 0;
        let unconfirmedCount = 0;
        let confirmedCount = 0;
        let paidCount = 0;

        filteredBillsData.forEach(bill => {
            totalAmount += bill.totalAmount || 0;
            if (bill.billStatus === '未确认') unconfirmedCount++;
            else if (bill.billStatus === '已确认') confirmedCount++;
            else if (bill.billStatus === '已收款') paidCount++;
        });

        // 创建工作簿
        const wb = XLSX.utils.book_new();

        // 创建账单列表工作表
        const wsData = [headers];
        data.forEach(row => {
            wsData.push(headers.map(header => row[header]));
        });

        // 添加总计行
        wsData.push(headers.map((header, idx) => {
            if (idx === 0) return '总计';
            if (header === '账单金额') return totalAmount;
            if (header === '账单数量') return filteredBillsData.length;
            return '';
        }));

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // 设置列宽
        ws['!cols'] = [
            { wch: 6 },   // 序号
            { wch: 20 },  // 账单编号
            { wch: 12 },  // 账单日期
            { wch: 30 },  // 公司名称
            { wch: 12 },  // 账单金额
            { wch: 8 },   // 币种
            { wch: 10 },  // 账单状态
            { wch: 12 },  // 收款日期
            { wch: 15 },  // 收款人
            { wch: 10 },  // 账单数量
            { wch: 8 },   // 年份
            { wch: 8 },   // 月份
            { wch: 30 }   // 备注
        ];

        XLSX.utils.book_append_sheet(wb, ws, '账单列表');

        // 创建统计汇总工作表
        const summaryData = [
            ['账单统计汇总'],
            ['', ''],
            ['基本统计'],
            ['账单总数', filteredBillsData.length],
            ['账单总金额', totalAmount],
            ['', ''],
            ['按状态统计'],
            ['未确认', unconfirmedCount],
            ['已确认', confirmedCount],
            ['已收款', paidCount],
            ['', ''],
            ['状态汇总'],
            ['未确认金额', filteredBillsData.filter(b => b.billStatus === '未确认').reduce((sum, b) => sum + (b.totalAmount || 0), 0)],
            ['已确认金额', filteredBillsData.filter(b => b.billStatus === '已确认').reduce((sum, b) => sum + (b.totalAmount || 0), 0)],
            ['已收款金额', filteredBillsData.filter(b => b.billStatus === '已收款').reduce((sum, b) => sum + (b.totalAmount || 0), 0)]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, '统计汇总');

        // 生成文件名
        const now = new Date();
        const yearStr = now.getFullYear();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const dayStr = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const fileName = `账单列表_${yearStr}${monthStr}${dayStr}_${hours}${minutes}.xlsx`;

        // 导出文件
        XLSX.writeFile(wb, fileName);

        console.log('账单列表导出成功:', fileName);
        alert('账单列表导出成功！');

    } catch (error) {
        console.error('导出账单列表失败:', error);
        alert('导出失败: ' + error.message);
    }
}

// 删除账单
async function deleteBill(billId) {
    if (!confirm('确定要删除此账单吗？')) {
        return;
    }

    try {
        const bill = await (new AV.Query('Bills')).get(billId);

        // 删除关联的文件
        const attachments = bill.get('attachments') || [];
        for (const attachment of attachments) {
            if (attachment.fileId) {
                try {
                    const file = AV.Object.createWithoutData('_File', attachment.fileId);
                    await file.destroy();
                } catch (e) {
                    console.error('删除文件失败:', e);
                }
            }
        }

        // 删除账单
        await bill.destroy();

        alert('账单删除成功');

        // 刷新列表
        loadBills();

        // 如果详情页打开，关闭它
        const modal = bootstrap.Modal.getInstance(document.getElementById('billDetailModal'));
        if (modal) {
            modal.hide();
        }

    } catch (error) {
        console.error('删除账单失败:', error);
        alert('删除账单失败: ' + error.message);
    }
}

// 导出全局函数
window.showBillDetail = showBillDetail;
window.deleteBill = deleteBill;
window.removeCustomFee = removeCustomFee;
window.searchBillPreview = searchBillPreview;
