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
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    // لو الفلترة خلّت الصفحة الحالية تعدّت الـ total، ارجع للأولى
    const safePage = Math.min(currentPage, totalPages);

    const paginated = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, safePage, pageSize]);

    const goTo     = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    const next     = () => goTo(safePage + 1);
    const prev     = () => goTo(safePage - 1);
    const reset    = () => setCurrentPage(1);

    return {
        paginated,
        currentPage: safePage,
        totalPages,
        pageSize,
        totalItems: items.length,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
        goTo,
        next,
        prev,
        reset,
        // range helper: "Showing 1–10 of 100"
        rangeStart: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
        rangeEnd:   Math.min(safePage * pageSize, items.length),
    };
}

export default usePagination;