/** @odoo-module **/

import { Component, useRef, onMounted, onWillUnmount, onPatched } from "@odoo/owl";

export class GanttRenderer extends Component {
    static template = "web_gantt_ce.GanttRenderer";
    static props = {
        model: Object,
        openRecord: Function,
        onTaskUpdate: Function,
        filterUserId: { type: [Number, { value: null }], optional: true },
    };

    setup() {
        this.ganttRef = useRef("gantt-container");
        this.gantt = null;
        this.dragState = {
            isDragging: false,
            isVerticalDrag: false,
            draggedRow: null,
            draggedTaskId: null,
            startX: 0,
            startY: 0,
        };
        this.selectedArrow = null;
        this.arrowDragState = {
            isDragging: false,
            sourceTaskId: null,
            tempLine: null,
        };
        this.isFullscreen = false;
        this.pendingDeleteArrow = null;

        // Load saved preferences
        this.loadPreferences();

        onMounted(() => {
            this.renderGantt();
            this.setupKeyboardHandler();
        });

        onPatched(() => {
            this.renderGantt();
        });

        onWillUnmount(() => {
            if (this.gantt) {
                this.gantt = null;
            }
            this.cleanupVerticalDrag();
            this.cleanupArrowHandlers();
        });
    }

    setupKeyboardHandler() {
        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    cleanupArrowHandlers() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('mousemove', this.handleArrowDrag);
        document.removeEventListener('mouseup', this.handleArrowDragEnd);
    }

    handleKeyDown(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedArrow) {
            e.preventDefault();
            this.confirmDeleteDependency();
        }
        if (e.key === 'Escape') {
            this.deselectArrow();
            this.cancelArrowDrag();
            this.closeConfirmDialog();
            if (this.isFullscreen) {
                this.toggleFullscreen();
            }
        }
    }

    // Confirmation dialog for delete
    confirmDeleteDependency() {
        this.pendingDeleteArrow = this.selectedArrow;

        const overlay = document.createElement('div');
        overlay.className = 'gantt-confirm-overlay';
        overlay.id = 'gantt-confirm-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'gantt-confirm-dialog';
        dialog.id = 'gantt-confirm-dialog';
        dialog.innerHTML = `
            <h4>Remover Dependência</h4>
            <p>Tem certeza que deseja remover esta dependência?</p>
            <div class="dialog-buttons">
                <button class="btn-cancel">Cancelar</button>
                <button class="btn-confirm">Remover</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        overlay.addEventListener('click', () => this.closeConfirmDialog());
        dialog.querySelector('.btn-cancel').addEventListener('click', () => this.closeConfirmDialog());
        dialog.querySelector('.btn-confirm').addEventListener('click', () => {
            this.deleteSelectedDependency();
            this.closeConfirmDialog();
        });
    }

    closeConfirmDialog() {
        const overlay = document.getElementById('gantt-confirm-overlay');
        const dialog = document.getElementById('gantt-confirm-dialog');
        if (overlay) overlay.remove();
        if (dialog) dialog.remove();
        this.pendingDeleteArrow = null;
    }

    // Preferences management
    loadPreferences() {
        try {
            const saved = localStorage.getItem('gantt_preferences');
            if (saved) {
                this.preferences = JSON.parse(saved);
            } else {
                this.preferences = {
                    scale: 'Day',
                    showWeekends: true,
                };
            }
        } catch (e) {
            this.preferences = { scale: 'Day', showWeekends: true };
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('gantt_preferences', JSON.stringify(this.preferences));
        } catch (e) {
            console.warn('[Gantt] Could not save preferences');
        }
    }

    // Fullscreen toggle
    toggleFullscreen() {
        const ganttView = this.ganttRef.el?.closest('.o_gantt_view');
        if (!ganttView) return;

        this.isFullscreen = !this.isFullscreen;

        if (this.isFullscreen) {
            ganttView.classList.add('fullscreen');
            this.updateFullscreenButton('Sair');
        } else {
            ganttView.classList.remove('fullscreen');
            this.updateFullscreenButton('Expandir');
        }
    }

    updateFullscreenButton(text) {
        const btn = document.querySelector('.o_gantt_fullscreen_btn');
        if (btn) {
            const icon = this.isFullscreen ? '✕' : '⛶';
            btn.innerHTML = `<span class="fullscreen-icon">${icon}</span> ${text}`;
        }
    }

    cleanupVerticalDrag() {
        document.removeEventListener('mousemove', this.handleVerticalDrag);
        document.removeEventListener('mouseup', this.handleVerticalDragEnd);
    }

    get tasks() {
        return this.props.model.data.records || [];
    }

    get hasData() {
        const tasks = this.formatTasks();
        return tasks.length > 0;
    }

    get viewMode() {
        return this.props.model.meta?.scale || "Day";
    }

    renderGantt() {
        const container = this.ganttRef.el;
        if (!container || !this.hasData) return;

        container.innerHTML = "";

        const tasks = this.formatTasks();

        // Get user data for avatars
        const userMap = this.getUserMap();

        // Initialize Frappe Gantt
        this.gantt = new Gantt(container, tasks, {
            view_mode: this.viewMode,
            date_format: "YYYY-MM-DD HH:mm",
            popup_trigger: "hover", // Changed from click to hover
            custom_popup_html: (task) => {
                const userData = userMap[task.id] || {};
                const userName = userData.name || 'Não atribuído';
                const startDate = this.formatDisplayDate(task.start);
                const endDate = this.formatDisplayDate(task.end);
                return `
                    <div class="gantt-popup">
                        <h5>${task.name}</h5>
                        <p>👤 ${userName}</p>
                        <p>📅 ${startDate} → ${endDate}</p>
                        <p>📊 Progresso: ${task.progress}%</p>
                        <p style="font-size: 10px; color: #aaa; margin-top: 8px;">Click = Cores | Shift+Click = Editar | Ctrl+Click = Nova aba</p>
                    </div>
                `;
            },
            on_click: (task, e) => {
                // Ctrl+Click or Cmd+Click opens in new tab
                if (e && (e.ctrlKey || e.metaKey)) {
                    this.openTaskInNewTab(task);
                } else if (e && e.shiftKey) {
                    // Shift+Click opens the form
                    this.onTaskClick(task);
                } else {
                    // Normal click - emit event to open colors dropdown in header
                    this.emitTaskSelected(task);
                }
            },
            on_date_change: (task, start, end) => {
                this.onDateChange(task, start, end);
            },
            on_progress_change: (task, progress) => {
                this.onProgressChange(task, progress);
            },
        });

        // Setup vertical drag detection on bars
        this.setupVerticalDrag(container);

        // Setup arrow interaction (click to select, delete to remove)
        this.setupArrowInteraction(container);

        // Setup dependency creation (drag from task edge)
        this.setupDependencyCreation(container);

        // Highlight weekends
        this.highlightWeekends(container);

        // Add user avatars to bars
        this.addUserAvatars(container, userMap);

        // Setup context menu for quick editing
        this.setupContextMenu(container);

        // Setup click on empty area to create task
        this.setupEmptyAreaClick(container);
    }

    setupContextMenu(container) {
        // Remove existing context menu if any
        const existingMenu = document.getElementById('gantt-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu element
        const menu = document.createElement('div');
        menu.id = 'gantt-context-menu';
        menu.className = 'gantt-context-menu';
        menu.style.display = 'none';
        menu.innerHTML = `
            <div class="context-menu-header">Prioridade</div>
            <div class="context-menu-item" data-priority="3">
                <span class="priority-dot priority-urgent"></span>
                Urgente
            </div>
            <div class="context-menu-item" data-priority="2">
                <span class="priority-dot priority-very-high"></span>
                Muito Alta
            </div>
            <div class="context-menu-item" data-priority="1">
                <span class="priority-dot priority-high"></span>
                Alta
            </div>
            <div class="context-menu-item" data-priority="0">
                <span class="priority-dot priority-normal"></span>
                Normal
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="open">
                <span class="context-menu-icon">📝</span>
                Abrir Tarefa
            </div>
            <div class="context-menu-item" data-action="open-new-tab">
                <span class="context-menu-icon">🔗</span>
                Abrir em Nova Aba
            </div>
        `;
        document.body.appendChild(menu);

        // Store reference to current task for context menu actions
        this.contextMenuTaskId = null;

        // Add right-click handler to bar elements
        container.addEventListener('contextmenu', (e) => {
            const barWrapper = e.target.closest('.bar-wrapper');
            if (barWrapper) {
                e.preventDefault();
                const taskId = barWrapper.getAttribute('data-id');
                if (taskId) {
                    this.contextMenuTaskId = taskId;
                    this.showContextMenu(e.pageX, e.pageY);
                }
            }
        });

        // Handle menu item clicks
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const priority = item.getAttribute('data-priority');
                const action = item.getAttribute('data-action');

                if (priority !== null) {
                    this.updateTaskPriority(this.contextMenuTaskId, priority);
                } else if (action === 'open') {
                    this.onTaskClick({ id: this.contextMenuTaskId });
                } else if (action === 'open-new-tab') {
                    this.openTaskInNewTab({ id: this.contextMenuTaskId });
                }

                this.hideContextMenu();
            }
        });

        // Hide menu on click outside
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Hide menu on scroll
        container.addEventListener('scroll', () => {
            this.hideContextMenu();
        });
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('gantt-context-menu');
        if (menu) {
            // Adjust position to keep menu within viewport
            const menuWidth = 180;
            const menuHeight = 280;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (x + menuWidth > viewportWidth) {
                x = viewportWidth - menuWidth - 10;
            }
            if (y + menuHeight > viewportHeight) {
                y = viewportHeight - menuHeight - 10;
            }

            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.style.display = 'block';
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('gantt-context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.contextMenuTaskId = null;
    }

    updateTaskPriority(taskId, priority) {
        const recordId = parseInt(taskId);
        this.props.onTaskUpdate(recordId, {
            priority: priority,
        });
    }

    formatDisplayDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    }

    getUserMap() {
        const userMap = {};
        const records = this.props.model.data.records || [];
        records.forEach(record => {
            const userIds = record.data.user_ids || [];
            const userNames = record.data._userNames || {};

            // Get first user's name and ID if available
            let userName = 'Não atribuído';
            let userId = null;
            if (userIds.length > 0) {
                userId = userIds[0];
                if (userNames[userId]) {
                    userName = userNames[userId];
                }
            }

            userMap[String(record.resId)] = {
                name: userName,
                initials: this.getInitials(userName),
                userId: userId,
            };
        });
        return userMap;
    }

    getInitials(name) {
        if (!name || name === 'Não atribuído') return '?';
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    openTaskInNewTab(task) {
        const recordId = parseInt(task.id);
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/odoo/project.task/${recordId}`;
        window.open(url, '_blank');
    }

    emitTaskSelected(task) {
        // Get task priority from records
        const recordId = parseInt(task.id);
        const record = this.tasks.find(r => r.resId === recordId);
        const priority = record?.data?.priority || '0';

        // Dispatch custom event for controller to handle
        const event = new CustomEvent('gantt-task-selected', {
            detail: {
                taskId: task.id,
                taskName: task.name,
                taskPriority: priority,
            },
            bubbles: true,
        });
        document.dispatchEvent(event);
        console.log('[GanttRenderer] Emitted task selected event:', task.id, task.name, priority);
    }

    highlightWeekends(container) {
        // Wait for Gantt to render
        setTimeout(() => {
            const svg = container.querySelector('svg.gantt');
            if (!svg) return;

            const dates = svg.querySelectorAll('.upper-text, .lower-text');
            const gridRows = svg.querySelector('.grid-rows');
            if (!gridRows) return;

            // Get the date columns from the header
            const lowerTexts = svg.querySelectorAll('.lower-text');
            lowerTexts.forEach((text, index) => {
                const dateText = text.textContent;
                // Parse date to check if weekend
                const rect = text.getBoundingClientRect();
                const svgRect = svg.getBoundingClientRect();
                const x = rect.left - svgRect.left;

                // Try to determine if this is a weekend column
                // This is approximate - Frappe Gantt doesn't expose date info directly
                const day = new Date();
                day.setDate(day.getDate() + index - Math.floor(lowerTexts.length / 2));

                if (day.getDay() === 0 || day.getDay() === 6) {
                    // Create weekend highlight
                    const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    const columnWidth = svg.clientWidth / lowerTexts.length;
                    highlight.setAttribute('x', index * columnWidth);
                    highlight.setAttribute('y', '0');
                    highlight.setAttribute('width', columnWidth);
                    highlight.setAttribute('height', svg.clientHeight);
                    highlight.setAttribute('class', 'weekend-highlight');
                    highlight.style.pointerEvents = 'none';

                    // Insert at the beginning so it's behind everything
                    const firstChild = gridRows.firstChild;
                    if (firstChild) {
                        gridRows.insertBefore(highlight, firstChild);
                    }
                }
            });
        }, 100);
    }

    addUserAvatars(container, userMap) {
        setTimeout(() => {
            const barWrappers = container.querySelectorAll('.bar-wrapper');
            const svg = container.querySelector('svg.gantt');

            // Create defs for clip paths if not exists
            let defs = svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svg.insertBefore(defs, svg.firstChild);
            }

            barWrappers.forEach((wrapper, index) => {
                const taskId = wrapper.getAttribute('data-id');
                const userData = userMap[taskId];
                if (!userData) return;

                const bar = wrapper.querySelector('.bar');
                if (!bar) return;

                const barRect = bar.getBBox();
                const cx = barRect.x - 15;
                const cy = barRect.y + barRect.height / 2;
                const radius = 10;

                // Create avatar group
                const avatarGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                avatarGroup.setAttribute('class', 'task-avatar');

                // Invisible larger hit area - prevents flickering
                const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                hitArea.setAttribute('cx', cx);
                hitArea.setAttribute('cy', cy);
                hitArea.setAttribute('r', '16'); // Larger than visible
                hitArea.setAttribute('fill', 'transparent');
                hitArea.style.cursor = 'pointer';

                // Add tooltip to hitArea
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                title.textContent = userData.name;
                hitArea.appendChild(title);

                // Check if user has an ID (for avatar image)
                if (userData.userId) {
                    // Create unique clip path for this avatar
                    const clipId = `avatar-clip-${taskId}-${index}`;
                    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                    clipPath.setAttribute('id', clipId);

                    const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    clipCircle.setAttribute('cx', cx);
                    clipCircle.setAttribute('cy', cy);
                    clipCircle.setAttribute('r', radius);
                    clipPath.appendChild(clipCircle);
                    defs.appendChild(clipPath);

                    // Create image element with user avatar
                    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    image.setAttribute('x', cx - radius);
                    image.setAttribute('y', cy - radius);
                    image.setAttribute('width', radius * 2);
                    image.setAttribute('height', radius * 2);
                    image.setAttribute('href', `/web/image/res.users/${userData.userId}/avatar_128`);
                    image.setAttribute('clip-path', `url(#${clipId})`);
                    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
                    image.style.pointerEvents = 'none';

                    // Add border circle
                    const borderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    borderCircle.setAttribute('cx', cx);
                    borderCircle.setAttribute('cy', cy);
                    borderCircle.setAttribute('r', radius);
                    borderCircle.setAttribute('fill', 'none');
                    borderCircle.setAttribute('stroke', '#714b67');
                    borderCircle.setAttribute('stroke-width', '1.5');
                    borderCircle.style.pointerEvents = 'none';

                    avatarGroup.appendChild(image);
                    avatarGroup.appendChild(borderCircle);
                } else {
                    // Fallback: Avatar circle with initials (visible)
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', cx);
                    circle.setAttribute('cy', cy);
                    circle.setAttribute('r', radius);
                    circle.setAttribute('fill', '#714b67');
                    circle.setAttribute('class', 'avatar-circle');
                    circle.style.pointerEvents = 'none';

                    // Avatar text (initials)
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', cx);
                    text.setAttribute('y', cy + 4);
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('fill', 'white');
                    text.setAttribute('font-size', '9');
                    text.setAttribute('font-weight', 'bold');
                    text.textContent = userData.initials;
                    text.style.pointerEvents = 'none';

                    avatarGroup.appendChild(circle);
                    avatarGroup.appendChild(text);
                }

                avatarGroup.appendChild(hitArea);
                wrapper.appendChild(avatarGroup);
            });
        }, 100);
    }

    setupVerticalDrag(container) {
        const barWrappers = container.querySelectorAll('.bar-wrapper');

        // Bind event handlers
        this.handleVerticalDrag = this.handleVerticalDrag.bind(this);
        this.handleVerticalDragEnd = this.handleVerticalDragEnd.bind(this);

        barWrappers.forEach((wrapper) => {
            const bar = wrapper.querySelector('.bar');
            if (!bar) return;

            // Listen for mousedown on the bar (not handles)
            bar.addEventListener('mousedown', (e) => {
                // Don't interfere with resize handles or other elements
                if (e.target.classList.contains('handle')) return;
                if (e.target.closest('.handle-group')) return;

                const taskId = wrapper.getAttribute('data-id');
                const barWrappers = Array.from(container.querySelectorAll('.bar-wrapper'));
                const barRect = bar.getBBox();

                this.dragState = {
                    isDragging: true,
                    isVerticalDrag: false,
                    draggedRow: wrapper,
                    draggedTaskId: taskId,
                    startX: e.clientX,
                    startY: e.clientY,
                    initialIndex: barWrappers.indexOf(wrapper),
                    barWrappers: barWrappers,
                    barY: barRect.y,
                    rowHeight: 38,
                    verticalThreshold: 15, // Pixels to move before considering vertical drag
                };

                document.addEventListener('mousemove', this.handleVerticalDrag);
                document.addEventListener('mouseup', this.handleVerticalDragEnd);
            });
        });

        // Add tooltip hint
        this.addDragHint(container);
    }

    addDragHint(container) {
        // Add a subtle tooltip on first hover
        let hintShown = false;
        const barWrappers = container.querySelectorAll('.bar-wrapper');

        barWrappers.forEach((wrapper) => {
            wrapper.addEventListener('mouseenter', () => {
                if (!hintShown && !this.dragState.isDragging) {
                    // Show hint only once per session
                    const hint = document.createElement('div');
                    hint.className = 'gantt-drag-hint';
                    hint.innerHTML = 'Arraste para cima/baixo para reordenar';
                    hint.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(113, 75, 103, 0.9);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 4px;
                        font-size: 13px;
                        z-index: 9999;
                        animation: fadeInOut 3s ease forwards;
                    `;
                    document.body.appendChild(hint);
                    hintShown = true;

                    // Add animation style if not exists
                    if (!document.querySelector('#gantt-hint-style')) {
                        const style = document.createElement('style');
                        style.id = 'gantt-hint-style';
                        style.textContent = `
                            @keyframes fadeInOut {
                                0% { opacity: 0; }
                                10% { opacity: 1; }
                                80% { opacity: 1; }
                                100% { opacity: 0; }
                            }
                        `;
                        document.head.appendChild(style);
                    }

                    setTimeout(() => hint.remove(), 3000);
                }
            });
        });
    }

    handleVerticalDrag(e) {
        if (!this.dragState.isDragging) return;

        const { draggedRow, barWrappers, startX, startY, rowHeight, initialIndex, verticalThreshold } = this.dragState;
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = e.clientY - startY;

        // Determine if this is a vertical drag (more vertical movement than horizontal)
        if (!this.dragState.isVerticalDrag) {
            if (Math.abs(deltaY) > verticalThreshold && Math.abs(deltaY) > deltaX) {
                // This is a vertical drag - cancel Frappe's horizontal drag
                this.dragState.isVerticalDrag = true;

                // Visual feedback
                draggedRow.style.opacity = '0.5';
                draggedRow.style.transition = 'opacity 0.2s';

                // Stop Frappe Gantt's internal drag
                e.stopPropagation();
            } else if (deltaX > verticalThreshold) {
                // This is a horizontal drag - let Frappe handle it
                this.cleanupDragState();
                return;
            }
        }

        if (this.dragState.isVerticalDrag) {
            e.preventDefault();
            e.stopPropagation();

            const moveCount = Math.round(deltaY / rowHeight);

            if (moveCount !== 0) {
                let newIndex = initialIndex + moveCount;
                newIndex = Math.max(0, Math.min(barWrappers.length - 1, newIndex));

                // Highlight target row
                barWrappers.forEach((wrapper, index) => {
                    if (index === newIndex && wrapper !== draggedRow) {
                        wrapper.style.outline = '2px dashed #714b67';
                        wrapper.style.outlineOffset = '-2px';
                    } else if (wrapper !== draggedRow) {
                        wrapper.style.outline = '';
                    }
                });

                this.dragState.targetIndex = newIndex;
            }
        }
    }

    handleVerticalDragEnd(e) {
        if (!this.dragState.isDragging) return;

        const { draggedRow, draggedTaskId, initialIndex, targetIndex, barWrappers, isVerticalDrag } = this.dragState;

        // Reset visual state
        if (draggedRow) {
            draggedRow.style.opacity = '';
            draggedRow.style.transition = '';
        }

        barWrappers?.forEach((wrapper) => {
            wrapper.style.outline = '';
        });

        // If was a vertical drag and position changed, update sequence
        if (isVerticalDrag && targetIndex !== undefined && targetIndex !== initialIndex) {
            const movedTaskId = parseInt(draggedTaskId);

            // Build new order array
            const newOrder = [];
            barWrappers.forEach((wrapper, index) => {
                const id = parseInt(wrapper.getAttribute('data-id'));
                if (index === targetIndex) {
                    newOrder.push(movedTaskId);
                }
                if (id !== movedTaskId) {
                    newOrder.push(id);
                }
            });
            if (targetIndex === barWrappers.length) {
                newOrder.push(movedTaskId);
            }

            console.log('[Gantt] Vertical drag - updating task sequences:', newOrder);
            this.updateTaskSequences(newOrder);
        }

        this.cleanupDragState();
    }

    cleanupDragState() {
        document.removeEventListener('mousemove', this.handleVerticalDrag);
        document.removeEventListener('mouseup', this.handleVerticalDragEnd);

        this.dragState = {
            isDragging: false,
            isVerticalDrag: false,
            draggedRow: null,
            draggedTaskId: null,
            startX: 0,
            startY: 0,
        };
    }

    // =============================================
    // Arrow Interaction Methods
    // =============================================

    setupArrowInteraction(container) {
        // Wait a bit for Frappe Gantt to render arrows
        setTimeout(() => {
            const arrowGroup = container.querySelector('g.arrow');
            if (!arrowGroup) return;

            const arrows = arrowGroup.querySelectorAll('path');
            arrows.forEach((arrow, index) => {
                // Make arrows clickable
                arrow.style.cursor = 'pointer';
                arrow.style.strokeWidth = '2';
                arrow.style.pointerEvents = 'stroke';

                // Store dependency info on the arrow
                const depInfo = this.getArrowDependencyInfo(index);
                if (depInfo) {
                    arrow.dataset.fromTask = depInfo.from;
                    arrow.dataset.toTask = depInfo.to;
                }

                // Click to select
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectArrow(arrow);
                });

                // Hover effect
                arrow.addEventListener('mouseenter', () => {
                    if (arrow !== this.selectedArrow?.element) {
                        arrow.style.stroke = '#714b67';
                        arrow.style.strokeWidth = '3';
                    }
                });

                arrow.addEventListener('mouseleave', () => {
                    if (arrow !== this.selectedArrow?.element) {
                        arrow.style.stroke = '';
                        arrow.style.strokeWidth = '2';
                    }
                });
            });

            // Click outside to deselect
            container.addEventListener('click', (e) => {
                if (!e.target.closest('g.arrow')) {
                    this.deselectArrow();
                }
            });
        }, 100);
    }

    getArrowDependencyInfo(arrowIndex) {
        // Build dependency map from tasks
        const tasks = this.formatTasks();
        const dependencies = [];

        tasks.forEach(task => {
            if (task.dependencies) {
                const deps = task.dependencies.split(',').map(d => d.trim()).filter(d => d);
                deps.forEach(depId => {
                    dependencies.push({ from: depId, to: task.id });
                });
            }
        });

        return dependencies[arrowIndex] || null;
    }

    selectArrow(arrowElement) {
        // Deselect previous
        this.deselectArrow();

        // Select new
        this.selectedArrow = {
            element: arrowElement,
            fromTask: arrowElement.dataset.fromTask,
            toTask: arrowElement.dataset.toTask,
        };

        // Visual feedback
        arrowElement.style.stroke = '#dc3545';
        arrowElement.style.strokeWidth = '4';
        arrowElement.style.filter = 'drop-shadow(0 0 3px rgba(220, 53, 69, 0.5))';

        // Show hint
        this.showArrowHint('Pressione Delete para remover dependência');

        console.log('[Gantt] Arrow selected:', this.selectedArrow.fromTask, '->', this.selectedArrow.toTask);
    }

    deselectArrow() {
        if (this.selectedArrow?.element) {
            this.selectedArrow.element.style.stroke = '';
            this.selectedArrow.element.style.strokeWidth = '2';
            this.selectedArrow.element.style.filter = '';
        }
        this.selectedArrow = null;
        this.hideArrowHint();
    }

    async deleteSelectedDependency() {
        if (!this.selectedArrow) return;

        const { fromTask, toTask } = this.selectedArrow;
        if (!fromTask || !toTask) {
            console.warn('[Gantt] Cannot delete: missing task info');
            return;
        }

        console.log('[Gantt] Deleting dependency:', fromTask, '->', toTask);

        // Get current dependencies of the target task
        const targetTaskId = parseInt(toTask);
        const sourceTaskId = parseInt(fromTask);

        // Find the record and update depend_on_ids
        const record = this.tasks.find(r => r.resId === targetTaskId);
        if (record) {
            const currentDeps = record.data.depend_on_ids || [];
            const newDeps = currentDeps.filter(id => id !== sourceTaskId);

            await this.props.onTaskUpdate(targetTaskId, {
                depend_on_ids: [[6, 0, newDeps]], // Odoo Many2many replace command
            });

            // Reload to refresh arrows
            if (this.props.model && this.props.model.load) {
                await this.props.model.load({});
            }
        }

        this.selectedArrow = null;
        this.hideArrowHint();
    }

    showArrowHint(message) {
        this.hideArrowHint();

        const hint = document.createElement('div');
        hint.id = 'gantt-arrow-hint';
        hint.innerHTML = message;
        hint.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(220, 53, 69, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            z-index: 9999;
        `;
        document.body.appendChild(hint);
    }

    hideArrowHint() {
        const hint = document.getElementById('gantt-arrow-hint');
        if (hint) hint.remove();
    }

    // =============================================
    // Dependency Creation Methods
    // =============================================

    setupDependencyCreation(container) {
        const barWrappers = container.querySelectorAll('.bar-wrapper');

        this.handleArrowDrag = this.handleArrowDrag.bind(this);
        this.handleArrowDragEnd = this.handleArrowDragEnd.bind(this);

        barWrappers.forEach((wrapper) => {
            const bar = wrapper.querySelector('.bar');
            if (!bar) return;

            const taskId = wrapper.getAttribute('data-id');

            // Create a drag handle on the right side of the bar
            const barRect = bar.getBBox();

            // Add right-side connector point (for creating dependencies)
            // Create a group to hold both the visible circle and invisible hit area
            const connectorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            connectorGroup.setAttribute('class', 'connector-group');

            const cx = barRect.x + barRect.width;
            const cy = barRect.y + barRect.height / 2;

            // Invisible larger hit area - always present, never changes opacity
            const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hitArea.setAttribute('cx', cx);
            hitArea.setAttribute('cy', cy);
            hitArea.setAttribute('r', '16'); // Larger invisible hit area
            hitArea.setAttribute('fill', 'transparent');
            hitArea.style.cursor = 'crosshair';
            hitArea.style.pointerEvents = 'auto';

            // Visible connector circle
            const connector = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            connector.setAttribute('cx', cx);
            connector.setAttribute('cy', cy);
            connector.setAttribute('r', '6');
            connector.setAttribute('fill', '#714b67');
            connector.setAttribute('stroke', 'white');
            connector.setAttribute('stroke-width', '2');
            connector.setAttribute('class', 'dependency-connector');
            connector.style.opacity = '0';
            connector.style.transition = 'opacity 0.15s ease';
            connector.style.pointerEvents = 'none'; // Visual only, hit area handles events

            connectorGroup.appendChild(connector);
            connectorGroup.appendChild(hitArea);
            wrapper.appendChild(connectorGroup);

            // Simple hover state - controlled by bar and hitArea
            let hoverCount = 0;

            const show = () => {
                hoverCount++;
                connector.style.opacity = '1';
            };

            const hide = () => {
                hoverCount--;
                if (hoverCount <= 0 && !this.arrowDragState.isDragging) {
                    hoverCount = 0;
                    connector.style.opacity = '0';
                }
            };

            // Bar hover
            bar.addEventListener('mouseenter', show);
            bar.addEventListener('mouseleave', hide);

            // Hit area hover (not the visible connector)
            hitArea.addEventListener('mouseenter', show);
            hitArea.addEventListener('mouseleave', hide);

            // Start dragging from hit area (the invisible larger circle)
            hitArea.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const svgEl = container.querySelector('svg.gantt');
                const pt = svgEl.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const svgP = pt.matrixTransform(svgEl.getScreenCTM().inverse());

                this.arrowDragState = {
                    isDragging: true,
                    sourceTaskId: taskId,
                    startX: svgP.x,
                    startY: svgP.y,
                    svgEl: svgEl,
                };

                // Create temporary line
                const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tempLine.setAttribute('x1', svgP.x);
                tempLine.setAttribute('y1', svgP.y);
                tempLine.setAttribute('x2', svgP.x);
                tempLine.setAttribute('y2', svgP.y);
                tempLine.setAttribute('stroke', '#714b67');
                tempLine.setAttribute('stroke-width', '2');
                tempLine.setAttribute('stroke-dasharray', '5,5');
                tempLine.setAttribute('marker-end', 'url(#arrowhead)');
                svgEl.appendChild(tempLine);
                this.arrowDragState.tempLine = tempLine;

                // Add arrowhead marker if not exists
                this.ensureArrowMarker(svgEl);

                document.addEventListener('mousemove', this.handleArrowDrag);
                document.addEventListener('mouseup', this.handleArrowDragEnd);

                console.log('[Gantt] Started dependency drag from task:', taskId);
            });
        });
    }

    ensureArrowMarker(svgEl) {
        if (svgEl.querySelector('#arrowhead')) return;

        const defs = svgEl.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        if (!svgEl.querySelector('defs')) {
            svgEl.insertBefore(defs, svgEl.firstChild);
        }

        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#714b67');
        marker.appendChild(polygon);
        defs.appendChild(marker);
    }

    handleArrowDrag(e) {
        if (!this.arrowDragState.isDragging) return;

        const { svgEl, tempLine } = this.arrowDragState;

        const pt = svgEl.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svgEl.getScreenCTM().inverse());

        tempLine.setAttribute('x2', svgP.x);
        tempLine.setAttribute('y2', svgP.y);

        // Highlight potential target
        const container = this.ganttRef.el;
        const barWrappers = container.querySelectorAll('.bar-wrapper');

        barWrappers.forEach((wrapper) => {
            const bar = wrapper.querySelector('.bar');
            if (!bar) return;

            const rect = bar.getBoundingClientRect();
            if (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom &&
                wrapper.getAttribute('data-id') !== this.arrowDragState.sourceTaskId
            ) {
                wrapper.style.outline = '2px solid #714b67';
                this.arrowDragState.targetTaskId = wrapper.getAttribute('data-id');
            } else {
                wrapper.style.outline = '';
            }
        });
    }

    handleArrowDragEnd(e) {
        if (!this.arrowDragState.isDragging) return;

        const { sourceTaskId, targetTaskId, tempLine } = this.arrowDragState;

        // Remove temp line
        if (tempLine) {
            tempLine.remove();
        }

        // Reset highlights
        const container = this.ganttRef.el;
        container.querySelectorAll('.bar-wrapper').forEach((wrapper) => {
            wrapper.style.outline = '';
        });

        // Create dependency if valid target
        if (targetTaskId && targetTaskId !== sourceTaskId) {
            console.log('[Gantt] Creating dependency:', sourceTaskId, '->', targetTaskId);
            this.createDependency(parseInt(sourceTaskId), parseInt(targetTaskId));
        }

        // Cleanup
        document.removeEventListener('mousemove', this.handleArrowDrag);
        document.removeEventListener('mouseup', this.handleArrowDragEnd);

        this.arrowDragState = {
            isDragging: false,
            sourceTaskId: null,
            tempLine: null,
        };
    }

    cancelArrowDrag() {
        if (this.arrowDragState.tempLine) {
            this.arrowDragState.tempLine.remove();
        }
        document.removeEventListener('mousemove', this.handleArrowDrag);
        document.removeEventListener('mouseup', this.handleArrowDragEnd);
        this.arrowDragState = {
            isDragging: false,
            sourceTaskId: null,
            tempLine: null,
        };
    }

    async createDependency(sourceTaskId, targetTaskId) {
        // Get current dependencies of the target task
        const record = this.tasks.find(r => r.resId === targetTaskId);
        if (!record) return;

        const currentDeps = record.data.depend_on_ids || [];

        // Check if dependency already exists
        if (currentDeps.includes(sourceTaskId)) {
            console.log('[Gantt] Dependency already exists');
            return;
        }

        // Add new dependency
        const newDeps = [...currentDeps, sourceTaskId];

        await this.props.onTaskUpdate(targetTaskId, {
            depend_on_ids: [[6, 0, newDeps]], // Odoo Many2many replace command
        });

        // Reload to refresh arrows
        if (this.props.model && this.props.model.load) {
            await this.props.model.load({});
        }

        console.log('[Gantt] Dependency created successfully');
    }

    async updateTaskSequences(newOrder) {
        for (let i = 0; i < newOrder.length; i++) {
            const taskId = newOrder[i];
            await this.props.onTaskUpdate(taskId, {
                sequence: i * 10,
            });
        }

        if (this.props.model && this.props.model.load) {
            await this.props.model.load({});
        }
    }

    formatTasks() {
        let records = this.tasks;
        const dateStartField = this.props.model.meta?.dateStartField || "date_assign";
        const dateStopField = this.props.model.meta?.dateStopField || "date_deadline";

        // Apply user filter if set
        if (this.props.filterUserId) {
            records = records.filter(record => {
                const userIds = record.data.user_ids || [];
                return userIds.includes(this.props.filterUserId);
            });
            console.log("[Gantt] Filtered by user:", this.props.filterUserId, "- Tasks:", records.length);
        }

        console.log("[Gantt] Records:", records.length, records);
        console.log("[Gantt] Fields:", dateStartField, dateStopField);

        return records.map((record) => {
            const startDate = record.data[dateStartField] || record.data.create_date;
            const endDate = record.data[dateStopField] || this.addDays(startDate, 1);

            console.log("[Gantt] Task:", record.data.display_name, "start:", startDate, "end:", endDate, "progress:", record.data.progress, "data:", JSON.stringify(Object.keys(record.data)));

            return {
                id: String(record.resId),
                name: record.data.display_name || record.data.name || "Untitled",
                start: this.formatDate(startDate),
                end: this.formatDate(endDate),
                progress: record.data.progress || 0,
                dependencies: this.getDependencies(record),
                custom_class: this.getTaskClass(record),
            };
        }).filter(task => task.start && task.end);
    }

    formatDate(date) {
        if (!date) return null;
        if (typeof date === "string") {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            }
            return date.split(" ")[0];
        }
        if (date instanceof Date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        if (date.toISODate) {
            return date.toISODate();
        }
        return null;
    }

    addDays(date, days) {
        if (!date) return null;
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    getDependencies(record) {
        const deps = record.data.depend_on_ids || [];
        return deps.map(id => String(id)).join(", ");
    }

    getTaskClass(record) {
        const priority = record.data.priority;
        if (priority === "3") return "gantt-urgent";
        if (priority === "2") return "gantt-very-high";
        if (priority === "1") return "gantt-high";
        return "gantt-normal";
    }

    onTaskClick(task) {
        const recordId = parseInt(task.id);
        this.props.openRecord({ resId: recordId });
    }

    onDateChange(task, start, end) {
        const recordId = parseInt(task.id);
        const dateStartField = this.props.model.meta?.dateStartField || "date_assign";
        const dateStopField = this.props.model.meta?.dateStopField || "date_deadline";

        this.props.onTaskUpdate(recordId, {
            [dateStartField]: this.formatDate(start),
            [dateStopField]: this.formatDate(end),
        });
    }

    onProgressChange(task, progress) {
        const recordId = parseInt(task.id);
        this.props.onTaskUpdate(recordId, {
            progress: progress,
        });
    }

    changeViewMode(mode) {
        if (this.gantt) {
            this.gantt.change_view_mode(mode);
        }
    }

    // Setup double-click on empty area to create new task
    setupEmptyAreaClick(container) {
        setTimeout(() => {
            const svg = container.querySelector('svg.gantt');
            if (!svg) {
                console.log('[Gantt] No SVG found');
                return;
            }

            // Try different selectors for the grid area
            let gridArea = svg.querySelector('.grid-rows');
            if (!gridArea) {
                gridArea = svg.querySelector('.grid');
            }
            if (!gridArea) {
                // Fallback: use the SVG itself
                gridArea = svg;
            }

            console.log('[Gantt] Setting up double-click on:', gridArea.tagName, gridArea.className);

            // Double-click on grid to create task
            gridArea.addEventListener('dblclick', (e) => {
                console.log('[Gantt] Double-click detected on:', e.target.tagName, e.target.className);

                // Don't trigger if clicking on a task bar
                if (e.target.closest('.bar-wrapper')) {
                    console.log('[Gantt] Click was on a bar, ignoring');
                    return;
                }

                // Calculate the date from click position
                const date = this.getDateFromClick(e, svg);
                console.log('[Gantt] Calculated date:', date);

                if (date) {
                    this.emitCreateTask(date);
                }
            });
        }, 200);
    }

    // Calculate date from click position on the Gantt grid
    getDateFromClick(e, svg) {
        console.log('[Gantt] getDateFromClick - gantt:', this.gantt);

        if (!this.gantt) return null;

        const svgRect = svg.getBoundingClientRect();
        const clickX = e.clientX - svgRect.left;

        console.log('[Gantt] Click X position:', clickX);

        // Try to get dates from Frappe Gantt
        let ganttStart = this.gantt.gantt_start;
        let ganttEnd = this.gantt.gantt_end;

        console.log('[Gantt] Gantt dates:', ganttStart, ganttEnd);

        // If not available, try to get from options or tasks
        if (!ganttStart || !ganttEnd) {
            // Get from tasks
            const tasks = this.formatTasks();
            if (tasks.length > 0) {
                const dates = tasks.map(t => new Date(t.start)).filter(d => !isNaN(d));
                if (dates.length > 0) {
                    ganttStart = new Date(Math.min(...dates));
                    ganttEnd = new Date(Math.max(...dates));
                    // Add some padding
                    ganttStart.setDate(ganttStart.getDate() - 7);
                    ganttEnd.setDate(ganttEnd.getDate() + 30);
                }
            }
        }

        if (!ganttStart || !ganttEnd) {
            console.log('[Gantt] Could not determine date range');
            // Fallback: use current month
            ganttStart = new Date();
            ganttStart.setDate(1);
            ganttEnd = new Date();
            ganttEnd.setMonth(ganttEnd.getMonth() + 1);
        }

        const gridWidth = svgRect.width;

        // Calculate total days in view
        const startDate = new Date(ganttStart);
        const endDate = new Date(ganttEnd);
        const totalMs = endDate - startDate;
        const totalDays = totalMs / (1000 * 60 * 60 * 24);

        console.log('[Gantt] Total days:', totalDays, 'Grid width:', gridWidth);

        // Calculate pixels per day
        const pxPerDay = gridWidth / totalDays;

        // Calculate days from start based on click position
        const daysFromStart = clickX / pxPerDay;

        // Calculate the clicked date
        const clickedDate = new Date(startDate);
        clickedDate.setDate(clickedDate.getDate() + Math.floor(daysFromStart));

        console.log('[Gantt] Clicked date:', clickedDate);

        return clickedDate;
    }

    // Emit event to create new task with the given date
    emitCreateTask(date) {
        const formattedDate = this.formatDate(date);

        const event = new CustomEvent('gantt-create-task', {
            detail: {
                date: formattedDate,
            },
            bubbles: true,
        });
        document.dispatchEvent(event);
    }
}
