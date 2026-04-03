// ========================================
// iPhone-Style FOLDER SYSTEM
// 为 index_love_fixed_45.html 添加文件夹功能
// ========================================

(function() {
    'use strict';
    
    console.log('📁 iPhone-Style Folder System Loading...');

    // 文件夹数据存储
    let folders = {};
    let currentOpenFolder = null;
    let draggedOverAppId = null;
    let originalOpenApp = null;

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFolderSystem);
    } else {
        initFolderSystem();
    }

    // 初始化文件夹系统
    function initFolderSystem() {
        console.log('📁 Initializing Folder System...');
        
        // 加载文件夹数据
        loadFolders();
        
        // 添加文件夹视图HTML
        injectFolderHTML();
        
        // 增强拖拽系统以支持文件夹创建
        enhanceDragSystem();
        
        // 延迟渲染文件夹（等待homeApps加载）
        setTimeout(() => {
            if (typeof renderHomeScreen === 'function') {
                const originalRenderHomeScreen = window.renderHomeScreen;
                window.renderHomeScreen = function() {
                    originalRenderHomeScreen.apply(this, arguments);
                    renderFoldersInHomeScreen();
                };
            }
            renderFoldersInHomeScreen();
        }, 500);
        
        // 监听storage事件以同步多标签页
        window.addEventListener('storage', function(e) {
            if (e.key === 'homeFolders') {
                loadFolders();
                renderFoldersInHomeScreen();
            }
        });
        
        console.log('✅ Folder System Initialized!');
    }

    // 注入文件夹HTML结构
    function injectFolderHTML() {
        if (document.getElementById('folderView')) return; // 已存在
        
        const folderHTML = `
            <div class="folder-view" id="folderView">
                <div class="folder-close-btn" id="folderCloseBtn">×</div>
                <div class="folder-content">
                    <div class="folder-title" id="folderTitle">文件夹</div>
                    <div class="folder-apps-grid" id="folderAppsGrid"></div>
                </div>
            </div>
            <div class="folder-remove-hint" id="folderRemoveHint">拖到此处以从文件夹中移除</div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', folderHTML);
        
        // 绑定事件
        document.getElementById('folderCloseBtn').onclick = closeFolderView;
        document.getElementById('folderTitle').onclick = editFolderName;
        document.getElementById('folderView').onclick = function(e) {
            if (e.target.id === 'folderView') {
                closeFolderView();
            }
        };
    }

    // 保存文件夹数据到localStorage
    function saveFolders() {
        try {
            localStorage.setItem('homeFolders', JSON.stringify(folders));
        } catch (e) {
            console.error('Failed to save folders:', e);
        }
    }

    // 加载文件夹数据
    function loadFolders() {
        try {
            folders = JSON.parse(localStorage.getItem('homeFolders')) || {};
        } catch (e) {
            console.error('Failed to load folders:', e);
            folders = {};
        }
    }

    // 创建新文件夹
    function createFolder(appId1, appId2, pageIndex, position) {
        if (!window.homeApps) {
            console.error('homeApps not found!');
            return null;
        }
        
        const folderId = 'folder_' + Date.now();
        
        // 获取两个应用的信息
        const app1 = window.homeApps.find(app => app.id === appId1);
        const app2 = window.homeApps.find(app => app.id === appId2);
        
        if (!app1 || !app2) {
            console.error('Apps not found:', appId1, appId2);
            return null;
        }
        
        // 创建文件夹对象
        const folder = {
            id: folderId,
            name: '文件夹',
            color: '#667eea',
            apps: [appId1, appId2],
            page: pageIndex || 0,
            position: position || 0,
            type: 'folder'
        };
        
        // 添加到文件夹列表
        folders[folderId] = folder;
        
        // 从homeApps中移除这两个应用
        window.homeApps = window.homeApps.filter(app => app.id !== appId1 && app.id !== appId2);
        
        // 将文件夹添加到homeApps中
        window.homeApps.push(folder);
        
        // 保存数据
        saveFolders();
        if (typeof saveHomeAppsPosition === 'function') {
            saveHomeAppsPosition();
        }
        
        console.log('✅ Folder created:', folder);
        return folder;
    }

    // 在主屏幕中渲染文件夹
    function renderFoldersInHomeScreen() {
        if (!window.homeApps) return;
        
        // 查找所有文件夹类型的应用
        const folderApps = window.homeApps.filter(app => app.type === 'folder');
        
        folderApps.forEach(folder => {
            const folderElement = document.querySelector(`[data-app-id="${folder.id}"]`);
            if (folderElement) {
                if (!folderElement.classList.contains('folder')) {
                    folderElement.classList.add('folder');
                }
                
                // 创建文件夹预览
                const imgElement = folderElement.querySelector('.home-app-icon-img');
                if (imgElement) {
                    imgElement.innerHTML = '';
                    imgElement.style.background = folder.color || '#667eea';
                    imgElement.style.backgroundImage = 'none';
                    
                    const preview = createFolderPreview(folder);
                    imgElement.appendChild(preview);
                }
                
                // 修改点击事件为打开文件夹
                const clone = folderElement.cloneNode(true);
                folderElement.parentNode.replaceChild(clone, folderElement);
                clone.addEventListener('click', function(e) {
                    if (!document.querySelector('.home-screen').classList.contains('edit-mode')) {
                        e.preventDefault();
                        e.stopPropagation();
                        openFolder(folder.id);
                    }
                });
            }
        });
    }

    // 创建文件夹预览（显示前4个应用）
    function createFolderPreview(folder) {
        const preview = document.createElement('div');
        preview.className = 'folder-preview';
        
        // 获取文件夹内的应用（最多4个）
        const folderData = folders[folder.id];
        if (!folderData) return preview;
        
        const apps = folderData.apps.slice(0, 4);
        
        apps.forEach(appId => {
            const app = getAppById(appId);
            if (app) {
                const appPreview = document.createElement('div');
                appPreview.className = 'folder-preview-app';
                const iconUrl = app.icon || app.image || '';
                if (iconUrl) {
                    appPreview.style.backgroundImage = `url(${iconUrl})`;
                } else {
                    appPreview.style.background = '#667eea';
                }
                preview.appendChild(appPreview);
            }
        });
        
        // 如果应用少于4个，填充空白
        while (preview.children.length < 4) {
            const empty = document.createElement('div');
            empty.className = 'folder-preview-app';
            empty.style.background = 'rgba(255, 255, 255, 0.1)';
            preview.appendChild(empty);
        }
        
        return preview;
    }

    // 根据ID获取应用信息（包括系统应用）
    function getAppById(appId) {
        // 首先在homeApps中查找
        if (window.homeApps) {
            let app = window.homeApps.find(a => a.id === appId);
            if (app) return app;
        }
        
        // 在系统应用中查找
        const systemApps = [
            { id: 'chat', name: '聊天', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%234CAF50" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'moments', name: '朋友圈', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%232196F3" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'shop', name: '购物', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23FF9800" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'novel', name: '小说', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%239C27B0" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'location', name: '位置', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23F44336" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'health', name: '健康', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23E91E63" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'task', name: '任务', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%233F51B5" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'pet', name: '宠物屋', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23FFC107" width="100" height="100"/%3E%3C/svg%3E' },
            { id: 'baby', name: '宝宝', image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23FF5722" width="100" height="100"/%3E%3C/svg%3E' }
        ];
        
        return systemApps.find(a => a.id === appId);
    }

    // 打开文件夹
    window.openFolder = function(folderId) {
        const folder = folders[folderId];
        if (!folder) return;
        
        currentOpenFolder = folderId;
        
        // 显示文件夹视图
        const folderView = document.getElementById('folderView');
        const folderTitle = document.getElementById('folderTitle');
        const folderAppsGrid = document.getElementById('folderAppsGrid');
        
        if (!folderView || !folderTitle || !folderAppsGrid) return;
        
        // 设置文件夹名称
        folderTitle.textContent = folder.name || '文件夹';
        folderTitle.setAttribute('data-folder-id', folderId);
        
        // 清空并渲染应用
        folderAppsGrid.innerHTML = '';
        
        folder.apps.forEach(appId => {
            const app = getAppById(appId);
            if (app) {
                const appElement = document.createElement('div');
                appElement.className = 'folder-app-icon';
                appElement.setAttribute('data-app-id', appId);
                
                const iconUrl = app.icon || app.image || '';
                appElement.innerHTML = `
                    <div class="folder-app-img" style="background-image: url(${iconUrl})"></div>
                    <div class="folder-app-name">${app.name}</div>
                `;
                
                // 点击应用打开对应功能
                appElement.onclick = () => {
                    closeFolderView();
                    if (typeof openApp === 'function') {
                        openApp(appId);
                    } else {
                        console.log('Opening app:', appId);
                    }
                };
                
                folderAppsGrid.appendChild(appElement);
            }
        });
        
        // 显示文件夹视图
        folderView.classList.add('active');
    };

    // 关闭文件夹视图
    window.closeFolderView = function() {
        const folderView = document.getElementById('folderView');
        if (folderView) {
            folderView.classList.remove('active');
            currentOpenFolder = null;
        }
    };

    // 编辑文件夹名称
    window.editFolderName = function() {
        const folderTitle = document.getElementById('folderTitle');
        if (!folderTitle) return;
        
        const folderId = folderTitle.getAttribute('data-folder-id');
        const folder = folders[folderId];
        if (!folder) return;
        
        const currentName = folder.name || '文件夹';
        const newName = prompt('请输入文件夹名称:', currentName);
        
        if (newName && newName.trim()) {
            folder.name = newName.trim();
            folderTitle.textContent = newName.trim();
            
            // 更新homeApps中的文件夹名称
            if (window.homeApps) {
                const folderApp = window.homeApps.find(app => app.id === folderId);
                if (folderApp) {
                    folderApp.name = newName.trim();
                }
            }
            
            // 保存
            saveFolders();
            if (typeof saveHomeAppsPosition === 'function') {
                saveHomeAppsPosition();
            }
            if (typeof renderHomeScreen === 'function') {
                renderHomeScreen();
            }
        }
    };

    // 从文件夹中移除应用
    window.removeAppFromFolder = function(folderId, appId) {
        const folder = folders[folderId];
        if (!folder) return;
        
        // 从文件夹中移除应用
        folder.apps = folder.apps.filter(id => id !== appId);
        
        // 如果文件夹只剩1个或0个应用，删除文件夹并恢复应用
        if (folder.apps.length <= 1) {
            // 恢复剩余的应用到主屏幕
            folder.apps.forEach(remainingAppId => {
                const app = getAppById(remainingAppId);
                if (app && window.homeApps && !window.homeApps.find(a => a.id === remainingAppId)) {
                    window.homeApps.push({
                        ...app,
                        page: folder.page,
                        position: folder.position
                    });
                }
            });
            
            // 删除文件夹
            delete folders[folderId];
            if (window.homeApps) {
                window.homeApps = window.homeApps.filter(app => app.id !== folderId);
            }
            
            closeFolderView();
        } else {
            // 将移除的应用添加回主屏幕
            const app = getAppById(appId);
            if (app && window.homeApps && !window.homeApps.find(a => a.id === appId)) {
                window.homeApps.push({
                    ...app,
                    page: folder.page,
                    position: folder.position + 1
                });
            }
        }
        
        // 保存并重新渲染
        saveFolders();
        if (typeof saveHomeAppsPosition === 'function') {
            saveHomeAppsPosition();
        }
        if (typeof renderHomeScreen === 'function') {
            renderHomeScreen();
        }
        
        // 如果文件夹还存在，更新文件夹视图
        if (folders[folderId]) {
            openFolder(folderId);
        }
    };

    // 添加应用到文件夹
    window.addAppToFolder = function(folderId, appId) {
        const folder = folders[folderId];
        if (!folder) return;
        
        // 检查应用是否已在文件夹中
        if (folder.apps.includes(appId)) return;
        
        // 添加应用到文件夹
        folder.apps.push(appId);
        
        // 从主屏幕移除应用
        if (window.homeApps) {
            window.homeApps = window.homeApps.filter(app => app.id !== appId);
        }
        
        // 保存并重新渲染
        saveFolders();
        if (typeof saveHomeAppsPosition === 'function') {
            saveHomeAppsPosition();
        }
        if (typeof renderHomeScreen === 'function') {
            renderHomeScreen();
        }
    };

    // 增强拖拽系统以支持文件夹创建
    function enhanceDragSystem() {
        let draggedAppId = null;
        
        // 监听拖拽开始
        document.addEventListener('touchstart', function(e) {
            const appIcon = e.target.closest('.home-app-icon');
            if (appIcon) {
                draggedAppId = appIcon.getAttribute('data-app-id');
            }
        }, { passive: true });
        
        // 监听拖拽移动 - 检测碰撞
        document.addEventListener('touchmove', function(e) {
            if (!draggedAppId) return;
            
            const touch = e.touches[0];
            const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetApp = elementAtPoint ? elementAtPoint.closest('.home-app-icon') : null;
            
            if (targetApp && targetApp.getAttribute('data-app-id') !== draggedAppId && !targetApp.classList.contains('folder')) {
                const targetAppId = targetApp.getAttribute('data-app-id');
                
                if (targetAppId !== draggedOverAppId) {
                    // 清除之前的高亮
                    document.querySelectorAll('.home-app-icon.drop-target').forEach(el => {
                        el.classList.remove('drop-target');
                    });
                    
                    // 高亮当前目标
                    targetApp.classList.add('drop-target');
                    draggedOverAppId = targetAppId;
                    
                    // 震动反馈
                    if (navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                }
            } else {
                // 清除高亮
                if (draggedOverAppId) {
                    document.querySelectorAll('.home-app-icon.drop-target').forEach(el => {
                        el.classList.remove('drop-target');
                    });
                    draggedOverAppId = null;
                }
            }
        }, { passive: true });
        
        // 监听拖拽结束 - 创建文件夹
        document.addEventListener('touchend', function(e) {
            if (draggedAppId && draggedOverAppId) {
                // 清除高亮
                document.querySelectorAll('.home-app-icon.drop-target').forEach(el => {
                    el.classList.remove('drop-target');
                });
                
                // 创建文件夹
                const targetApp = window.homeApps ? window.homeApps.find(app => app.id === draggedOverAppId) : null;
                if (targetApp) {
                    const folder = createFolder(draggedAppId, draggedOverAppId, targetApp.page || 0, targetApp.position || 0);
                    
                    if (folder) {
                        // 重新渲染主屏幕
                        if (typeof renderHomeScreen === 'function') {
                            renderHomeScreen();
                        }
                        
                        // 震动反馈
                        if (navigator.vibrate) {
                            navigator.vibrate([10, 50, 10]);
                        }
                    }
                }
            }
            
            draggedAppId = null;
            draggedOverAppId = null;
        }, { passive: true });
    }

    console.log('✅ iPhone-Style Folder System Loaded!');
})();
