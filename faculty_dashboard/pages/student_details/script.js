 // ── CONFIG ── Replace with your Supabase credentials ──
const SUPABASE_URL = 'https://wetnbnemedzyzudvuihb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldG5ibmVtZWR6eXp1ZHZ1aWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjM2ODksImV4cCI6MjA3MDQ5OTY4OX0.53iKjcKaImIz10H8hJv0MkDl08R8Pu8OprDcURqSmRQ';
// ──────────────────────────────────────────────────────

const SESSION_KEY = 'faculty_session';
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (Date.now() - session.login_time > SESSION_DURATION_MS) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return session;
    } catch { return null; }
}

function goBack() { window.location.href = '../../dashboard.html'; }

function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = '../../../index.html';
}

window.addEventListener('DOMContentLoaded', () => {
    if (!getSession()) window.location.href = '../login.html';
});

document.getElementById('rollInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
});

function setLoading(on) {
    document.getElementById('loadingState').classList.toggle('show', on);
    document.getElementById('searchBtn').disabled = on;
}

function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = '⚠️ ' + (msg || 'Please enter a valid roll number.');
    el.classList.add('show');
}

function hideError() {
    document.getElementById('errorMsg').classList.remove('show');
}

async function fetchLastUpdated() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/lat_updated_june26?select=updated_at&order=id.desc&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const data = await res.json();
        if (!data[0]) return;

        const utc = new Date(data[0].updated_at);
        const ist = new Date(utc.getTime() + 5.5 * 60 * 60 * 1000);

        const day = String(ist.getUTCDate()).padStart(2, '0');
        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        const month = months[ist.getUTCMonth()];
        const year  = ist.getUTCFullYear();

        let hours = ist.getUTCHours();
        const minutes = String(ist.getUTCMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        document.getElementById('lastUpdated').textContent =
            `Last updated: ${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    } catch {
        // silently fail, default text stays
    }
}

async function handleSearch() {
    const roll = document.getElementById('rollInput').value.trim().toUpperCase();

    hideError();
    document.getElementById('resultsSection').classList.remove('show');

    if (!roll) {
        showError('Please enter a valid roll number.');
        return;
    }

    setLoading(true);

    try {
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };

        const [detailsRes, attendanceRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/june26_std_details?roll_number=eq.${encodeURIComponent(roll)}&select=*`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/june26_std_attendance?roll_number=eq.${encodeURIComponent(roll)}&select=*`, { headers })
        ]);

        if (!detailsRes.ok || !attendanceRes.ok) throw new Error('Network error');

        const details    = await detailsRes.json();
        const attendance = await attendanceRes.json();

        if (details.length === 0) {
            showError('Please enter a valid roll number.');
            return;
        }

        renderResults(details[0], attendance[0] || null);
        document.getElementById('resultsSection').classList.add('show');

    } catch (err) {
        showError('Connection error. Please try again.');
    } finally {
        setLoading(false);
    }
}

function renderResults(detail, att) {
    document.getElementById('stdName').textContent   = detail.name || '—';
    document.getElementById('stdRoll').textContent   = detail.roll_number || '—';
    document.getElementById('stdDept').textContent   = detail.department || '—';
    document.getElementById('stdCareer').textContent = detail.career_choice || '—';
    document.getElementById('stdVenue').textContent  = detail.venue || '—';

    // Role with badge
    const roleEl = document.getElementById('stdRole');
    const role = detail.role;
    if (role === 'Rep') {
        roleEl.innerHTML = `<span class="role-badge rep">Rep</span>`;
    } else if (role === 'Student') {
        roleEl.innerHTML = `<span class="role-badge">Student</span>`;
    } else {
        roleEl.textContent = role || '—';
    }

    // Attendance %
    const pctEl = document.getElementById('stdAttPct');
    if (att && att.attendance_percentage) {
        const num = parseFloat(att.attendance_percentage);
        pctEl.textContent = (num * 100).toFixed(2) + '%';
        pctEl.classList.toggle('low', !isNaN(num) && (num * 100) < 80);
    } else {
        pctEl.textContent = '-';
        pctEl.classList.remove('low');
    }

    // Session tiles
    const grid = document.getElementById('sessionGrid');
    grid.innerHTML = '';

    const rows = [
        { date: '08 Jun 2026', keys: ['s1','s2','s3'] },
        { date: '09 Jun 2026', keys: ['s4','s5','s6'] },
        { date: '10 Jun 2026', keys: ['s7','s8','s9'] },
        { date: '11 Jun 2026', keys: ['s10','s11','s12'] },
        { date: '12 Jun 2026', keys: ['s13','s14','s15'] },
    ];

    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="date-col">${row.date}</td>` +
            row.keys.map(key => {
                const val = att ? (att[key] || '-') : '-';
                if (val === 'P') return `<td><span class="badge-present">Present</span></td>`;
                if (val === 'A') return `<td><span class="badge-absent">Absent</span></td>`;
                return `<td><span class="badge-dash">—</span></td>`;
            }).join('');
        grid.appendChild(tr);
    });
    fetchLastUpdated();
    fetchDiscrepancies(detail.roll_number);
}

function openDiscrepancyModal() {
    const roll = document.getElementById('stdRoll').textContent.trim();
    if (!roll || roll === '—') {
        showError('No student loaded. Please search first.');
        return;
    }
    document.getElementById('modalRoll').value = roll;
    document.getElementById('modalDate').value = '';
    document.getElementById('modalSession').value = '';
    document.getElementById('modalRemark').value = '';
    document.getElementById('modalError').classList.remove('show');
    document.getElementById('discrepancyModal').classList.add('show');
}

function closeDiscrepancyModal() {
    document.getElementById('discrepancyModal').classList.remove('show');
}


async function submitDiscrepancy() {
    const date      = document.getElementById('modalDate').value;
    const session   = document.getElementById('modalSession').value;
    const roll      = document.getElementById('modalRoll').value.trim();
    const issue     = document.getElementById('modalRemark').value.trim();
    const errorEl   = document.getElementById('modalError');
    const submitBtn = document.getElementById('modalSubmitBtn');

    errorEl.classList.remove('show');

    if (!date || !session || !issue) {
        errorEl.textContent = '⚠️ Please fill in all fields.';
        errorEl.classList.add('show');
        return;
    }

    const sessionData = getSession();
    if (!sessionData) { window.location.href = '../login.html'; return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_irregularities`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                roll_number:    roll,
                faculty_id:     sessionData.id,
                date:           date,
                session:        session,
                issue:          issue,
            })
        });

        if (!res.ok) throw new Error('Failed to record discrepancy.');

        closeDiscrepancyModal();
        showToast('Discrepancy recorded successfully.');
        setTimeout(() => fetchDiscrepancies(roll, true), 300);

    } catch (err) {
        errorEl.textContent = '⚠️ ' + err.message;
        errorEl.classList.add('show');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatDateTime(dtStr) {
    if (!dtStr) return '—';
    const utc = new Date(dtStr);
    const ist = new Date(utc.getTime() + 5.5 * 60 * 60 * 1000);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h = ist.getUTCHours(), m = String(ist.getUTCMinutes()).padStart(2,'0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(ist.getUTCDate()).padStart(2,'0')} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}, ${h}:${m} ${ampm}`;
}

function formatStatus(status) {
    const map = {
        pending: 'Pending',
        resolved: 'Resolved',
        rejected: 'Rejected',
        clarification_requested: 'Clarification Requested'
    };
    return map[status] || status;
}

async function fetchDiscrepancies(roll, silent = false) {
    const card = document.getElementById('discrepanciesCard');
    const body = document.getElementById('discrepanciesBody');

    if (!silent) {
        card.style.display = 'none';
        body.innerHTML = '';
    }

    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/view_attendance_irregularities?roll_number=eq.${encodeURIComponent(roll)}&order=created_at.desc`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const data = await res.json();

        if (!data.length) {
            if (!silent) card.style.display = 'none';
            return;
        }

        const newRows = data.map(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(row.date)}</td>
                <td>${row.session}</td>
                <td>${row.issue || '—'}</td>
                <td><span class="badge-status ${row.current_status}">${formatStatus(row.current_status)}</span></td>
                <td>${row.remarks || '—'}</td>
                <td><button class="btn-view-details" onclick="openViewDetails(${row.id})">View Details</button></td>
            `;
            return tr;
        });

        body.innerHTML = '';
        newRows.forEach(tr => body.appendChild(tr));
        card.style.display = 'block';

    } catch { /* silently fail */ }
}


async function openViewDetails(id) {
    const body = document.getElementById('viewDetailsBody');
    body.innerHTML = '<p style="text-align:center;color:#9ca3af;font-size:0.85rem;">Loading...</p>';
    document.getElementById('viewDetailsModal').classList.add('show');

    try {
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        };

        const [irRes, logsRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/view_attendance_irregularities?id=eq.${id}`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/attendance_irregularity_logs?irregularity_id=eq.${id}&order=created_at.desc&select=*,faculty_details(name)`, { headers })
        ]);

        const irData   = await irRes.json();
        const logsData = await logsRes.json();
        const ir = irData[0];

        let logsHTML = '';
        if (logsData.length === 0) {
            logsHTML = '<p style="font-size:0.82rem;color:#9ca3af;">No log entries yet.</p>';
        } else {
            logsHTML = logsData.map(log => `
                <div class="log-entry">
                    <div class="log-entry-top">
                        <span class="badge-status ${log.status}">${formatStatus(log.status)}</span>
                        <span class="log-entry-remark">${log.remarks || '—'}</span>
                    </div>
                    <div class="log-entry-meta">${log.faculty_details?.name || '—'} &nbsp;·&nbsp; ${formatDateTime(log.created_at)}</div>
                </div>
            `).join('');
        }

        body.innerHTML = `
            <div class="detail-header-row">
                <span class="detail-meta">${ir.roll_number} &nbsp;·&nbsp; ${formatDate(ir.date)} &nbsp;·&nbsp; ${ir.session}</span>
            </div>
            <div class="detail-issue-box">
                <div style="display:flex;gap:8px;align-items:baseline;">
                    <div class="detail-label" style="flex-shrink:0;margin-bottom:0;">Issue</div>
                    <div class="detail-text">${ir.issue || '—'}</div>
                </div>
                <div class="log-entry-meta" style="margin-top:8px;">${ir.created_by || '—'} &nbsp;·&nbsp; ${formatDateTime(ir.created_at)}</div>
            </div>
            <div class="logs-title">Activity</div>
            ${logsHTML}
        `;
    } catch {
        body.innerHTML = '<p style="color:#dc2626;font-size:0.85rem;">Failed to load details.</p>';
    }
}

function closeViewDetailsModal() {
    document.getElementById('viewDetailsModal').classList.remove('show');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
