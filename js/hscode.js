// HS编码管理功能模块
let hscodeData = [];
let filteredHscodeData = [];
let hscodeItemsPerPage = 10;
let hscodeCurrentPageIndex = 1;
let hscodeTotalPages = 1;

// 加载HS编码数据
async function loadHSCodeData() {
    try {
        const tbody = document.querySelector('#hscodeTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" class="loading">正在加载数据...</td></tr>';
        
        // 检查表是否存在
        const tableExists = await checkTableExists('HS_Code_Base');
        if (!tableExists) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">HS编码表不存在，请先在LeanCloud后台创建HS_Code_Base表</td></tr>';
            return;
        }
        
        // 从LeanCloud查询HS编码数据
        const query = new AV.Query('HS_Code_Base');
        query.descending('createdAt');
        const results = await query.find();
        
        hscodeData = results.map(item => {
            const data = item.toJSON();
            return {
                id: data.objectId,
                hsCode: data.hsCode || '',
                productName: data.productName || '',
                supervisionCategory: data.supervisionCategory || '',
                specification: data.specification || '',
                syncTime: data.updatedAt || data.createdAt,
                leanCloudObject: item
            };
        });
        
        filteredHscodeData = [...hscodeData];
        hscodeCurrentPageIndex = 1;
        updateHSCodePagination();
        renderHSCodeTable();
        
    } catch (error) {
        console.error('加载HS编码数据失败:', error);
        const tbody = document.querySelector('#hscodeTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">数据加载失败: ' + error.message + '</td></tr>';
        }
    }
}

// 渲染HS编码表格
function renderHSCodeTable() {
    const tbody = document.querySelector('#hscodeTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredHscodeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">没有找到匹配的数据</td></tr>';
        return;
    }
    
    const startIndex = (hscodeCurrentPageIndex - 1) * hscodeItemsPerPage;
    const endIndex = Math.min(startIndex + hscodeItemsPerPage, filteredHscodeData.length);
    const currentPageData = filteredHscodeData.slice(startIndex, endIndex);
    
    currentPageData.forEach((item, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index;
        
        row.innerHTML = `
            <td>${globalIndex + 1}</td>
            <td>${item.hsCode}</td>
            <td>${item.productName}</td>
            <td>${item.supervisionCategory}</td>
            <td>${item.specification}</td>
            <td>${item.syncTime ? new Date(item.syncTime).toLocaleString('zh-CN') : ''}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateHSCodePaginationInfo();
}

// 更新HS编码分页
function updateHSCodePagination() {
    hscodeTotalPages = Math.ceil(filteredHscodeData.length / hscodeItemsPerPage);
    const paginationElement = document.getElementById('hscodePagination');
    
    if (hscodeTotalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页
    if (hscodeCurrentPageIndex > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${hscodeCurrentPageIndex - 1}">上一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">上一页</a></li>`;
    }
    
    // 页码
    const maxVisiblePages = 5;
    let startPage = Math.max(1, hscodeCurrentPageIndex - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(hscodeTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === hscodeCurrentPageIndex) {
            paginationHTML += `<li class="page-item active"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
    }
    
    // 下一页
    if (hscodeCurrentPageIndex < hscodeTotalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${hscodeCurrentPageIndex + 1}">下一页</a></li>`;
    } else {
        paginationHTML += `<li class="page-item disabled"><a class="page-link" href="#">下一页</a></li>`;
    }
    
    paginationElement.innerHTML = paginationHTML;
    
    // 绑定分页事件
    document.querySelectorAll('#hscodePagination .page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== hscodeCurrentPageIndex) {
                hscodeCurrentPageIndex = page;
                renderHSCodeTable();
                updateHSCodePagination();
            }
        });
    });
}

// 更新HS编码分页信息
function updateHSCodePaginationInfo() {
    const totalItems = filteredHscodeData.length;
    document.getElementById('hscodePaginationInfo').innerHTML = `共 ${totalItems} 条记录`;
}

// 搜索HS编码
function searchHSCode() {
    const hsCode = document.getElementById('hsCodeSearch').value.trim();
    const productName = document.getElementById('productNameSearch').value.trim();
    
    filteredHscodeData = hscodeData.filter(item => {
        let match = true;
        
        if (hsCode && !item.hsCode.includes(hsCode)) {
            match = false;
        }
        
        if (productName && !item.productName.includes(productName)) {
            match = false;
        }
        
        return match;
    });
    
    hscodeCurrentPageIndex = 1;
    updateHSCodePagination();
    renderHSCodeTable();
}

// 清空HS编码搜索条件
function clearHSCodeSearch() {
    document.getElementById('hsCodeSearch').value = '';
    document.getElementById('productNameSearch').value = '';
    filteredHscodeData = [...hscodeData];
    hscodeCurrentPageIndex = 1;
    updateHSCodePagination();
    renderHSCodeTable();
}

// 从报关数据同步HS编码
async function syncHSCodeFromCustoms() {
    try {
        // 检查表是否存在
        const tableExists = await checkTableExists('HS_Code_Base');
        if (!tableExists) {
            alert('HS编码表不存在，请先在LeanCloud后台创建HS_Code_Base表');
            return;
        }
        
        // 从报关数据中查询有HS编码信息的记录
        const query = new AV.Query('Tracking');
        query.exists('hsCode');
        query.exists('productName');
        const results = await query.find();
        
        let syncCount = 0;
        let skipCount = 0;
        
        for (const item of results) {
            const data = item.toJSON();
            
            if (!data.hsCode || !data.productName) {
                continue;
            }
            
            // 检查是否已存在
            const existingQuery = new AV.Query('HS_Code_Base');
            existingQuery.equalTo('hsCode', data.hsCode);
            existingQuery.equalTo('productName', data.productName);
            const existing = await existingQuery.first();
            
            if (!existing) {
                // 创建新的HS编码记录
                const hsCodeObj = new AV.Object('HS_Code_Base');
                hsCodeObj.set('hsCode', data.hsCode || '');
                hsCodeObj.set('productName', data.productName || '');
                hsCodeObj.set('supervisionCategory', data.supervisionCategory || '');
                hsCodeObj.set('specification', data.specification || '');
                await hsCodeObj.save();
                syncCount++;
            } else {
                skipCount++;
            }
        }
        
        // 重新加载数据
        await loadHSCodeData();
        
        alert(`同步完成！新增 ${syncCount} 条记录，跳过 ${skipCount} 条重复记录`);
        
    } catch (error) {
        console.error('同步HS编码数据失败:', error);
        alert('同步失败: ' + error.message);
    }
}

// 绑定HS编码管理事件
document.addEventListener('DOMContentLoaded', function() {
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
});