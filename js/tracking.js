// 跟单工作台功能模块 - 修复重复加载问题
let trackingData = [];
let filteredTrackingData = [];
let trackingItemsPerPage = 20;
let trackingCurrentPageIndex = 1;
let trackingTotalPages = 1;
let currentEditingCell = null;
let isTrackingInitialized = false; // 新增：防止重复初始化

// 加载跟单数据 - 修复查询限制版本
async function loadTrackingData() {
    try {
        console.log('开始加载跟单数据...');
        
        const table = document.getElementById('trackingTable');
        if (!table) {
            console.error('跟单表格不存在，页面可能未正确加载');
            return;
        }
        
        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.error('表格tbody不存在');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="16" class="loading">正在加载数据...</td></tr>';
        
        // 修复：使用无限制查询，确保获取所有数据
        const query = new AV.Query('Tracking');
        query.limit(1000); // 重要：确保获取所有数据
        query.descending('createdAt');
        const results = await query.find();
        
        console.log('📊 数据库查询结果:', results.length, '条记录');
        
        trackingData = results.map(item => {
            const data = item.toJSON();
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
                attachments: data.attachments || [],
                leanCloudObject: item
            };
        });
        
        console.log('原始数据量:', trackingData.length);
        
        // 详细分析报关状态分布
        const statusCount = {};
        trackingData.forEach(item => {
            const status = item.customsStatus || '空';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        console.log('📈 报关状态分布:', statusCount);
        
        /// 关键修复：只显示报关状态不是"放行"也不是"删单"的数据
const beforeFilterCount = trackingData.length;
trackingData = trackingData.filter(item => {
    return !item.customsStatus || 
           (item.customsStatus !== '放行' && item.customsStatus !== '删单');
});

console.log('过滤后数据量（非放行、非删单状态）:', trackingData.length, '（过滤掉了', beforeFilterCount - trackingData.length, '条记录）');
        
        // 按到港日期升序排序（最早的在前）
        trackingData.sort((a, b) => {
            const dateA = a.arrivalDate ? new Date(a.arrivalDate) : new Date(0);
            const dateB = b.arrivalDate ? new Date(b.arrivalDate) : new Date(0);
            return dateA - dateB; // 升序排列
        });
        
        filteredTrackingData = [...trackingData];
        
        console.log('跟单数据加载完成，共', trackingData.length, '条记录');
        
        // 验证最终数据
        console.log('✅ 最终数据验证:');
        console.log('- 总记录数:', trackingData.length);
        const finalStatusCount = {};
        trackingData.forEach(item => {
            const status = item.customsStatus || '空';
            finalStatusCount[status] = (finalStatusCount[status] || 0) + 1;
        });
        console.log('- 报关状态分布:', finalStatusCount);
        
        renderTrackingTable();
        updateTrackingPagination();
        
        // 只在第一次加载时绑定事件
        if (!isTrackingInitialized) {
            bindTrackingEvents();
            initColumnResize();
            isTrackingInitialized = true;
            console.log('✅ 跟单工作台初始化完成');
        }
        
    } catch (error) {
        console.error('加载数据失败:', error);
        const tbody = document.querySelector('#trackingTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="16" class="no-data">数据加载失败，请刷新页面重试</td></tr>';
        }
    }
}

// 应用跟单筛选条件
function applyTrackingFilters() {
    const arrivalDate = document.getElementById('arrivalDate').value;
    const billNo = document.getElementById('billNo').value.trim();
    const containerNo = document.getElementById('containerNo').value.trim();
    const declareDate = document.getElementById('declareDate').value;
    const customsStatus = document.getElementById('customsStatusFilter').value;
    
    console.log('查询条件:', { arrivalDate, billNo, containerNo, declareDate, customsStatus });
    
    filteredTrackingData = trackingData.filter(item => {
        let match = true;
        
        // 提单号筛选
        if (billNo && billNo !== '') {
            if (!item.billNo || !item.billNo.includes(billNo)) {
                match = false;
            }
        }
        
        // 柜号筛选
        if (containerNo && containerNo !== '') {
            if (!item.containerNo || !item.containerNo.includes(containerNo)) {
                match = false;
            }
        }
        
        // 报关状态筛选 - 修复非放行查询
        if (customsStatus && customsStatus !== '') {
            if (customsStatus === '非放行') {
                // 非放行：除了"放行"以外的所有状态
                if (item.customsStatus === '放行') {
                    match = false;
                }
            } else {
                // 其他状态精确匹配
                if (item.customsStatus !== customsStatus) {
                    match = false;
                }
            }
        }
        
        // 到港日期筛选 - 修复日期分隔符问题
        if (arrivalDate && arrivalDate.trim() !== '') {
            if (!item.arrivalDate || item.arrivalDate.trim() === '') {
                match = false;
            } else {
                let startDate, endDate;
                
                // 支持多种分隔符：to、至、-
                let separator = ' to ';
                if (arrivalDate.includes('至')) {
                    separator = '至';
                } else if (arrivalDate.includes(' - ')) {
                    separator = ' - ';
                }
                
                const dates = arrivalDate.split(separator).map(date => date.trim());
                
                if (dates.length === 2) {
                    // 日期范围
                    startDate = new Date(dates[0]);
                    endDate = new Date(dates[1]);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    // 单日期
                    startDate = new Date(arrivalDate);
                    endDate = new Date(arrivalDate);
                    endDate.setHours(23, 59, 59, 999);
                }
                
                const itemDate = new Date(item.arrivalDate);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(itemDate.getTime())) {
                    console.log('日期解析失败:', { startDate, endDate, itemDate });
                    match = false;
                } else {
                    if (itemDate < startDate || itemDate > endDate) {
                        match = false;
                    }
                }
            }
        }
        
        // 申报日期筛选 - 修复日期分隔符问题
        if (declareDate && declareDate.trim() !== '') {
            if (!item.declareDate || item.declareDate.trim() === '') {
                match = false;
            } else {
                let startDate, endDate;
                
                // 支持多种分隔符：to、至、-
                let separator = ' to ';
                if (declareDate.includes('至')) {
                    separator = '至';
                } else if (declareDate.includes(' - ')) {
                    separator = ' - ';
                }
                
                const dates = declareDate.split(separator).map(date => date.trim());
                
                if (dates.length === 2) {
                    // 日期范围
                    startDate = new Date(dates[0]);
                    endDate = new Date(dates[1]);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    // 单日期
                    startDate = new Date(declareDate);
                    endDate = new Date(declareDate);
                    endDate.setHours(23, 59, 59, 999);
                }
                
                const itemDate = new Date(item.declareDate);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(itemDate.getTime())) {
                    console.log('日期解析失败:', { startDate, endDate, itemDate });
                    match = false;
                } else {
                    if (itemDate < startDate || itemDate > endDate) {
                        match = false;
                    }
                }
            }
        }
        
        return match;
    });
    
    console.log('筛选后数据量:', filteredTrackingData.length);
}

// 渲染跟单表格
function renderTrackingTable() {
    const tbody = document.querySelector('#trackingTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredTrackingData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="no-data">没有找到匹配的数据</td></tr>';
        return;
    }
    
    const startIndex = (trackingCurrentPageIndex - 1) * trackingItemsPerPage;
    const endIndex = Math.min(startIndex + trackingItemsPerPage, filteredTrackingData.length);
    const currentPageData = filteredTrackingData.slice(startIndex, endIndex);
    
    currentPageData.forEach((item, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index;
        
        let rowClass = '';
        if (item.customsStatus !== '放行' && item.customsStatus) {
            rowClass = 'non-release-status';
        }
        if (item.customsStatus === '无电子信息') {
            rowClass = 'no-electronic-info';
        }
        
        const canDelete = item.operation !== '申报';
        const isReleased = item.customsStatus === '放行';
        const dataFields = ['arrivalDate', 'declareDate', 'preEntryNo', 'billNo', 'containerNo', 'customsNo', 'euDeposit', 'country', 'productName', 'remark'];
        
        row.innerHTML = `
            <td>${globalIndex + 1}</td>
            <td class="${dataFields.includes('arrivalDate') && isReleased ? 'disabled' : 'editable-cell'}" data-field="arrivalDate" data-id="${item.id}">${item.arrivalDate}</td>
            <td class="${dataFields.includes('declareDate') && isReleased ? 'disabled' : 'editable-cell'}" data-field="declareDate" data-id="${item.id}">${item.declareDate}</td>
            <td class="${dataFields.includes('preEntryNo') && isReleased ? 'disabled' : 'editable-cell'}" data-field="preEntryNo" data-id="${item.id}">${item.preEntryNo}</td>
            <td class="${dataFields.includes('billNo') && isReleased ? 'disabled' : 'editable-cell'}" data-field="billNo" data-id="${item.id}">${item.billNo}</td>
            <td class="${dataFields.includes('containerNo') && isReleased ? 'disabled' : 'editable-cell'}" data-field="containerNo" data-id="${item.id}">${item.containerNo}</td>
            <td class="${dataFields.includes('customsNo') && isReleased ? 'disabled' : 'editable-cell'}" data-field="customsNo" data-id="${item.id}">${item.customsNo}</td>
            <td class="${dataFields.includes('euDeposit') && isReleased ? 'disabled' : 'editable-cell'}" data-field="euDeposit" data-id="${item.id}">${item.euDeposit}</td>
            <td class="${dataFields.includes('country') && isReleased ? 'disabled' : 'editable-cell'}" data-field="country" data-id="${item.id}">${item.country}</td>
            <td class="${dataFields.includes('productName') && isReleased ? 'disabled' : 'editable-cell'}" data-field="productName" data-id="${item.id}">${item.productName}</td>
            <td>
                <select class="form-select form-select-sm operation-select" data-id="${item.id}">
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
            <td>
                <select class="form-select form-select-sm status-select" data-id="${item.id}">
                    <option value="">请选择</option>
                    <option value="放行" ${item.customsStatus === '放行' ? 'selected' : ''}>放行</option>
                    <option value="目的地查验" ${item.customsStatus === '目的地查验' ? 'selected' : ''}>目的地查验</option>
                    <option value="审结" ${item.customsStatus === '审结' ? 'selected' : ''}>审结</option>
                    <option value="口岸查验" ${item.customsStatus === '口岸查验' ? 'selected' : ''}>口岸查验</option>
                    <option value="无电子信息" ${item.customsStatus === '无电子信息' ? 'selected' : ''}>无电子信息</option>
                    <option value="合并检查" ${item.customsStatus === '合并检查' ? 'selected' : ''}>合并检查</option>
                    <option value="挂起" ${item.customsStatus === '挂起' ? 'selected' : ''}>挂起</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm instruction-select" data-id="${item.id}">
                    <option value="">请选择</option>
                    <option value="一般查验" ${item.instruction === '一般查验' ? 'selected' : ''}>一般查验</option>
                    <option value="国抽" ${item.instruction === '国抽' ? 'selected' : ''}>国抽</option>
                    <option value="直通" ${item.instruction === '直通' ? 'selected' : ''}>直通</option>
                </select>
            </td>
            <td class="${dataFields.includes('remark') && isReleased ? 'disabled' : 'editable-cell'}" data-field="remark" data-id="${item.id}">${item.remark}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary attachment-btn" data-id="${item.id}">
                    附件
                    ${item.attachments && item.attachments.length > 0 ? 
                        `<span class="attachment-count">${item.attachments.length}</span>` : ''}
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}" ${!canDelete ? 'disabled' : ''}>删除</button>
            </td>
        `;
        
        if (rowClass) {
            row.className = rowClass;
        }
        
        tbody.appendChild(row);
    });
    
    bindEditableCells();
    bindSelectEvents();
    bindAttachmentEvents();
    bindDeleteEvents();
    updateTrackingPaginationInfo();
}

// 绑定可编辑单元格事件
function bindEditableCells() {
    document.querySelectorAll('.editable-cell:not(.disabled)').forEach(cell => {
        cell.addEventListener('click', function() {
            makeCellEditable(this);
        });
    });
}

function makeCellEditable(cell) {
    if (currentEditingCell && currentEditingCell.element !== cell) {
        finishEditing(currentEditingCell);
    }

    if (currentEditingCell && currentEditingCell.element === cell) {
        return;
    }

    const originalValue = cell.textContent;
    const field = cell.getAttribute('data-field');
    const id = cell.getAttribute('data-id');

    let input;
    if (field.includes('Date')) {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control form-control-sm date-input';
        input.value = originalValue;
        
        setTimeout(() => {
            const datePicker = flatpickr(input, {
                locale: 'zh',
                dateFormat: 'Y-m-d',
                allowInput: true,
                clickOpens: true,
                onChange: function(selectedDates, dateStr, instance) {
                    input.value = dateStr;
                }
            });
            
            datePicker.open();
            
            input.addEventListener('click', function(e) {
                e.stopPropagation();
                datePicker.open();
            });
        }, 100);
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control form-control-sm';
        input.value = originalValue;
        
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);
    }

    cell.textContent = '';
    cell.appendChild(input);

    currentEditingCell = {
        element: cell,
        originalValue: originalValue,
        field: field,
        id: id,
        input: input
    };

    input.addEventListener('blur', function() {
        if (currentEditingCell && currentEditingCell.input === input) {
            finishEditing(currentEditingCell);
        }
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (currentEditingCell && currentEditingCell.input === input) {
                finishEditing(currentEditingCell);
            }
        } else if (e.key === 'Escape') {
            if (currentEditingCell && currentEditingCell.input === input) {
                cancelEditing(currentEditingCell);
            }
        }
    });
}

function finishEditing(editingCell) {
    if (!editingCell || !editingCell.input) {
        currentEditingCell = null;
        return;
    }

    const newValue = editingCell.input.value;
    const id = editingCell.id;
    const field = editingCell.field;

    const item = trackingData.find(item => item.id === id);
    if (item) {
        item[field] = newValue;
        
        if (field === 'arrivalDate') {
            // 重新排序
            trackingData.sort((a, b) => {
                const dateA = a.arrivalDate ? new Date(a.arrivalDate) : new Date(0);
                const dateB = b.arrivalDate ? new Date(b.arrivalDate) : new Date(0);
                return dateA - dateB; // 升序排列
            });
            filteredTrackingData.sort((a, b) => {
                const dateA = a.arrivalDate ? new Date(a.arrivalDate) : new Date(0);
                const dateB = b.arrivalDate ? new Date(b.arrivalDate) : new Date(0);
                return dateA - dateB; // 升序排列
            });
            renderTrackingTable();
            updateTrackingPagination();
        } else {
            const filteredItem = filteredTrackingData.find(item => item.id === id);
            if (filteredItem) {
                filteredItem[field] = newValue;
            }
        }
        
        saveToLeanCloud(item, false);
    }

    editingCell.element.textContent = newValue;
    currentEditingCell = null;
}

function cancelEditing(editingCell) {
    if (!editingCell) {
        currentEditingCell = null;
        return;
    }

    editingCell.element.textContent = editingCell.originalValue;
    currentEditingCell = null;
}

// 绑定下拉选择事件
function bindSelectEvents() {
    document.querySelectorAll('.operation-select').forEach(select => {
        select.addEventListener('change', async function() {
            const id = this.getAttribute('data-id');
            const value = this.value;
            
            const item = trackingData.find(item => item.id === id);
            if (item) {
                item.operation = value;
                
                if (value === '申报' && !item.declareDate) {
                    const today = new Date().toISOString().split('T')[0];
                    item.declareDate = today;
                    
                    const declareDateCell = document.querySelector(`[data-id="${id}"][data-field="declareDate"]`);
                    if (declareDateCell) {
                        declareDateCell.textContent = today;
                    }
                }
                
                const filteredItem = filteredTrackingData.find(item => item.id === id);
                if (filteredItem) {
                    filteredItem.operation = value;
                    if (value === '申报' && !filteredItem.declareDate) {
                        filteredItem.declareDate = new Date().toISOString().split('T')[0];
                    }
                }
                
                await saveToLeanCloud(item, false);
                renderTrackingTable();
            }
            
            if (value === '申报') {
                console.log('映射到报关数据:', id);
            }
        });
    });

    document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async function() {
        const id = this.getAttribute('data-id');
        const value = this.value;
        
        const item = trackingData.find(item => item.id === id);
        if (item) {
            item.customsStatus = value;
            
            // 如果状态设置为"放行"或"删单"，则从跟单列表中移除
            if (value === '放行' || value === '删单') {
                trackingData = trackingData.filter(t => t.id !== id);
                filteredTrackingData = filteredTrackingData.filter(t => t.id !== id);
                renderTrackingTable();
                updateTrackingPagination();
            } else {
                const filteredItem = filteredTrackingData.find(item => item.id === id);
                if (filteredItem) {
                    filteredItem.customsStatus = value;
                }
                
                renderTrackingTable();
            }
            
            await saveToLeanCloud(item, false);
        }
    });
});

    document.querySelectorAll('.instruction-select').forEach(select => {
        select.addEventListener('change', async function() {
            const id = this.getAttribute('data-id');
            const value = this.value;
            
            const item = trackingData.find(item => item.id === id);
            if (item) {
                item.instruction = value;
                
                const filteredItem = filteredTrackingData.find(item => item.id === id);
                if (filteredItem) {
                    filteredItem.instruction = value;
                }
                
                await saveToLeanCloud(item, false);
            }
        });
    });
}

// 绑定附件按钮事件
function bindAttachmentEvents() {
    document.querySelectorAll('.attachment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            showAttachmentModal(id);
        });
    });
}

// 绑定删除按钮事件
function bindDeleteEvents() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await deleteTracking(id);
        });
    });
}

// 删除跟单
async function deleteTracking(id) {
    if (confirm('确定要删除这条跟单记录吗？此操作不可恢复。')) {
        try {
            const itemToDelete = trackingData.find(item => item.id === id);
            
            if (itemToDelete) {
                if (itemToDelete.operation === '申报') {
                    alert('已申报的数据不能删除');
                    return;
                }
                
                const success = await deleteFromLeanCloud(itemToDelete);
                
                if (success) {
                    await loadTrackingData();
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

// 初始化列宽调整
function initColumnResize() {
    const table = document.getElementById('trackingTable');
    if (!table) {
        console.warn('跟单工作台表格元素尚未加载');
        return;
    }
    
    const headers = table.querySelectorAll('th');
    let isResizing = false;
    let currentResizeTh = null;
    let startX = 0;
    let startWidth = 0;
    
    headers.forEach((th, index) => {
        if (index === 0 || index === headers.length - 1) return;
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        th.style.position = 'relative';
        th.appendChild(resizeHandle);
        
        resizeHandle.addEventListener('mousedown', function(e) {
            isResizing = true;
            currentResizeTh = th;
            startX = e.clientX;
            startWidth = th.offsetWidth;
            resizeHandle.classList.add('active');
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing || !currentResizeTh) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + deltaX);
        const thIndex = Array.from(currentResizeTh.parentNode.children).indexOf(currentResizeTh);
        
        currentResizeTh.style.width = newWidth + 'px';
        
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cell = row.children[thIndex];
            if (cell) {
                cell.style.width = newWidth + 'px';
                cell.style.minWidth = newWidth + 'px';
            }
        });
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing && currentResizeTh) {
            isResizing = false;
            const resizeHandle = currentResizeTh.querySelector('.resize-handle');
            if (resizeHandle) {
                resizeHandle.classList.remove('active');
            }
            currentResizeTh = null;
        }
    });
    
    document.addEventListener('selectstart', function(e) {
        if (isResizing) {
            e.preventDefault();
        }
    });
}

// 更新分页信息
function updateTrackingPaginationInfo() {
    const totalItems = filteredTrackingData.length;
    const startItem = totalItems > 0 ? (trackingCurrentPageIndex - 1) * trackingItemsPerPage + 1 : 0;
    const endItem = Math.min(trackingCurrentPageIndex * trackingItemsPerPage, totalItems);
    
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.innerHTML = 
            `共 ${trackingTotalPages} 页，每页显示 ${trackingItemsPerPage} 条，共 ${totalItems} 条记录，当前显示第 ${startItem}-${endItem} 条`;
    }
}

// 更新分页
function updateTrackingPagination() {
    trackingTotalPages = Math.ceil(filteredTrackingData.length / trackingItemsPerPage);
    const paginationElement = document.getElementById('pagination');
    
    if (!paginationElement) return;
    
    if (trackingTotalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页
    if (trackingCurrentPageIndex > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${trackingCurrentPageIndex - 1}">上一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">上一页</a></li>`;
    }
    
    // 页码
    const maxVisiblePages = 5;
    let startPage = Math.max(1, trackingCurrentPageIndex - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(trackingTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === trackingCurrentPageIndex) {
            paginationHTML += `<li class="page-item active"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
    }
    
    // 下一页
    if (trackingCurrentPageIndex < trackingTotalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${trackingCurrentPageIndex + 1}">下一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">下一页</a></li>`;
    }
    
    // 添加快速跳转
    paginationHTML += `
        <li class="page-item">
            <span class="page-link text-muted">前往</span>
        </li>
        <li class="page-item">
            <input type="number" class="form-control page-jump-input" min="1" max="${trackingTotalPages}" value="${trackingCurrentPageIndex}" style="width: 80px; margin: 0 5px;">
        </li>
        <li class="page-item">
            <span class="page-link text-muted">页</span>
        </li>
        <li class="page-item">
            <button class="btn btn-sm btn-outline-primary page-jump-btn">跳转</button>
        </li>
    `;
    
    paginationElement.innerHTML = paginationHTML;
    
    // 绑定分页事件
    document.querySelectorAll('#pagination .page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== trackingCurrentPageIndex) {
                trackingCurrentPageIndex = page;
                renderTrackingTable();
                updateTrackingPagination();
            }
        });
    });
    
    // 绑定跳转事件
    const jumpBtn = document.querySelector('.page-jump-btn');
    const jumpInput = document.querySelector('.page-jump-input');
    
    if (jumpBtn && jumpInput) {
        jumpBtn.addEventListener('click', function() {
            const page = parseInt(jumpInput.value);
            if (page && page >= 1 && page <= trackingTotalPages && page !== trackingCurrentPageIndex) {
                trackingCurrentPageIndex = page;
                renderTrackingTable();
                updateTrackingPagination();
            }
        });
        
        jumpInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                jumpBtn.click();
            }
        });
    }
}

// 新增跟单功能
function showAddTrackingModal() {
    const modal = new bootstrap.Modal(document.getElementById('trackingModal'));
    modal.show();
}

async function saveTracking() {
    const containerNo = document.getElementById('newContainerNo').value;
    const billNo = document.getElementById('newBillNo').value;
    const arrivalDate = document.getElementById('newArrivalDate').value;

    if (!containerNo || !arrivalDate) {
        alert('请填写所有必填字段（柜号、到港日期）');
        return;
    }

    const newTracking = {
        arrivalDate: arrivalDate,
        declareDate: '',
        preEntryNo: '',
        billNo: billNo || '',
        containerNo: containerNo,
        customsNo: '',
        euDeposit: '',
        country: document.getElementById('newCountry').value || '',
        productName: document.getElementById('newProductName').value || '',
        shipper: document.getElementById('newShipper').value || '',
        operation: '',
        customsStatus: '',
        instruction: '',
        remark: '',
        attachments: []
    };

    try {
        const success = await saveToLeanCloud(newTracking, true);
        
        if (success) {
            await loadTrackingData();
            const modal = bootstrap.Modal.getInstance(document.getElementById('trackingModal'));
            modal.hide();
            document.getElementById('trackingForm').reset();
            alert('新增成功！');
        } else {
            alert('保存失败，请重试');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，请重试');
    }
}

// 导入功能 - 修复版本
function showImportModal() {
    document.getElementById('importFile').value = '';
    document.getElementById('importPreviewBody').innerHTML = '';
    document.getElementById('confirmImport').disabled = true;
    
    const modal = new bootstrap.Modal(document.getElementById('importTrackingModal'));
    modal.show();
}

// 处理文件选择 - 修复版本
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewBody = document.getElementById('importPreviewBody');
    previewBody.innerHTML = '<tr><td colspan="9" class="text-center">正在解析文件...</td></tr>';

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 获取第一个工作表
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            if (jsonData.length < 2) {
                previewBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">文件为空或格式不正确</td></tr>';
                return;
            }
            
            // 解析表头
            const headers = jsonData[0];
            console.log('Excel表头:', headers);
            
            // 查找列索引
            const containerNoIndex = findColumnIndex(headers, ['柜号', '柜号']);
            const arrivalDateIndex = findColumnIndex(headers, ['到港日期', '到港日期']);
            const billNoIndex = findColumnIndex(headers, ['提单号', '提单号']);
            const countryIndex = findColumnIndex(headers, ['国家', '国家']);
            const productNameIndex = findColumnIndex(headers, ['商品描述', '品名']);
            const shipperIndex = findColumnIndex(headers, ['发货人', '发货人']);
            const preEntryNoIndex = findColumnIndex(headers, ['预录入号', '预录入号']);
            const customsNoIndex = findColumnIndex(headers, ['报关单号', '报关单号']);
            const euDepositIndex = findColumnIndex(headers, ['欧盟保证金', '欧盟保证金']);
            const operationIndex = findColumnIndex(headers, ['操作', '操作']);
            
            console.log('列索引:', {
                containerNoIndex, arrivalDateIndex, billNoIndex, countryIndex,
                productNameIndex, shipperIndex, preEntryNoIndex, customsNoIndex,
                euDepositIndex, operationIndex
            });
            
            // 解析数据行
            const previewData = [];
            let validCount = 0;
            
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                
                const containerNo = row[containerNoIndex] || '';
                const arrivalDate = formatExcelDate(row[arrivalDateIndex]);
                const billNo = row[billNoIndex] || '';
                const country = row[countryIndex] || '';
                const productName = row[productNameIndex] || '';
                const shipper = row[shipperIndex] || '';
                const preEntryNo = row[preEntryNoIndex] || '';
                const customsNo = row[customsNoIndex] || '';
                const euDeposit = row[euDepositIndex] || '';
                const operation = row[operationIndex] || '';
                
                let errors = [];
                
                // 验证必填字段
                if (!containerNo) {
                    errors.push('柜号不能为空');
                }
                if (!arrivalDate) {
                    errors.push('到港日期不能为空');
                } else if (isNaN(new Date(arrivalDate).getTime())) {
                    errors.push('到港日期格式不正确');
                }
                
                const status = errors.length === 0 ? 'valid' : 'error';
                if (status === 'valid') validCount++;
                
                previewData.push({
                    status,
                    containerNo,
                    arrivalDate,
                    billNo,
                    country,
                    productName,
                    shipper,
                    preEntryNo,
                    customsNo,
                    euDeposit,
                    operation,
                    errors: errors.join('; ')
                });
            }
            
            displayImportPreview(previewData, validCount);
            
        } catch (error) {
            console.error('文件解析失败:', error);
            previewBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">文件解析失败: ' + error.message + '</td></tr>';
        }
    };
    
    reader.onerror = function() {
        previewBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">文件读取失败</td></tr>';
    };
    
    reader.readAsArrayBuffer(file);
}

function displayImportPreview(data, validCount) {
    const previewBody = document.getElementById('importPreviewBody');
    const confirmButton = document.getElementById('confirmImport');

    let html = '';

    data.forEach((item, index) => {
        const statusClass = item.status === 'valid' ? 'import-status-valid' : 'import-status-error';
        const statusText = item.status === 'valid' ? '✓ 有效' : '✗ 错误';
        
        html += `<tr class="${statusClass}">
            <td>${statusText}</td>
            <td>${item.containerNo}</td>
            <td>${item.arrivalDate}</td>
            <td>${item.billNo}</td>
            <td>${item.country}</td>
            <td>${item.productName}</td>
            <td>${item.shipper}</td>
            <td>${item.preEntryNo}</td>
            <td>${item.customsNo}</td>
            <td>${item.euDeposit}</td>
            <td>${item.operation}</td>
            <td class="text-danger small">${item.errors}</td>
        </tr>`;
    });

    previewBody.innerHTML = html;
    confirmButton.disabled = validCount === 0;
    confirmButton.textContent = `确认导入 (${validCount}条有效数据)`;
}

async function confirmImport() {
    const confirmButton = document.getElementById('confirmImport');
    const skipDuplicates = document.getElementById('skipDuplicates').checked;
    
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导入中...';

    try {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        if (!file) {
            alert('请选择文件');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    alert('文件为空或格式不正确');
                    return;
                }
                
                const headers = jsonData[0];
                const containerNoIndex = findColumnIndex(headers, ['柜号', '柜号']);
                const arrivalDateIndex = findColumnIndex(headers, ['到港日期', '到港日期']);
                const billNoIndex = findColumnIndex(headers, ['提单号', '提单号']);
                const countryIndex = findColumnIndex(headers, ['国家', '国家']);
                const productNameIndex = findColumnIndex(headers, ['商品描述', '品名']);
                const shipperIndex = findColumnIndex(headers, ['发货人', '发货人']);
                const preEntryNoIndex = findColumnIndex(headers, ['预录入号', '预录入号']);
                const customsNoIndex = findColumnIndex(headers, ['报关单号', '报关单号']);
                const euDepositIndex = findColumnIndex(headers, ['欧盟保证金', '欧盟保证金']);
                const operationIndex = findColumnIndex(headers, ['操作', '操作']);
                
                let successCount = 0;
                let errorCount = 0;
                const failedData = [];
                
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;
                    
                    try {
                        const containerNo = (row[containerNoIndex] || '').toString().trim();
                        const arrivalDate = formatExcelDate(row[arrivalDateIndex]);
                        const billNo = (row[billNoIndex] || '').toString().trim();
                        const country = (row[countryIndex] || '').toString().trim();
                        const productName = (row[productNameIndex] || '').toString().trim();
                        const shipper = (row[shipperIndex] || '').toString().trim();
                        const preEntryNo = (row[preEntryNoIndex] || '').toString().trim();
                        const customsNo = (row[customsNoIndex] || '').toString().trim();
                        const euDeposit = (row[euDepositIndex] || '').toString().trim();
                        const operation = (row[operationIndex] || '').toString().trim();
                        
                        // 验证必填字段
                        if (!containerNo || !arrivalDate) {
                            throw new Error('柜号和到港日期为必填字段');
                        }
                        
                        // 检查重复数据
                        if (skipDuplicates) {
                            const existingRecord = trackingData.find(item => 
                                item.containerNo === containerNo
                            );
                            if (existingRecord) {
                                throw new Error('柜号已存在');
                            }
                        }
                        
                        const newTracking = {
                            arrivalDate: arrivalDate,
                            declareDate: '',
                            preEntryNo: preEntryNo,
                            billNo: billNo,
                            containerNo: containerNo,
                            customsNo: customsNo,
                            euDeposit: euDeposit,
                            country: country,
                            productName: productName,
                            shipper: shipper,
                            operation: operation,
                            customsStatus: '',
                            instruction: '',
                            remark: '',
                            attachments: []
                        };
                        
                        const success = await saveToLeanCloud(newTracking, true);
                        if (success) {
                            successCount++;
                        } else {
                            throw new Error('保存到数据库失败');
                        }
                        
                    } catch (error) {
                        errorCount++;
                        failedData.push({
                            row: i + 1,
                            containerNo: (row[containerNoIndex] || '').toString(),
                            arrivalDate: formatExcelDate(row[arrivalDateIndex]),
                            billNo: (row[billNoIndex] || '').toString(),
                            country: (row[countryIndex] || '').toString(),
                            productName: (row[productNameIndex] || '').toString(),
                            shipper: (row[shipperIndex] || '').toString(),
                            preEntryNo: (row[preEntryNoIndex] || '').toString(),
                            customsNo: (row[customsNoIndex] || '').toString(),
                            euDeposit: (row[euDepositIndex] || '').toString(),
                            operation: (row[operationIndex] || '').toString(),
                            error: error.message
                        });
                    }
                }
                
                // 显示导入结果
                const importModal = bootstrap.Modal.getInstance(document.getElementById('importTrackingModal'));
                importModal.hide();
                
                if (successCount > 0) {
                    alert(`导入完成！成功导入 ${successCount} 条数据${errorCount > 0 ? `，失败 ${errorCount} 条` : ''}`);
                    
                    // 重新加载数据
                    await loadTrackingData();
                    
                    // 如果有失败数据，显示详情
                    if (failedData.length > 0) {
                        showImportResult(successCount, errorCount, failedData);
                    }
                } else {
                    alert('导入失败，所有数据都未能成功导入');
                    if (failedData.length > 0) {
                        showImportResult(successCount, errorCount, failedData);
                    }
                }
                
            } catch (error) {
                console.error('导入过程失败:', error);
                alert('导入过程中发生错误: ' + error.message);
            } finally {
                confirmButton.disabled = false;
                confirmButton.innerHTML = '确认导入';
            }
        };
        
        reader.onerror = function() {
            alert('文件读取失败');
            confirmButton.disabled = false;
            confirmButton.innerHTML = '确认导入';
        };
        
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败: ' + error.message);
        confirmButton.disabled = false;
        confirmButton.innerHTML = '确认导入';
    }
}

// 显示导入结果详情
function showImportResult(successCount, errorCount, failedData) {
    const successAlert = document.getElementById('importSuccessAlert');
    const errorAlert = document.getElementById('importErrorAlert');
    const failedSection = document.getElementById('failedDataSection');
    const successMessage = document.getElementById('importSuccessMessage');
    const errorMessage = document.getElementById('importErrorMessage');
    const failedBody = document.getElementById('failedDataBody');
    const exportBtn = document.getElementById('exportFailedData');
    
    if (successCount > 0) {
        successAlert.style.display = 'block';
        successMessage.textContent = `成功导入 ${successCount} 条数据`;
    } else {
        successAlert.style.display = 'none';
    }
    
    if (errorCount > 0) {
        errorAlert.style.display = 'block';
        errorMessage.textContent = `导入失败 ${errorCount} 条数据`;
        failedSection.style.display = 'block';
        exportBtn.style.display = 'block';
        
        // 显示失败数据
        let html = '';
        failedData.forEach(item => {
            html += `<tr>
                <td>${item.row}</td>
                <td>${item.containerNo}</td>
                <td>${item.arrivalDate}</td>
                <td>${item.billNo}</td>
                <td>${item.country}</td>
                <td>${item.productName}</td>
                <td>${item.shipper}</td>
                <td>${item.preEntryNo}</td>
                <td>${item.customsNo}</td>
                <td>${item.euDeposit}</td>
                <td>${item.operation}</td>
                <td class="text-danger">${item.error}</td>
            </tr>`;
        });
        failedBody.innerHTML = html;
        
        // 绑定导出失败数据事件
        exportBtn.onclick = function() {
            exportFailedData(failedData);
        };
    } else {
        errorAlert.style.display = 'none';
        failedSection.style.display = 'none';
        exportBtn.style.display = 'none';
    }
    
    const resultModal = new bootstrap.Modal(document.getElementById('importResultModal'));
    resultModal.show();
}

// 导出失败数据
function exportFailedData(failedData) {
    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建表头
        const headers = ['行号', '柜号', '到港日期', '提单号', '国家', '商品描述', '发货人', '预录入号', '报关单号', '欧盟保证金', '操作', '失败原因'];
        
        // 创建工作表数据
        const wsData = [headers];
        failedData.forEach(item => {
            wsData.push([
                item.row,
                item.containerNo,
                item.arrivalDate,
                item.billNo,
                item.country,
                item.productName,
                item.shipper,
                item.preEntryNo,
                item.customsNo,
                item.euDeposit,
                item.operation,
                item.error
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, '失败数据');
        XLSX.writeFile(wb, '跟单导入失败数据.xlsx');
        
    } catch (error) {
        console.error('导出失败数据失败:', error);
        alert('导出失败数据失败: ' + error.message);
    }
}

// 下载导入模板 - 修复版本
function downloadTemplate() {
    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建表头数据 - 增加新字段
        const headers = [
            '柜号', '到港日期', '提单号', '国家', '商品描述', '发货人', '预录入号',
            '报关单号', '欧盟保证金', '操作'
        ];
        
        // 创建示例数据
        const sampleData = [
            ['CONT1234567', '2024-01-15', 'BL20240001', '德国', '机械设备', 'ABC公司', 'PRE20240001', 'CUS20240001', '5000', '已核'],
            ['CONT1234568', '2024-01-16', 'BL20240002', '法国', '电子元件', 'XYZ公司', 'PRE20240002', 'CUS20240002', '3000', '打单']
        ];
        
        // 创建工作表数据
        const wsData = [headers, ...sampleData];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '跟单导入模板');
        
        // 生成Excel文件并下载
        XLSX.writeFile(wb, '跟单导入模板.xlsx');
        
    } catch (error) {
        console.error('模板下载失败:', error);
        alert('模板下载失败，请重试');
    }
}

// 绑定跟踪事件 - 新增：单独的事件绑定函数
function bindTrackingEvents() {
    console.log('🔧 绑定跟单工作台事件...');
    
    // 新增跟单按钮
    const addTrackingBtn = document.getElementById('addTracking');
    if (addTrackingBtn) {
        // 移除现有事件监听器
        addTrackingBtn.replaceWith(addTrackingBtn.cloneNode(true));
        document.getElementById('addTracking').addEventListener('click', showAddTrackingModal);
    }
    
    // 保存跟单按钮
    const saveTrackingBtn = document.getElementById('saveTracking');
    if (saveTrackingBtn) {
        saveTrackingBtn.replaceWith(saveTrackingBtn.cloneNode(true));
        document.getElementById('saveTracking').addEventListener('click', saveTracking);
    }
    
    // 导入按钮
    const importTrackingBtn = document.getElementById('importTracking');
    if (importTrackingBtn) {
        importTrackingBtn.replaceWith(importTrackingBtn.cloneNode(true));
        document.getElementById('importTracking').addEventListener('click', showImportModal);
    }
    
    // 导入文件选择
    const importFileInput = document.getElementById('importFile');
    if (importFileInput) {
        importFileInput.replaceWith(importFileInput.cloneNode(true));
        document.getElementById('importFile').addEventListener('change', handleFileSelect);
    }
    
    // 确认导入按钮
    const confirmImportBtn = document.getElementById('confirmImport');
    if (confirmImportBtn) {
        confirmImportBtn.replaceWith(confirmImportBtn.cloneNode(true));
        document.getElementById('confirmImport').addEventListener('click', confirmImport);
    }
    
    // 下载模板按钮
    const downloadTemplateBtn = document.getElementById('downloadTemplate');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.replaceWith(downloadTemplateBtn.cloneNode(true));
        document.getElementById('downloadTemplate').addEventListener('click', downloadTemplate);
    }
    
    // 查询按钮
    const searchTrackingBtn = document.getElementById('searchTracking');
    if (searchTrackingBtn) {
        searchTrackingBtn.replaceWith(searchTrackingBtn.cloneNode(true));
        document.getElementById('searchTracking').addEventListener('click', function() {
            applyTrackingFilters();
            trackingCurrentPageIndex = 1;
            updateTrackingPagination();
            renderTrackingTable();
        });
    }
    
    // 清空按钮
    const clearTrackingBtn = document.getElementById('clearTracking');
    if (clearTrackingBtn) {
        clearTrackingBtn.replaceWith(clearTrackingBtn.cloneNode(true));
        document.getElementById('clearTracking').addEventListener('click', function() {
            document.getElementById('arrivalDate').value = '';
            document.getElementById('billNo').value = '';
            document.getElementById('containerNo').value = '';
            document.getElementById('declareDate').value = '';
            document.getElementById('customsStatusFilter').value = '';
            filteredTrackingData = [...trackingData];
            trackingCurrentPageIndex = 1;
            updateTrackingPagination();
            renderTrackingTable();
        });
    }
    
    // 每页显示条数变化
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.replaceWith(pageSizeSelect.cloneNode(true));
        document.getElementById('pageSizeSelect').addEventListener('change', function() {
            trackingItemsPerPage = parseInt(this.value);
            trackingCurrentPageIndex = 1;
            updateTrackingPagination();
            renderTrackingTable();
        });
    }
    
    console.log('✅ 跟单工作台事件绑定完成');
}

// 清理函数 - 新增：在页面切换时清理状态
function cleanupTracking() {
    console.log('🧹 清理跟单工作台状态...');
    currentEditingCell = null;
    // 保留数据，只清理编辑状态
}

// 导出函数
window.loadTrackingData = loadTrackingData;
window.cleanupTracking = cleanupTracking;

// 页面加载时绑定事件 - 修改：不再自动绑定
document.addEventListener('DOMContentLoaded', function() {
    console.log('跟单工作台模块加载完成，等待页面切换时初始化...');
    // 事件将在第一次切换到跟单页面时绑定
});