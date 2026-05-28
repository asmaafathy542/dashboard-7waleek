import { useState, useMemo } from "react";

/**
 * usePagination
 * بياخد array كاملة ويرجع الـ slice الخاصة بالصفحة الحالية
 * + helpers للتنقل بين الصفحات
 *
 * @param {Array}  items     - الداتا الكاملة (بعد أي فلترة)
 * @param {number} pageSize  - عدد العناصر في كل صفحة (default 10)
 */
export function usePagination(items = [], pageSize = 10) {
    const safeItems = Array.isArray(items) ? items : [];
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(safeItems.length / pageSize));

    const safePage = Math.min(currentPage, totalPages);

    const paginated = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return safeItems.slice(start, start + pageSize);
    }, [safeItems, safePage, pageSize]);

    const goTo     = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    const next     = () => goTo(safePage + 1);
    const prev     = () => goTo(safePage - 1);
    const reset    = () => setCurrentPage(1);

    return {
        paginated,
        currentPage: safePage,
        totalPages,
        pageSize,
        totalItems: safeItems.length,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
        goTo,
        next,
        prev,
        reset,
        rangeStart: safeItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
        rangeEnd:   Math.min(safePage * pageSize, safeItems.length),
    };
}

export default usePagination;