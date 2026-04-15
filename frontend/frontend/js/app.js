/**
 * Task Manager — app.js
 * Persists via REST API with JWT authentication.
 */

const API = 'https://task-manager-api-r427.onrender.com/api/tasks';

class TaskApp {
    constructor() {
        this.tasks        = [];
        this.filter       = 'all';
        this.activeTag    = null;
        this.editId       = null;
        this.detailTaskId = null;
        this.formTags     = [];
        this.dragSrcId    = null;
        this.darkMode     = JSON.parse(localStorage.getItem('tm_dark') || 'false');
        this.token        = null;
    }

    /* ─── BOOT ──────────────────────────────────────────────────── */
    async boot(token) {
        this.token = token;
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            const btn = document.getElementById('darkToggle');
            if (btn) btn.textContent = '☀️ Light Mode';
        }
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        const tagInput = document.getElementById('tagInput');
        if (tagInput) {
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
        }
        await this.fetchTasks();
    }

    updateClock() {
        const el = document.getElementById('dateTime');
        if (el) el.textContent = new Date().toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    toggleDark() {
        this.darkMode = !this.darkMode;
        document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
        const btn = document.getElementById('darkToggle');
        if (btn) btn.textContent = this.darkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
        localStorage.setItem('tm_dark', JSON.stringify(this.darkMode));
    }

    /* ─── API HELPERS ───────────────────────────────────────────── */
    async request(url, options = {}) {
        try {
            const res = await fetch(url, {
                ...options,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: options.body ? JSON.stringify(options.body) : undefined,
            });
            if (res.status === 401) { authUI.logout(); return null; }
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
        toast.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:9999;background:#e05454;color:#fff;padding:10px 18px;border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.87em;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.25);`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    async fetchTasks() {
        try { this.tasks = await this.request(API) || []; this.render(); }
        catch(e) { this.render(); }
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
        const wrap = document.getElementById('tagsWrap');
        const input = document.getElementById('tagInput');
        if (!wrap || !input) return;
        wrap.querySelectorAll('.tag-chip').forEach(el => el.remove());
        this.formTags.forEach((tag, i) => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip rm';
            chip.innerHTML = `${tag} <span class="x" onclick="app.removeFormTag(${i})">✕</span>`;
            wrap.insertBefore(chip, input);
        });
    }

    removeFormTag(i) { this.formTags.splice(i, 1); this.renderFormTags(); }

    renderTagSugs() {
        const el = document.getElementById('tagSugs');
        if (!el) return;
        const existing = [...new Set(this.tasks.flatMap(t => t.tags || []))]
            .filter(t => !this.formTags.includes(t)).slice(0, 8);
        el.innerHTML = existing.map(tag =>
            `<button class="tag-sug" onclick="app.addFormTag('${tag}')">${tag}</button>`
        ).join('');
    }

    /* ─── ADD TASK ──────────────────────────────────────────────── */
    async submit() {
        const title = document.getElementById('fTitle').value.trim();
        if (!title) { this.showError('Please enter a task title.'); return; }
        const payload = {
            title, description: document.getElementById('fDesc').value.trim(),
            category: document.getElementById('fCat').value,
            priority: document.getElementById('fPri').value,
            dueDate:  document.getElementById('fDate').value,
            dueTime:  document.getElementById('fTime').value,
            recurring: document.getElementById('fRecur').value,
            tags: [...this.formTags], attachments: []
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
        } else { await send(payload); }
    }

    resetForm() {
        ['fTitle','fDesc','fDate','fTime'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
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
        const updated = await this.request(`${API}/${id}`, { method: 'PATCH', body: { completed: !task.completed } });
        if (!updated) return;
        if (!task.completed && updated.completed && updated.recurring !== 'none') await this.spawnRecurring(updated);
        Object.assign(task, updated);
        this.render();
    }

    async spawnRecurring(task) {
        if (!task.dueDate) return;
        const next = new Date(task.dueDate + 'T00:00:00');
        const daysMap = { daily:1, weekly:7, biweekly:14, monthly:30 };
        next.setDate(next.getDate() + (daysMap[task.recurring] || 7));
        const payload = { title: task.title, description: task.description, category: task.category,
            priority: task.priority, dueDate: next.toISOString().split('T')[0], dueTime: task.dueTime,
            recurring: task.recurring, tags: task.tags, attachments: task.attachments };
        const created = await this.request(API, { method: 'POST', body: payload });
        if (created) { created._spawned = true; this.tasks.unshift(created); }
    }

    /* ─── TASK DETAILS MODAL ────────────────────────────────────── */
    showDetails(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        this.detailTaskId = id;

        const recurLabel = { none:'None', daily:'Daily', weekly:'Weekly', biweekly:'Every 2 Weeks', monthly:'Monthly' };
        const dueStr = task.dueDate
            ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
            : 'No due date';
        const dueTime = task.dueTime ? ` at ${task.dueTime}` : '';
        const subs    = task.subtasks || [];
        const subDone = subs.filter(s => s.done).length;
        const tags    = (task.tags || []).map(t => `<span class="tag-chip" style="font-size:0.75em;">${t}</span>`).join(' ') || 'None';
        const status  = task.completed
            ? `<span class="badge b-low">✅ Completed</span>`
            : `<span class="badge b-medium">✏️ Active</span>`;
        const priority = `<span class="badge b-${task.priority.toLowerCase()}">${task.priority}</span>`;

        document.getElementById('detailsBody').innerHTML = `
            <div class="detail-row"><div class="detail-key">Title</div><div class="detail-val"><strong>${this.esc(task.title)}</strong></div></div>
            <div class="detail-row"><div class="detail-key">Description</div><div class="detail-val">${this.esc(task.description || 'No description provided')}</div></div>
            <div class="detail-row"><div class="detail-key">Category</div><div class="detail-val"><span class="badge b-cat">${task.category}</span></div></div>
            <div class="detail-row"><div class="detail-key">Priority</div><div class="detail-val">${priority}</div></div>
            <div class="detail-row"><div class="detail-key">Status</div><div class="detail-val">${status}</div></div>
            <div class="detail-row"><div class="detail-key">Due Date</div><div class="detail-val">${dueStr}${dueTime}</div></div>
            <div class="detail-row"><div class="detail-key">Recurring</div><div class="detail-val">${recurLabel[task.recurring] || 'None'}</div></div>
            <div class="detail-row"><div class="detail-key">Tags</div><div class="detail-val">${tags}</div></div>
            <div class="detail-row"><div class="detail-key">Subtasks</div><div class="detail-val">${subs.length ? `${subDone} of ${subs.length} completed` : 'None'}</div></div>
            ${subs.length ? `<div class="detail-row"><div class="detail-key"></div><div class="detail-val">${subs.map(s => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="font-size:1em;">${s.done ? '✅' : '⬜'}</span><span style="${s.done ? 'text-decoration:line-through;color:var(--text3)' : ''}">${this.esc(s.text)}</span></div>`).join('')}</div></div>` : ''}
            <div class="detail-row"><div class="detail-key">Attachments</div><div class="detail-val">${task.attachments && task.attachments.length ? task.attachments.map(a => `📎 ${this.esc(a.name)}`).join('<br>') : 'None'}</div></div>
            <div class="detail-row"><div class="detail-key">Created</div><div class="detail-val">${task.createdAt || 'Unknown'}</div></div>
        `;

        document.getElementById('detailsModal').classList.add('open');
    }

    closeDetailsModal() {
        document.getElementById('detailsModal').classList.remove('open');
        this.detailTaskId = null;
    }

    downloadTaskPDF() {
        const task = this.tasks.find(t => t.id === this.detailTaskId);
        if (!task) return;
        const dueStr = task.dueDate
            ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
            : 'No due date';
        const subs = task.subtasks || [];

        const el = document.createElement('div');
        el.style.padding = '20px';
        el.innerHTML = `
            <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;">
                <h2 style="color:#6c5ce7;border-bottom:3px solid #6c5ce7;padding-bottom:10px;margin-bottom:20px;">📋 Task Details</h2>
                <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;width:140px;vertical-align:top;">TITLE</td><td style="padding:8px 0;font-size:14px;">${this.esc(task.title)}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">DESCRIPTION</td><td style="padding:8px 0;font-size:14px;">${this.esc(task.description || 'No description')}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">CATEGORY</td><td style="padding:8px 0;font-size:14px;">${this.esc(task.category)}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">PRIORITY</td><td style="padding:8px 0;font-size:14px;font-weight:bold;">${this.esc(task.priority)}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">STATUS</td><td style="padding:8px 0;font-size:14px;">${task.completed ? '✅ Completed' : '✏️ Active'}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">DUE DATE</td><td style="padding:8px 0;font-size:14px;">${dueStr}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">RECURRING</td><td style="padding:8px 0;font-size:14px;">${task.recurring || 'None'}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">TAGS</td><td style="padding:8px 0;font-size:14px;">${(task.tags || []).join(', ') || 'None'}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">SUBTASKS</td><td style="padding:8px 0;font-size:14px;">${subs.length ? subs.map(s => `${s.done ? '✅' : '⬜'} ${this.esc(s.text)}`).join('<br>') : 'None'}</td></tr>
                    <tr><td style="padding:8px 0;font-weight:700;font-size:13px;color:#888;vertical-align:top;">CREATED</td><td style="padding:8px 0;font-size:14px;">${task.createdAt || 'Unknown'}</td></tr>
                </table>
                <hr style="margin-top:30px;border:none;border-top:2px solid #e0e0e0;">
                <p style="font-size:11px;color:#999;margin-top:12px;">Generated on ${new Date().toLocaleString()}</p>
            </div>`;

        html2pdf().set({
            margin: 12,
            filename: `task-${task.id}-${task.title.replace(/\s+/g,'-').toLowerCase()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        }).from(el).save();
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
        panel.style.display = showing ? 'none' : 'block';
        btn.style.background  = showing ? '' : 'var(--accent)';
        btn.style.color       = showing ? '' : '#fff';
        btn.style.borderColor = showing ? '' : 'var(--accent)';
    }

    async commitReorder() {
        const orderedIds = this.tasks.map(t => t.id);
        await this.request(`${API}/reorder/bulk`, { method: 'PATCH', body: { orderedIds } });
    }

    /* ─── FILTERING ─────────────────────────────────────────────── */
    setFilter(f, el) {
        this.filter    = f;
        this.activeTag = null;
        document.querySelectorAll('.fp').forEach(p => p.classList.remove('active'));
        if (el) el.classList.add('active');
        // Sync stat items highlight
        document.querySelectorAll('.stat-clickable').forEach(s => s.classList.remove('active-stat'));
        this.render();
    }

    setStatFilter(f) {
        this.filter    = f;
        this.activeTag = null;
        // Highlight the clicked stat
        document.querySelectorAll('.stat-clickable').forEach(s => s.classList.remove('active-stat'));
        const statMap = { all: 0, active: 1, completed: 2, critical: 3, overdue: 4, recurring: 5 };
        const items = document.querySelectorAll('.stat-clickable');
        if (items[statMap[f]] !== undefined) items[statMap[f]].classList.add('active-stat');
        // Sync filter pills
        document.querySelectorAll('.fp').forEach(p => p.classList.remove('active'));
        const pill = document.querySelector(`.fp[data-filter="${f}"]`);
        if (pill) pill.classList.add('active');
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
        const q    = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
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
        const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('sTotal',  all.length);
        set('sActive', all.filter(t=>!t.completed).length);
        set('sDone',   done);
        set('sCrit',   all.filter(t=>t.priority==='Critical').length);
        set('sOver',   all.filter(t=>this.isOverdue(t)).length);
        set('sRecur',  all.filter(t=>t.recurring&&t.recurring!=='none').length);
        set('progressPct', `${pct}%`);
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.width = `${pct}%`;
    }

    renderTagFilters() {
        const allTags   = [...new Set(this.tasks.flatMap(t => t.tags||[]))];
        const container = document.getElementById('tagFilters');
        if (!container) return;
        if (!allTags.length) { container.innerHTML = ''; return; }
        container.innerHTML = `<span class="tag-filter-label">Tags:</span>` +
            allTags.map(tag =>
                `<span class="tag-chip tag-filter-chip ${this.activeTag===tag?'active':''}"
                    onclick="app.setTagFilter('${tag}')">${tag}</span>`
            ).join('');
    }

    render() {
        const list     = document.getElementById('taskList');
        const filtered = this.getFiltered();
        if (!list) return;
        list.innerHTML = '';
        const empty = document.getElementById('emptyState');
        if (empty) empty.style.display = filtered.length ? 'none' : 'block';

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
            card.style.cursor = 'pointer';
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
                            <span style="color:var(--accent);font-size:0.72em;">Click to view details</span>
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

            // Click card to show details
            card.addEventListener('click', () => this.showDetails(task.id));

            // Drag and Drop
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

    async clearAll() {
        if (!confirm('Delete ALL tasks? This cannot be undone.')) return;
        await this.request(API, { method: 'DELETE' });
        this.tasks = [];
        this.render();
    }

    esc(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
}

/* ─── Bootstrap ─────────────────────────────────────────────────── */
const app = new TaskApp();

document.addEventListener('DOMContentLoaded', () => {
    const editModal    = document.getElementById('editModal');
    const detailsModal = document.getElementById('detailsModal');
    if (editModal)    editModal.addEventListener('click',    e => { if (e.target.id === 'editModal')    app.closeModal(); });
    if (detailsModal) detailsModal.addEventListener('click', e => { if (e.target.id === 'detailsModal') app.closeDetailsModal(); });
});
