// cert519.js - 519厂号管理功能（最终稳定版）

let cert519Data = [];
let filteredCert519Data = [];
let cert519CurrentPage = 1;
let cert519ItemsPerPage = 20;
let cert519TotalPages = 1;
let cert519TotalItems = 0;
let isSaving = false;

// 初始化519厂号管理页面
async function initCert519Page() {
    console.log('初始化519厂号管理页面...');
    
    // 绑定事件
    bindCert519Events();
    
    // 加载数据
    await loadCert519Data();
    
    // 初始调整表格高度
    if (typeof adjustTableContainerHeight === 'function') {
        setTimeout(adjustTableContainerHeight, 500);
    }
}

// 绑定事件
function bindCert519Events() {
    // 查询按钮
    const searchBtn = document.getElementById('searchCert519');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchCert519);
    }
    
    // 清空按钮
    const clearBtn = document.getElementById('clearCert519');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCert519Search);
    }
    
    // 同步按钮
    const syncBtn = document.getElementById('syncCert519');
    if (syncBtn) {
        syncBtn.addEventListener('click', syncCert519FromCustoms);
    }
    
    // 新增按钮
    const addBtn = document.getElementById('addCert519');
    if (addBtn) {
        addBtn.addEventListener('click', showAddCert519Modal);
    }
    
    // 每页显示条数变化
    const pageSizeSelect = document.getElementById('cert519PageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            cert519ItemsPerPage = parseInt(this.value);
            cert519CurrentPage = 1;
            updateCert519Pagination();
            renderCert519Table();
            adjustTableContainerHeight();
        });
    }
}

// 加载519厂号数据
async function loadCert519Data() {
    try {
        const query = new AV.Query('ciferquery519');
        query.addDescending('createdAt');
        
        const results = await query.find();
        
        cert519Data = results.map(item => {
            const data = item.toJSON();
            return {
                id: data.objectId,
                certificate519: data.certificate519 || '',
                factoryNo: data.factoryNo || '',
                country: data.country || '',
                createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString('zh-CN') : '',
                leanCloudObject: item
            };
        });
        
        console.log('519厂号数据加载完成，共', cert519Data.length, '条记录');
        
        // 初始化筛选数据
        filteredCert519Data = [...cert519Data];
        
        // 更新分页
        updateCert519Pagination();
        
        // 渲染表格
        renderCert519Table();
        
    } catch (error) {
        console.error('加载519厂号数据失败:', error);
        if (error.code === 101) {
            cert519Data = [];
            filteredCert519Data = [];
            updateCert519Pagination();
            renderCert519Table();
        }
    }
}

// 查询519厂号数据
function searchCert519() {
    const factoryNo = document.getElementById('factoryNoSearch').value.trim().toLowerCase();
    const certificate519 = document.getElementById('certificate519Search').value.trim().toLowerCase();
    const country = document.getElementById('countrySearch').value.trim().toLowerCase();
    
    filteredCert519Data = cert519Data.filter(item => {
        let match = true;
        
        if (factoryNo && !item.factoryNo.toLowerCase().includes(factoryNo)) {
            match = false;
        }
        
        if (certificate519 && !item.certificate519.toLowerCase().includes(certificate519)) {
            match = false;
        }
        
        if (country && !item.country.toLowerCase().includes(country)) {
            match = false;
        }
        
        return match;
    });
    
    cert519CurrentPage = 1;
    updateCert519Pagination();
    renderCert519Table();
    adjustTableContainerHeight();
}

// 清空查询条件
function clearCert519Search() {
    document.getElementById('factoryNoSearch').value = '';
    document.getElementById('certificate519Search').value = '';
    document.getElementById('countrySearch').value = '';
    
    filteredCert519Data = [...cert519Data];
    cert519CurrentPage = 1;
    updateCert519Pagination();
    renderCert519Table();
    adjustTableContainerHeight();
}

// 从报关数据同步519证书和厂号信息
async function syncCert519FromCustoms() {
    try {
        const syncBtn = document.getElementById('syncCert519');
        const originalText = syncBtn.innerHTML;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同步中...';
        syncBtn.disabled = true;
        
        const query = new AV.Query('Tracking');
        query.exists('certificate519');
        query.exists('factoryNo');
        query.limit(1000);
        
        const results = await query.find();
        
        let syncedCount = 0;
        let skippedCount = 0;
        
        for (const item of results) {
            try {
                const data = item.toJSON();
                
                if (!data.certificate519 || !data.factoryNo) {
                    continue;
                }
                
                const existsQuery = new AV.Query('ciferquery519');
                existsQuery.equalTo('certificate519', data.certificate519);
                existsQuery.equalTo('factoryNo', data.factoryNo);
                const existing = await existsQuery.first();
                
                if (!existing) {
                    const cert519Obj = new AV.Object('ciferquery519');
                    cert519Obj.set('certificate519', data.certificate519);
                    cert519Obj.set('factoryNo', data.factoryNo);
                    cert519Obj.set('country', data.country || '');
                    await cert519Obj.save();
                    syncedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error('同步单条记录失败:', error);
            }
        }
        
        syncBtn.innerHTML = originalText;
        syncBtn.disabled = false;
        
        await loadCert519Data();
        adjustTableContainerHeight();
        
        alert(`同步完成！新增 ${syncedCount} 条记录，跳过 ${skippedCount} 条重复记录。`);
        
    } catch (error) {
        console.error('同步519证书数据失败:', error);
        
        const syncBtn = document.getElementById('syncCert519');
        syncBtn.innerHTML = '<i class="fas fa-sync"></i> 同步数据';
        syncBtn.disabled = false;
        
        alert('同步失败: ' + error.message);
    }
}

// 显示新增519厂号模态框
function showAddCert519Modal() {
    const modalHTML = `
        <div class="modal fade" id="addCert519Modal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">新增519厂号</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addCert519Form">
                            <div class="mb-3">
                                <label class="form-label">519证书号 *</label>
                                <input type="text" class="form-control" id="modalCertificate519" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">厂号 *</label>
                                <input type="text" class="form-control" id="modalFactoryNo" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">国家</label>
                                <input type="text" class="form-control" id="modalCountry" placeholder="输入国家">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="modalSaveBtn">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 如果模态框已存在，先移除
    const existingModal = document.getElementById('addCert519Modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 获取模态框元素
    const modalElement = document.getElementById('addCert519Modal');
    
    // 清空表单
    document.getElementById('modalCertificate519').value = '';
    document.getElementById('modalFactoryNo').value = '';
    document.getElementById('modalCountry').value = '';
    
    // 绑定保存按钮事件
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    modalSaveBtn.onclick = async function() {
        await handleSaveCert519();
    };
    
    // 显示模态框
    const modal = new bootstrap.Modal(modalElement);
    
    // 模态框关闭时清理
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.remove();
    });
    
    modal.show();
}

// 处理保存数据
async function handleSaveCert519() {
    try {
        if (isSaving) {
            console.log('正在保存中...');
            return;
        }
        
        isSaving = true;
        
        // 获取表单数据
        const certificate519 = document.getElementById('modalCertificate519').value.trim();
        const factoryNo = document.getElementById('modalFactoryNo').value.trim();
        const country = document.getElementById('modalCountry').value.trim();
        
        // 验证
        if (!certificate519 || !factoryNo) {
            alert('519证书号和厂号不能为空');
            isSaving = false;
            return;
        }
        
        // 检查是否已存在
        const query = new AV.Query('ciferquery519');
        query.equalTo('certificate519', certificate519);
        query.equalTo('factoryNo', factoryNo);
        const existing = await query.first();
        
        if (existing) {
            alert('该519证书号和厂号已存在');
            isSaving = false;
            return;
        }
        
        // 保存到LeanCloud
        const cert519Obj = new AV.Object('ciferquery519');
        cert519Obj.set('certificate519', certificate519);
        cert519Obj.set('factoryNo', factoryNo);
        cert519Obj.set('country', country);
        
        await cert519Obj.save();
        
        // 关闭模态框
        const modalElement = document.getElementById('addCert519Modal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        // 重新加载数据
        await loadCert519Data();
        adjustTableContainerHeight();
        
        isSaving = false;
        alert('保存成功！');
        
    } catch (error) {
        console.error('保存失败:', error);
        isSaving = false;
        alert('保存失败: ' + error.message);
    }
}

// 渲染519厂号表格
function renderCert519Table() {
    const tbody = document.getElementById('cert519Body');
    if (!tbody) return;
    
    // 清空表格内容
    tbody.innerHTML = '';
    
    if (filteredCert519Data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">暂无数据</td></tr>';
        // 重置表格容器高度
        const tableContainer = document.querySelector('#cert519 .table-container');
        if (tableContainer) {
            tableContainer.style.height = 'auto';
        }
        return;
    }
    
    // 计算分页数据
    const startIndex = (cert519CurrentPage - 1) * cert519ItemsPerPage;
    const endIndex = Math.min(startIndex + cert519ItemsPerPage, filteredCert519Data.length);
    const pageData = filteredCert519Data.slice(startIndex, endIndex);
    
    pageData.forEach((item, index) => {
        const rowIndex = startIndex + index + 1;
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${rowIndex}</td>
            <td>${item.certificate519}</td>
            <td>${item.factoryNo}</td>
            <td>${item.country}</td>
            <td>${item.createdAt}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCert519('${item.id}')">
                    删除
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 删除519厂号数据
async function deleteCert519(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
        // 从LeanCloud删除
        const cert519Obj = AV.Object.createWithoutData('ciferquery519', id);
        await cert519Obj.destroy();
        
        // 从本地数据中移除
        cert519Data = cert519Data.filter(item => item.id !== id);
        filteredCert519Data = filteredCert519Data.filter(item => item.id !== id);
        
        // 更新显示
        updateCert519Pagination();
        renderCert519Table();
        adjustTableContainerHeight();
        
        alert('删除成功！');
        
    } catch (error) {
        console.error('删除519厂号数据失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 调整表格容器高度
function adjustTableContainerHeight() {
    const tableContainer = document.querySelector('#cert519 .fixed-table-container');
    if (!tableContainer) return;
    
    // 如果数据很少，不需要固定高度
    if (filteredCert519Data.length <= cert519ItemsPerPage) {
        tableContainer.style.height = 'auto';
        tableContainer.style.overflow = 'visible';
        return;
    }
    
    // 获取页面可用高度
    const pageHeader = document.querySelector('#cert519 .page-header');
    const searchCard = document.querySelector('#cert519 .card');
    const paginationInfo = document.querySelector('#cert519 .statistics-info');
    
    if (!pageHeader || !searchCard || !paginationInfo) return;
    
    const headerHeight = pageHeader.offsetHeight;
    const searchCardHeight = searchCard.offsetHeight;
    const paginationHeight = paginationInfo.offsetHeight;
    const pagePadding = 40; // 页面内边距
    
    const availableHeight = window.innerHeight - headerHeight - searchCardHeight - paginationHeight - pagePadding - 100;
    
    // 设置最小和最大高度
    const minHeight = 300;
    const maxHeight = 600;
    
    let calculatedHeight = Math.max(minHeight, Math.min(maxHeight, availableHeight));
    
    // 设置高度
    tableContainer.style.height = calculatedHeight + 'px';
    tableContainer.style.overflow = 'auto';
}

// 更新519厂号分页
function updateCert519Pagination() {
    cert519TotalItems = filteredCert519Data.length;
    cert519TotalPages = Math.ceil(cert519TotalItems / cert519ItemsPerPage);
    
    // 更新分页信息
    const paginationInfo = document.getElementById('cert519PaginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `共 ${cert519TotalItems} 条记录`;
    }
    
    // 更新分页控件
    const pagination = document.getElementById('cert519Pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${cert519CurrentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" onclick="changeCert519Page(${cert519CurrentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </a>
    `;
    pagination.appendChild(prevLi);
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, cert519CurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(cert519TotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === cert519CurrentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" onclick="changeCert519Page(${i})">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${cert519CurrentPage === cert519TotalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" onclick="changeCert519Page(${cert519CurrentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </a>
    `;
    pagination.appendChild(nextLi);
}

// 切换分页
function changeCert519Page(page) {
    if (page >= 1 && page <= cert519TotalPages && page !== cert519CurrentPage) {
        cert519CurrentPage = page;
        renderCert519Table();
        adjustTableContainerHeight();
        
        // 滚动到表格顶部
        const tableContainer = document.querySelector('#cert519 .fixed-table-container');
        if (tableContainer) {
            tableContainer.scrollTop = 0;
        }
    }
}

// 导出函数
window.initCert519Page = initCert519Page;
window.loadCert519Data = loadCert519Data;
window.deleteCert519 = deleteCert519;
window.changeCert519Page = changeCert519Page;
window.adjustTableContainerHeight = adjustTableContainerHeight;