import { useLanguage } from "../../../context/LanguageContext";

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    rangeStart,
    rangeEnd,
    hasNext,
    hasPrev,
    onNext,
    onPrev,
    onGoTo,
    pageSize,
    onPageSize,
    pageSizeOptions = [10, 25, 50],
}) {
    const { t } = useLanguage();
    if (totalItems === 0) return null;

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        pages.push(1);
        if (currentPage > 3) pages.push("...");
        for (
            let i = Math.max(2, currentPage - 1);
            i <= Math.min(totalPages - 1, currentPage + 1);
            i++
        ) {
            pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    const btnBase = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "34px",
        height: "34px",
        padding: "0 8px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        color: "var(--text-sub)",
        transition: "all 0.15s",
        fontFamily: "inherit",
    };

   const activeBtn = {
  ...btnBase,
  background: "var(--color-primary)",
  color: "var(--text-on-dark)",
  border: "1px solid var(--color-primary)",
  fontWeight: 600,
  cursor: "default",
};

    const disabledBtn = {
        ...btnBase,
        opacity: 0.4,
        cursor: "not-allowed",
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-card)",
                fontSize: "13px",
                color: "var(--text-sub)",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span>
                    {t("showing")} <strong style={{ color: "var(--text-main)" }}>{rangeStart}–{rangeEnd}</strong> {t("of")}{" "}
                    <strong style={{ color: "var(--text-main)" }}>{totalItems}</strong>
                </span>

                {onPageSize && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSize(Number(e.target.value))}
                        style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            fontSize: "12px",
                            color: "var(--text-sub)",
                            background: "var(--bg-card)",
                            cursor: "pointer",
                            outline: "none",
                        }}
                    >
                        {pageSizeOptions.map((s) => (
                            <option key={s} value={s}>{s} {t("per_page")}</option>
                        ))}
                    </select>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                    style={hasPrev ? btnBase : disabledBtn}
                    onClick={hasPrev ? onPrev : undefined}
                    disabled={!hasPrev}
                    title="Previous page"
                >
                    ←
                </button>

                {getPageNumbers().map((page, idx) =>
                    page === "..." ? (
                        <span
                            key={`ellipsis-${idx}`}
                            style={{ padding: "0 4px", color: "var(--icon-muted)", userSelect: "none" }}
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={page}
                            style={page === currentPage ? activeBtn : btnBase}
                            onClick={() => page !== currentPage && onGoTo(page)}
                            onMouseEnter={(e) => {
                                if (page !== currentPage)
                                    e.currentTarget.style.background = "var(--hover-bg)";
                            }}
                            onMouseLeave={(e) => {
                                if (page !== currentPage)
                                    e.currentTarget.style.background = "var(--bg-card)";
                            }}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    style={hasNext ? btnBase : disabledBtn}
                    onClick={hasNext ? onNext : undefined}
                    disabled={!hasNext}
                    title="Next page"
                >
                    →
                </button>
            </div>
        </div>
    );
}