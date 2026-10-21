// Account Action Functions
function showTransactionHistory() {
    const modal = document.getElementById('transactionHistoryModal');
    if (!modal) {
        console.error('Transaction history modal not found');
        return;
    }

    // Load transactions
    loadTransactionHistory();
    modal.style.display = 'flex';
}

function onHistoryFilterChange() {
    const filter = document.getElementById('historyDateRangeFilter')?.value;
    const customDiv = document.getElementById('historyCustomDates');
    if (customDiv) customDiv.style.display = filter === 'custom' ? 'flex' : 'none';
    loadTransactionHistory();
}

function getHistoryDateRange(filterType, startId, endId) {
    let start = null;
    let end = filterType === 'all' ? null : new Date();

    const startOfDay = (d) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    };

    if (filterType === 'today') {
        start = startOfDay(end);
    } else if (filterType === 'yesterday') {
        const y = new Date(end);
        y.setDate(y.getDate() - 1);
        start = startOfDay(y);
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    } else if (filterType === 'week') {
        start = startOfDay(end);
        start.setDate(start.getDate() - start.getDay());
    } else if (filterType === 'last_week') {
        start = startOfDay(end);
        start.setDate(start.getDate() - start.getDay() - 7);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    } else if (filterType === 'month') {
        start = startOfDay(end);
        start.setDate(1);
    } else if (filterType === 'year') {
        start = startOfDay(end);
        start.setMonth(0, 1);
    } else if (filterType === 'custom') {
        const s = document.getElementById(startId)?.value;
        const e = document.getElementById(endId)?.value;
        if (s) start = new Date(s + 'T00:00:00');
        if (e) end = new Date(e + 'T23:59:59.999');
    }
    return { start, end };
}

// Pagination + filter state for the transaction history modal
let txHistoryPage = 1;
let txHistoryPageSize = 10;
let txHistoryTotal = 0;
let txHistoryType = 'all';

const TX_TYPE_META = {
    deposit: { label: 'Deposit', icon: 'fa-arrow-down', className: 'deposit' },
    withdraw: { label: 'Withdrawal', icon: 'fa-arrow-up', className: 'withdraw' },
    game_win: { label: 'Game Win', icon: 'fa-trophy', className: 'game-win' },
    game_bet: { label: 'Game Bet', icon: 'fa-gamepad', className: 'game-bet' },
    bonus: { label: 'Bonus', icon: 'fa-gift', className: 'bonus' }
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getTransactionTypeMeta(type) {
    return TX_TYPE_META[type] || {
        label: (type || 'Other').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        icon: 'fa-exchange-alt',
        className: 'other'
    };
}

function setTransactionTypeFilter(type) {
    txHistoryType = type || 'all';

    document.querySelectorAll('#historyTypeFilters .tx-filter-chip').forEach(chip => {
        const isActive = chip.dataset.txType === txHistoryType;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    loadTransactionHistory(1);
}

function clearTransactionFilters() {
    txHistoryType = 'all';

    document.querySelectorAll('#historyTypeFilters .tx-filter-chip').forEach(chip => {
        const isActive = chip.dataset.txType === 'all';
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    const dateFilter = document.getElementById('historyDateRangeFilter');
    if (dateFilter) dateFilter.value = 'all';

    const customDates = document.getElementById('historyCustomDates');
    if (customDates) customDates.style.display = 'none';

    loadTransactionHistory(1);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

async function loadTransactionHistory(page = 1) {
    const tbody = document.getElementById('transactionHistoryBody');
    if (!tbody) return;

    txHistoryPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = txHistoryPageSize;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="tx-empty">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>Loading transactions...</span>
            </td>
        </tr>
    `;

    try {
        const dateFilter = document.getElementById('historyDateRangeFilter')?.value || 'today';
        const { start, end } = getHistoryDateRange(dateFilter, 'historyFilterStartDate', 'historyFilterEndDate');

        let query = supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('user_id', simpleAuth.currentUser.id);

        if (txHistoryType === 'game') {
            query = query.in('type', ['game_bet', 'game_win']);
        } else if (txHistoryType !== 'all') {
            query = query.eq('type', txHistoryType);
        }

        if (start) query = query.gte('created_at', start.toISOString());
        if (end) query = query.lte('created_at', end.toISOString());

        const from = (txHistoryPage - 1) * pageSize;
        const { data: transactions, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);

        if (error) throw error;

        txHistoryTotal = count || (transactions ? transactions.length : 0);

        renderTxHistoryPagination();

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="tx-empty">
                        <i class="fas fa-receipt"></i>
                        <span>No transactions found</span>
                        <small>Try a different type or date range.</small>
                    </td>
                </tr>
            `;
            return;
        }

        const currency = window.siteCurrency || '৳';

        tbody.innerHTML = transactions.map(tx => {
            const created = new Date(tx.created_at);
            const isValidDate = !isNaN(created.getTime());
            const dateText = isValidDate
                ? created.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : '-';
            const timeText = isValidDate
                ? created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                : '';

            const meta = getTransactionTypeMeta(tx.type);
            const isIncoming = ['deposit', 'bonus', 'game_win'].includes(tx.type);
            const amount = Number(tx.amount || 0);
            const formattedAmount = amount.toLocaleString(undefined, {
                minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
                maximumFractionDigits: 2
            });

            const status = String(tx.status || 'completed').toLowerCase();
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            const statusClass = ['completed', 'pending', 'rejected', 'failed'].includes(status) ? status : 'default';

            return `
                <tr>
                    <td class="tx-date-cell">
                        <span class="tx-date-main">${escapeHtml(dateText)}</span>
                        <span class="tx-date-time">${escapeHtml(timeText)}</span>
                    </td>
                    <td>
                        <span class="tx-type-badge ${meta.className}">
                            <i class="fas ${meta.icon}"></i>${escapeHtml(meta.label)}
                        </span>
                    </td>
                    <td class="tx-desc-cell">${escapeHtml(tx.description || '-')}</td>
                    <td class="tx-amount-col">
                        <span class="tx-amount ${isIncoming ? 'positive' : 'negative'}">
                            ${isIncoming ? '+' : '-'}${currency}${formattedAmount}
                        </span>
                    </td>
                    <td>
                        <span class="tx-status ${statusClass}">
                            <span class="tx-status-dot"></span>${escapeHtml(statusLabel)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading transactions:', error);
        txHistoryTotal = 0;
        renderTxHistoryPagination();
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="tx-empty tx-empty-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Could not load transactions</span>
                    <small>Please try again.</small>
                </td>
            </tr>
        `;
    }
}

function renderTxHistoryPagination() {
    const container = document.getElementById('transactionPagination');
    if (!container) return;

    if (!txHistoryTotal || txHistoryTotal <= 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    renderPaginationBar(container, {
        total: txHistoryTotal,
        page: txHistoryPage,
        pageSize: txHistoryPageSize,
        pageSizes: [5, 10, 25],
        allowCustom: false,
        onPage: (p) => loadTransactionHistory(p),
        onPageSize: (size) => {
            txHistoryPageSize = size;
            loadTransactionHistory(1);
        }
    });
}

function showEditProfile() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) {
        console.error('Edit profile modal not found');
        return;
    }

    // Pre-fill current data
    if (simpleAuth.currentUser) {
        document.getElementById('editProfileUsername').value = simpleAuth.currentUser.username || '';
        document.getElementById('editProfileMobile').value = simpleAuth.currentUser.mobile || '';
        document.getElementById('editProfileEmail').value = simpleAuth.currentUser.email || '';
    }

    modal.style.display = 'flex';
}

async function saveProfile(e) {
    e.preventDefault();

    const username = document.getElementById('editProfileUsername').value;
    const mobile = document.getElementById('editProfileMobile').value;
    const email = document.getElementById('editProfileEmail').value;

    if (!username || !mobile) {
        alert('Username and mobile are required');
        return;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                username: username,
                mobile: mobile,
                email: email
            })
            .eq('id', simpleAuth.currentUser.id);

        if (error) throw error;

        // Update local user data
        simpleAuth.currentUser.username = username;
        simpleAuth.currentUser.mobile = mobile;
        simpleAuth.currentUser.email = email;
        localStorage.setItem('casino_user', JSON.stringify(simpleAuth.currentUser));

        alert('Profile updated successfully!');
        document.getElementById('editProfileModal').style.display = 'none';
        simpleAuth.updateAccountInfo();

    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile: ' + error.message);
    }
}

function showChangePassword() {
    const modal = document.getElementById('changePasswordModal');
    if (!modal) {
        console.error('Change password modal not found');
        return;
    }

    // Clear form
    document.getElementById('changePasswordForm').reset();
    modal.style.display = 'flex';
}

async function changePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('All fields are required');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        // Verify current password
        const { data: user } = await supabase
            .from('profiles')
            .select('password')
            .eq('id', simpleAuth.currentUser.id)
            .single();

        const storedPassword = String(user?.password || '');
        const hashedCurrentPassword = await simpleAuth.hashPassword(currentPassword);

        if (storedPassword !== currentPassword && storedPassword !== hashedCurrentPassword) {
            alert('Current password is incorrect');
            return;
        }

        // Update password
        const hashedNewPassword = await simpleAuth.hashPassword(newPassword);
        const { error } = await supabase
            .from('profiles')
            .update({ password: hashedNewPassword })
            .eq('id', simpleAuth.currentUser.id);

        if (error) throw error;

        alert('Password changed successfully!');
        document.getElementById('changePasswordModal').style.display = 'none';
        document.getElementById('changePasswordForm').reset();

    } catch (error) {
        console.error('Error changing password:', error);
        alert('Failed to change password: ' + error.message);
    }
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        simpleAuth.logout();
    }
}

// Close modals when clicking outside or on close button
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
    if (e.target.classList.contains('close')) {
        e.target.closest('.modal').style.display = 'none';
    }
});

// Setup form submit handlers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', saveProfile);
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', changePassword);
    }
});
