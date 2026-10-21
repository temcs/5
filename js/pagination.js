/**
 * Reusable Modern Pagination Bar
 * Works on both the admin panel and the user site.
 *
 * Usage:
 *   renderPaginationBar(containerEl, {
 *       total: 1234,          // total number of rows
 *       page: 1,              // current page (1-based)
 *       pageSize: 50,         // rows per page
 *       pageSizes: [50,100,200], // preset options (a "Custom" option is added automatically)
 *       onPage: (page) => {},       // called when a page button is clicked
 *       onPageSize: (size) => {}    // called when rows-per-page changes
 *   });
 */
(function () {
    const DEFAULT_SIZES = [50, 100, 200];

    function buildPageList(current, totalPages) {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }
        pages.push(1);
        let start = Math.max(2, current - 1);
        let end = Math.min(totalPages - 1, current + 1);
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
        return pages;
    }

    function renderPaginationBar(container, opts) {
        if (!container) return;
        opts = opts || {};

        const allowCustom = opts.allowCustom !== false;

        const pageSizes = (opts.pageSizes && opts.pageSizes.length ? opts.pageSizes : DEFAULT_SIZES)
            .filter(s => s > 0)
            .sort((a, b) => a - b);

        const total = Math.max(0, parseInt(opts.total, 10) || 0);
        const pageSize = Math.max(1, parseInt(opts.pageSize, 10) || pageSizes[0]);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, parseInt(opts.page, 10) || 1), totalPages);

        const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
        const end = Math.min(page * pageSize, total);

        const isCustom = allowCustom && pageSizes.indexOf(pageSize) === -1;

        const sizeOptions = pageSizes
            .map(s => `<option value="${s}"${s === pageSize ? ' selected' : ''}>${s}</option>`)
            .join('') +
            (allowCustom ? `<option value="custom"${isCustom ? ' selected' : ''}>Custom</option>` : '');

        const pageButtons = buildPageList(page, totalPages).map(p => {
            if (p === '...') return '<span class="pg-ellipsis">…</span>';
            return `<button type="button" class="pg-btn${p === page ? ' active' : ''}" data-page="${p}">${p}</button>`;
        }).join('');

        container.innerHTML = `
            <div class="pg-info">
                ${total === 0
                    ? '<span class="pg-empty">No results</span>'
                    : `Showing <b>${start}</b>–<b>${end}</b> of <b>${total}</b>`}
            </div>
            <div class="pg-right">
                <div class="pg-size">
                    <label>Rows:</label>
                    <select class="pg-size-select">${sizeOptions}</select>
                    ${allowCustom ? `<input type="number" class="pg-size-custom" min="1" max="5000" value="${pageSize}"
                        style="display: ${isCustom ? 'inline-block' : 'none'};" />` : ''}
                </div>
                <div class="pg-controls">
                    <button type="button" class="pg-btn" data-page="1" ${page <= 1 ? 'disabled' : ''} title="First">«</button>
                    <button type="button" class="pg-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} title="Previous">‹</button>
                    ${pageButtons}
                    <button type="button" class="pg-btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} title="Next">›</button>
                    <button type="button" class="pg-btn" data-page="${totalPages}" ${page >= totalPages ? 'disabled' : ''} title="Last">»</button>
                </div>
            </div>
        `;

        // Page navigation
        container.querySelectorAll('.pg-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                const target = parseInt(btn.dataset.page, 10);
                if (!target || target < 1 || target > totalPages || target === page) return;
                if (typeof opts.onPage === 'function') opts.onPage(target);
            });
        });

        // Rows-per-page selector
        const select = container.querySelector('.pg-size-select');
        const customInput = container.querySelector('.pg-size-custom');

        select.addEventListener('change', () => {
            if (select.value === 'custom' && customInput) {
                customInput.style.display = 'inline-block';
                customInput.focus();
                return;
            }
            const size = parseInt(select.value, 10);
            if (typeof opts.onPageSize === 'function') opts.onPageSize(size);
        });

        if (customInput) {
            customInput.addEventListener('change', () => {
                let size = parseInt(customInput.value, 10);
                if (isNaN(size) || size < 1) size = pageSizes[0];
                if (size > 5000) size = 5000;
                customInput.value = size;
                if (typeof opts.onPageSize === 'function') opts.onPageSize(size);
            });

            customInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    customInput.blur();
                }
            });
        }
    }

    window.renderPaginationBar = renderPaginationBar;
})();
