/**
 * Task Manager — app.js
 * Persists via REST API with JWT authentication.
 * localStorage stores: tm_token, tm_user, tm_dark
 */

const API      = 'https://task-manager-api-r427.onrender.com/api/tasks';
const AUTH_API = 'https://task-manager-api-r427.onrender.com/api/auth';

class TaskApp {
    constructor() {
        this.tasks     = [];
        this.filter    = 'all';
        this.activeTag = null;
        this.editId    = null;
        this.formTags  = [];
        this.dragSrcId = null;
        this.darkMode  = JSON.parse(localStorage.getItem('tm_dark') || 'false');
        this.token     = null;  // set by boot() after auth
        // Apply dark mode immediately (no token needed)
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('darkToggle').textContent = '☀️ Light Mode';
        }
    }

    /* ─── BOOT — called by auth.js after successful login ───────── */
    async boot(token) {
        this.token = token;
        setInterval(() => this.updateClock(), 1000);
        this.updateClock();

        const tagInput = document.getElementById('tagInput');
        tagInput.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
                e.preventDefault();
                this.addFormTag(tagInput.value.trim().replace(',', ''));
                tagInput.value = '';
            } else if (e.key === 'Backspace' && !tagInput.value && this.formTags.length) {
                this.formTags.pop();
                this.renderFormTags();
            }
        });

        await this.fetchTasks();
    }

    updateClock() {
        document.getElementById('dateTime').textContent = new Date().toLocaleString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short',
            day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    toggleDark() {
        this.darkMode = !this.darkMode;
        document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
        document.getElementById('darkToggle').textContent = this.darkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
        localStorage.setItem('tm_dark', JSON.stringify(this.darkMode));
    }

    logout() {
        localStorage.removeItem('tm_token');
        localStorage.removeItem('tm_user');
        window.location.href = 'auth.html';
    }

    /* ─── API HELPERS ───────────────────────────────────────────── */
    async request(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined,
            });

            // Token expired or invalid — send to login
            if (res.status === 401) {
                this.logout();
                return null;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            return res.status === 204 ? null : res.json();
        } catch (err) {
            console.error('API error:', err);
            this.showError(err.message);
            throw err;
        }
    }

    showError(msg) {
        const toast = document.createElement('div');
        toast.textContent = `⚠️ ${msg}`;
        toast.style.cssText = `
            position:fixed;bottom:20px;right:20px;z-index:9999;
            background:#e05454;color:#fff;padding:10px 18px;
            border-radius:10px;font-family:'Outfit',sans-serif;
            font-size:0.87em;font-weight:600;
            box-shadow:0 4px 16px rgba(0,0,0,0.25);`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    async fetchTasks() {
        this.tasks = await this.request(API) || [];
        this.render();
    }

    /* ─── TAG INPUT ─────────────────────────────────────────────── */
    addFormTag(tag) {
        tag = tag.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
        if (!tag || this.formTags.includes(tag)) return;
        this.formTags.push(tag);
        this.renderFormTags();
        this.renderTagSugs();
    }

    renderFormTags() {
        const wrap  = document.getElementById('tagsWrap');
        const input = document.getElementById('tagInput');
        wrap.querySelectorAll('.tag-chip').forEach(el => el.remove());
        this.formTags.forEach((tag, i) => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip rm';
            chip.innerHTML = `${tag} <span class="x" onclick="app.removeFormTag(${i})">✕</span>`;
            wrap.insertBefore(chip, input);
        });
    }

    removeFormTag(i) {
        this.formTags.splice(i, 1);
        this.renderFormTags();
    }

    renderTagSugs() {
        const existing = [...new Set(this.tasks.flatMap(t => t.tags || []))]
            .filter(t => !this.formTags.includes(t)).slice(0, 8);
        document.getElementById('tagSugs').innerHTML = existing.map(tag =>
            `<button class="tag-sug" onclick="app.addFormTag('${tag}')">${tag}</button>`
        ).join('');
    }

    /* ─── ADD TASK ──────────────────────────────────────────────── */
    async submit() {
        const title = document.getElementById('fTitle').value.trim();
        if (!title) { this.showError('Please enter a task title.'); return; }

        const payload = {
            title,
            description: document.getElementById('fDesc').value.trim(),
            category:    document.getElementById('fCat').value,
            priority:    document.getElementById('fPri').value,
            dueDate:     document.getElementById('fDate').value,
            dueTime:     document.getElementById('fTime').value,
            recurring:   document.getElementById('fRecur').value,
            tags:        [...this.formTags],
            attachments: []
        };

        const file = document.getElementById('fFile').files[0];
        const send = async (data) => {
            const created = await this.request(API, { method: 'POST', body: data });
            if (created) { this.tasks.unshift(created); this.resetForm(); this.render(); }
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                payload.attachments.push({ name: file.name, type: file.type, size: file.size, data: e.target.result });
                await send(payload);
            };
            reader.readAsDataURL(file);
        } else {
            await send(payload);
        }
    }

    resetForm() {
        ['fTitle','fDesc','fDate','fTime'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('fCat').value   = 'Professional';
        document.getElementById('fPri').value   = 'Medium';
        document.getElementById('fRecur').value = 'none';
        document.getElementById('fFile').value  = '';
        this.formTags = [];
        this.renderFormTags();
        this.renderTagSugs();
    }

    cancelEdit() {
        this.editId = null;
        document.getElementById('formTitle').textContent   = '+ New Task';
        document.getElementById('submitBtn').textContent   = 'Add Task';
        document.getElementById('cancelBtn').style.display = 'none';
        this.resetForm();
    }

    /* ─── DELETE / TOGGLE ───────────────────────────────────────── */
    async deleteTask(id) {
        if (!confirm('Delete this task?')) return;
        await this.request(`${API}/${id}`, { method: 'DELETE' });
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.render();
    }

    async toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        const updated = await this.request(`${API}/${id}`, {
            method: 'PATCH', body: { completed: !task.completed }
        });
        if (!updated) return;
        if (!task.completed && updated.completed && updated.recurring !== 'none') {
            await this.spawnRecurring(updated);
        }
        Object.assign(task, updated);
        this.render();
    }

    async spawnRecurring(task) {
        if (!task.dueDate) return;
        const next = new Date(task.dueDate + 'T00:00:00');
        const daysMap = { daily:1, weekly:7, biweekly:14, monthly:30 };
        next.setDate(next.getDate() + (daysMap[task.recurring] || 7));
        const payload = {
            title: task.title, description: task.description, category: task.category,
            priority: task.priority, dueDate: next.toISOString().split('T')[0],
            dueTime: task.dueTime, recurring: task.recurring,
            tags: task.tags, attachments: task.attachments,
        };
        const created = await this.request(API, { method: 'POST', body: payload });
        if (created) { created._spawned = true; this.tasks.unshift(created); }
    }

    /* ─── EDIT MODAL ────────────────────────────────────────────── */
    openEdit(id) {
        const t = this.tasks.find(x => x.id === id);
        if (!t) return;
        this.editId = id;
        document.getElementById('eTitle').value = t.title;
        document.getElementById('eDesc').value  = t.description || '';
        document.getElementById('eCat').value   = t.category;
        document.getElementById('ePri').value   = t.priority;
        document.getElementById('eDate').value  = t.dueDate || '';
        document.getElementById('eTime').value  = t.dueTime || '';
        document.getElementById('eRecur').value = t.recurring || 'none';
        document.getElementById('eTags').value  = (t.tags || []).join(', ');
        document.getElementById('editModal').classList.add('open');
    }

    closeModal() {
        document.getElementById('editModal').classList.remove('open');
        this.editId = null;
    }

    async saveEdit() {
        const t = this.tasks.find(x => x.id === this.editId);
        if (!t) return;
        const title = document.getElementById('eTitle').value.trim();
        if (!title) { this.showError('Title is required.'); return; }
        const payload = {
            title, description: document.getElementById('eDesc').value.trim(),
            category: document.getElementById('eCat').value,
            priority: document.getElementById('ePri').value,
            dueDate:  document.getElementById('eDate').value,
            dueTime:  document.getElementById('eTime').value,
            recurring: document.getElementById('eRecur').value,
            tags: document.getElementById('eTags').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean),
            completed: t.completed, subtasks: t.subtasks, attachments: t.attachments,
        };
        const updated = await this.request(`${API}/${this.editId}`, { method: 'PUT', body: payload });
        if (updated) { Object.assign(t, updated); this.closeModal(); this.render(); }
    }

    /* ─── SUBTASKS ──────────────────────────────────────────────── */
    async addSubtask(taskId) {
        const input = document.getElementById(`si-${taskId}`);
        const text  = input ? input.value.trim() : '';
        if (!text) return;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        task.subtasks = task.subtasks || [];
        task.subtasks.push({ id: Date.now(), text, done: false });
        input.value = '';
        await this.request(`${API}/${taskId}`, { method: 'PATCH', body: { subtasks: task.subtasks } });
        this.render();
        setTimeout(() => { const p = document.getElementById(`sp-${taskId}`); if (p) p.style.display='block'; }, 10);
    }

    async toggleSubtask(taskId, subId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        const sub = task.subtasks.find(s => s.id === subId);
        if (sub) sub.done = !sub.done;
        await this.request(`${API}/${taskId}`, { method: 'PATCH', body: { subtasks: task.subtasks } });
        this.render();
        setTimeout(() => { const p = document.getElementById(`sp-${taskId}`); if (p) p.style.display='block'; }, 10);
    }

    async deleteSubtask(taskId, subId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        task.subtasks = task.subtasks.filter(s => s.id !== subId);
        await this.request(`${API}/${taskId}`, { method: 'PATCH', body: { subtasks: task.subtasks } });
        this.render();
        setTimeout(() => { const p = document.getElementById(`sp-${taskId}`); if (p) p.style.display='block'; }, 10);
    }

    togglePanel(taskId, btn) {
        const panel = document.getElementById(`sp-${taskId}`);
        if (!panel) return;
        const showing = panel.style.display === 'block';
        panel.style.display   = showing ? 'none' : 'block';
        btn.style.background  = showing ? '' : 'var(--accent)';
        btn.style.color       = showing ? '' : '#fff';
        btn.style.borderColor = showing ? '' : 'var(--accent)';
    }

    /* ─── DRAG AND DROP ─────────────────────────────────────────── */
    async commitReorder() {
        const orderedIds = this.tasks.map(t => t.id);
        await this.request(`${API}/reorder/bulk`, { method: 'PATCH', body: { orderedIds } });
    }

    /* ─── FILTERING ─────────────────────────────────────────────── */
    setFilter(f, el) {
        this.filter    = f;
        this.activeTag = null;
        document.querySelectorAll('.fp').forEach(p => p.classList.remove('active'));
        el.classList.add('active');
        this.render();
    }

    setTagFilter(tag) {
        this.activeTag = this.activeTag === tag ? null : tag;
        this.render();
    }

    isOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        return new Date(task.dueDate + 'T00:00:00') < today;
    }

    getFiltered() {
        const q    = document.getElementById('searchInput').value.toLowerCase().trim();
        let   list = [...this.tasks];
        if (q) list = list.filter(t =>
            t.title.toLowerCase().includes(q) ||
            (t.description||'').toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            (t.tags||[]).some(tag => tag.includes(q))
        );
        if (this.activeTag) list = list.filter(t => (t.tags||[]).includes(this.activeTag));
        switch (this.filter) {
            case 'active':    return list.filter(t => !t.completed);
            case 'completed': return list.filter(t => t.completed);
            case 'critical':  return list.filter(t => t.priority === 'Critical');
            case 'overdue':   return list.filter(t => this.isOverdue(t));
            case 'recurring': return list.filter(t => t.recurring && t.recurring !== 'none');
            default:          return list;
        }
    }

    /* ─── RENDER ────────────────────────────────────────────────── */
    updateStats() {
        const all  = this.tasks;
        const done = all.filter(t => t.completed).length;
        const pct  = all.length ? Math.round((done/all.length)*100) : 0;
        document.getElementById('sTotal').textContent  = all.length;
        document.getElementById('sActive').textContent = all.filter(t=>!t.completed).length;
        document.getElementById('sDone').textContent   = done;
        document.getElementById('sCrit').textContent   = all.filter(t=>t.priority==='Critical').length;
        document.getElementById('sOver').textContent   = all.filter(t=>this.isOverdue(t)).length;
        document.getElementById('sRecur').textContent  = all.filter(t=>t.recurring&&t.recurring!=='none').length;
        document.getElementById('progressPct').textContent  = `${pct}%`;
        document.getElementById('progressFill').style.width = `${pct}%`;
    }

    renderTagFilters() {
        const allTags   = [...new Set(this.tasks.flatMap(t => t.tags||[]))];
        const container = document.getElementById('tagFilters');
        if (!allTags.length) { container.innerHTML=''; return; }
        container.innerHTML = `<span class="tag-filter-label">Tags:</span>` +
            allTags.map(tag =>
                `<span class="tag-chip tag-filter-chip ${this.activeTag===tag?'active':''}"
                    onclick="app.setTagFilter('${tag}')">${tag}</span>`
            ).join('');
    }

    render() {
        const list     = document.getElementById('taskList');
        const filtered = this.getFiltered();
        list.innerHTML = '';
        document.getElementById('emptyState').style.display = filtered.length ? 'none' : 'block';
        const recurLabel = { daily:'Daily', weekly:'Weekly', biweekly:'Biweekly', monthly:'Monthly' };

        filtered.forEach(task => {
            const subs    = task.subtasks || [];
            const subDone = subs.filter(s=>s.done).length;
            const subPct  = subs.length ? Math.round((subDone/subs.length)*100) : null;
            const overdue = this.isOverdue(task);
            const dueStr  = task.dueDate
                ? new Date(task.dueDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
                : null;

            const card = document.createElement('div');
            card.className = `task-card priority-${task.priority.toLowerCase()} ${task.completed?'completed':''} ${task._spawned?'spawned':''}`;
            card.dataset.id = task.id;
            card.draggable  = true;
            if (task._spawned) delete task._spawned;

            card.innerHTML = `
                <div class="task-row">
                    <span class="drag-handle" title="Drag to reorder">⠿</span>
                    <input type="checkbox" class="task-cb" ${task.completed?'checked':''}
                        onchange="app.toggleTask(${task.id})" onclick="event.stopPropagation()">
                    <div class="task-body">
                        <div class="task-title">${this.esc(task.title)}</div>
                        <div class="task-badges">
                            <span class="badge b-${task.priority.toLowerCase()}">${task.priority}</span>
                            <span class="badge b-cat">${task.category}</span>
                            ${task.recurring&&task.recurring!=='none'?`<span class="badge b-recur">🔄 ${recurLabel[task.recurring]}</span>`:''}
                            ${overdue?`<span class="badge b-overdue">⏰ Overdue</span>`:''}
                            ${(task.tags||[]).map(tag=>`<span class="tag-chip" style="font-size:0.7em;">${tag}</span>`).join('')}
                        </div>
                        <div class="task-meta">
                            ${dueStr?`<span>📅 ${dueStr}</span>`:''}
                            ${task.attachments&&task.attachments.length?`<span>📎 ${task.attachments.length} file(s)</span>`:''}
                            <span>📁 ${task.category}</span>
                        </div>
                        ${subs.length?`
                            <div class="sub-progress">
                                <div class="sub-progress-label">${subDone}/${subs.length} subtasks · ${subPct}%</div>
                                <div class="sub-track"><div class="sub-fill" style="width:${subPct}%"></div></div>
                            </div>`:''}
                    </div>
                    <div class="task-actions">
                        <button class="btn-icon" title="Edit" onclick="event.stopPropagation();app.openEdit(${task.id})">✏️</button>
                        <button class="btn-icon" title="Subtasks" onclick="event.stopPropagation();app.togglePanel(${task.id},this)" id="spbtn-${task.id}">☑</button>
                        <button class="btn-icon del" title="Delete" onclick="event.stopPropagation();app.deleteTask(${task.id})">🗑</button>
                    </div>
                </div>
                <div class="subtasks-panel" id="sp-${task.id}">
                    <div class="sub-input-row">
                        <input type="text" id="si-${task.id}" placeholder="Add subtask..."
                            onkeydown="if(event.key==='Enter')app.addSubtask(${task.id})">
                        <button class="sub-add-btn" onclick="app.addSubtask(${task.id})">+ Add</button>
                    </div>
                    ${subs.map(sub=>`
                        <div class="sub-item">
                            <input type="checkbox" ${sub.done?'checked':''} onchange="app.toggleSubtask(${task.id},${sub.id})">
                            <span class="sub-text ${sub.done?'done':''}">${this.esc(sub.text)}</span>
                            <button class="sub-del" onclick="app.deleteSubtask(${task.id},${sub.id})">✕</button>
                        </div>`).join('')}
                </div>`;

            card.addEventListener('dragstart', e => {
                this.dragSrcId = task.id;
                requestAnimationFrame(() => card.classList.add('dragging'));
                e.dataTransfer.effectAllowed = 'move';
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            card.addEventListener('dragover', e => {
                e.preventDefault();
                document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
                card.classList.add('drag-over');
            });
            card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                if (this.dragSrcId == null || this.dragSrcId === task.id) return;
                const srcIdx = this.tasks.findIndex(t => t.id === this.dragSrcId);
                const dstIdx = this.tasks.findIndex(t => t.id === task.id);
                if (srcIdx === -1 || dstIdx === -1) return;
                const [moved] = this.tasks.splice(srcIdx, 1);
                this.tasks.splice(dstIdx, 0, moved);
                this.dragSrcId = null;
                this.render();
                await this.commitReorder();
            });

            list.appendChild(card);
        });

        this.updateStats();
        this.renderTagFilters();
        this.renderTagSugs();
    }

    /* ─── CLEAR ALL ─────────────────────────────────────────────── */
    async clearAll() {
        if (!confirm('Delete ALL tasks? This cannot be undone.')) return;
        await this.request(API, { method: 'DELETE' });
        this.tasks = [];
        this.render();
    }

    /* ─── UTILS ─────────────────────────────────────────────────── */
    esc(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
}

const app = new TaskApp();
document.getElementById('editModal').addEventListener('click', e => {
    if (e.target.id === 'editModal') app.closeModal();
});
