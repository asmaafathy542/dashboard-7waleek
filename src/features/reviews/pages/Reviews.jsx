import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReviews, getAllReviews, deleteReview, getPropertyReviews } from "../services/reviewsService";
import { getMyProperties } from "../../properties/services/propertiesServices";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import "./reviews.css";

function StarRating({ rating }) {
  return (
    <div className="rv-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "star filled" : "star"}>★</span>
      ))}
    </div>
  );
}

const sentimentBadge = {
  positive: { label: "Positive", style: { background: "#dcfce7", color: "#15803d" } },
  negative: { label: "Negative", style: { background: "#fee2e2", color: "#b91c1c" } },
  neutral:  { label: "Neutral",  style: { background: "#f1f5f9", color: "#64748b" } },
};

// ── RESIDENTIAL Reviews ───────────────────────────────────────────────────────
function ResidentialReviews() {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [pageSize, setPageSize]           = useState(10);

  const { data: properties = [], isLoading: propsLoading } = useQuery({
    queryKey: ["properties"],
    queryFn:  getMyProperties,
    staleTime: 1000 * 60 * 5,
  });

  const reviewQueries = useQuery({
    queryKey: ["residential-all-reviews", properties.map((p) => p.id)],
    queryFn: async () => {
      if (properties.length === 0) return { items: [], total: 0 };
      const results = await Promise.all(
        properties.map((p) =>
          getPropertyReviews(p.id).then((data) =>
            (data.items ?? []).map((r) => ({
              ...r,
              property_title: p.title,
              property_id:    p.id,
            }))
          ).catch(() => [])
        )
      );
      const items = results.flat();
      return { items, total: items.length };
    },
    enabled: properties.length > 0,
    staleTime: 1000 * 60 * 3,
  });

  const reviews = reviewQueries.data?.items ?? [];
  const total   = reviewQueries.data?.total  ?? 0;
  const loading = propsLoading || reviewQueries.isLoading;

  const pagination = usePagination(reviews, pageSize);
  const { paginated, reset: resetPage } = pagination;

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteReview(confirmDelete.id);
      queryClient.setQueryData(
        ["residential-all-reviews", properties.map((p) => p.id)],
        (old) => ({
          items: (old?.items ?? []).filter((r) => r.id !== confirmDelete.id),
          total: (old?.total ?? 1) - 1,
        })
      );
      setConfirmDelete(null);
    } catch (err) {
      alert(err?.response?.data?.error?.message || "Failed to delete, please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const computedSentiment = {
    positive: reviews.filter((r) => r.sentiment === "positive").length,
    negative: reviews.filter((r) => r.sentiment === "negative").length,
    neutral:  reviews.filter((r) => r.sentiment === "neutral").length,
  };

  if (loading) return <div className="rv-loading">Loading...</div>;

  return (
    <div className="rv-page">
      <div className="rv-header">
        <div>
          <h1 className="rv-title">Reviews</h1>
          <p className="rv-subtitle">{total} review{total !== 1 ? "s" : ""} total</p>
        </div>
      </div>

      <div className="rv-sentiment-row">
        <div className="rv-sentiment-card rv-sentiment-positive">
          <div className="rv-sentiment-num">{computedSentiment.positive}</div>
          <div className="rv-sentiment-label">😊 Positive</div>
        </div>
        <div className="rv-sentiment-card rv-sentiment-negative">
          <div className="rv-sentiment-num">{computedSentiment.negative}</div>
          <div className="rv-sentiment-label">😞 Negative</div>
        </div>
        <div className="rv-sentiment-card rv-sentiment-neutral">
          <div className="rv-sentiment-num">{computedSentiment.neutral}</div>
          <div className="rv-sentiment-label">😐 Neutral</div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rv-empty">
          <div className="rv-empty-icon">⭐</div>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>No reviews yet.</p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>Once someone leaves a review on your listings, it will appear here.</p>
        </div>
      ) : (
        <div className="rv-list">
          {paginated.map((review, index) => (
            <div className="rv-card" key={review.id ?? index}>
              <div className="rv-card-header">
                <div className="rv-avatar">
                  {review.user_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <div className="rv-user">{review.user_name || "Anonymous"}</div>
                  <div className="rv-date">
                    {new Date(review.created_at ?? review.date).toLocaleDateString()}
                  </div>
                  {review.property_title && (
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      🏠 {review.property_title}
                    </div>
                  )}
                </div>
                <div className="rv-rating-wrap">
                  <StarRating rating={review.rating ?? review.stars} />
                  <span className="rv-rating-num">{review.rating ?? review.stars}/5</span>
                </div>
                {review.sentiment && sentimentBadge[review.sentiment] && (
                  <span style={{
                    fontSize: "11px", fontWeight: 500, padding: "2px 10px",
                    borderRadius: "20px", marginLeft: "auto",
                    ...sentimentBadge[review.sentiment].style,
                  }}>
                    {sentimentBadge[review.sentiment].label}
                  </span>
                )}
                <button className="or-delete-btn" onClick={() => setConfirmDelete(review)} title="Delete review">
                  🗑
                </button>
              </div>
              {review.comment && <p className="rv-comment">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <Pagination
          {...pagination}
          pageSize={pageSize}
          onPageSize={(s) => { setPageSize(s); resetPage(); }}
          onNext={pagination.next}
          onPrev={pagination.prev}
          onGoTo={pagination.goTo}
        />
      )}

      {confirmDelete && (
        <div className="or-modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="or-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this review?</h3>
            <p>By: {confirmDelete.user_name || "Anonymous"}</p>
            <p>This action cannot be undone.</p>
            <div className="or-confirm-actions">
              <button className="or-confirm-cancel" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button className="or-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Reviews (COMMERCIAL) ─────────────────────────────────────────────────
export default function Reviews() {
  const context = useOutletContext() ?? {};
  const { selectedPlaceId, allBranches: places } = context;
  const queryClient = useQueryClient();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isResidential = user?.owner_type === "RESIDENTIAL";

  const [allBranches,   setAllBranches]   = useState(false);
  const [pageSize,      setPageSize]      = useState(10);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const placeMap = {};
  (places ?? []).forEach((p) => { placeMap[p.id] = p.name; });

  const { data, isLoading: loading } = useQuery({
    queryKey: ["reviews", selectedPlaceId, allBranches],
    queryFn:  () => allBranches ? getAllReviews() : getReviews(selectedPlaceId),
    enabled:  !!selectedPlaceId && !isResidential,
    staleTime: 1000 * 60 * 3,
    select: (data) => ({ items: data.items ?? [], total: data.total ?? 0 }),
  });

  const reviews = data?.items ?? [];
  const total   = data?.total  ?? 0;

  const pagination = usePagination(reviews, pageSize);
  const { paginated, reset: resetPage } = pagination;
  useMemo(() => { resetPage(); }, [allBranches, reviews.length]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteReview(confirmDelete.id);
      queryClient.setQueryData(["reviews", selectedPlaceId, allBranches], (old) => ({
        items: (old?.items ?? []).filter((r) => r.id !== confirmDelete.id),
        total: (old?.total ?? 1) - 1,
      }));
      setConfirmDelete(null);
    } catch (err) {
      alert(err?.response?.data?.error?.message || "Failed to delete, please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (isResidential) return <ResidentialReviews />;

  if (!selectedPlaceId) return <div className="rv-loading">Loading branch...</div>;
  if (loading)          return <div className="rv-loading">Loading...</div>;

  const computedSentiment = {
    positive: reviews.filter((r) => r.sentiment === "positive").length,
    negative: reviews.filter((r) => r.sentiment === "negative").length,
    neutral:  reviews.filter((r) => r.sentiment === "neutral").length,
  };

  return (
    <div className="rv-page">
      <div className="rv-header">
        <div>
          <h1 className="rv-title">Reviews</h1>
          <p className="rv-subtitle">{total} review{total !== 1 ? "s" : ""} total</p>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setAllBranches((v) => !v)}
          style={{
            padding: "6px 16px", borderRadius: "20px", border: "1.5px solid",
            cursor: "pointer", fontWeight: 500, fontSize: "13px", transition: "all 0.2s",
            background: allBranches ? "#1e293b" : "#fff",
            color: allBranches ? "#fff" : "#1e293b",
            borderColor: "#1e293b",
          }}
        >
          {allBranches ? "📍 All Branches" : "🏠 This Branch"}
        </button>
      </div>

      <div className="rv-sentiment-row">
        <div className="rv-sentiment-card rv-sentiment-positive">
          <div className="rv-sentiment-num">{computedSentiment.positive}</div>
          <div className="rv-sentiment-label">😊 Positive</div>
        </div>
        <div className="rv-sentiment-card rv-sentiment-negative">
          <div className="rv-sentiment-num">{computedSentiment.negative}</div>
          <div className="rv-sentiment-label">😞 Negative</div>
        </div>
        <div className="rv-sentiment-card rv-sentiment-neutral">
          <div className="rv-sentiment-num">{computedSentiment.neutral}</div>
          <div className="rv-sentiment-label">😐 Neutral</div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rv-empty">
          <div className="rv-empty-icon">⭐</div>
          <p>No reviews yet.</p>
        </div>
      ) : (
        <div className="rv-list">
          {paginated.map((review, index) => (
            <div className="rv-card" key={review.id ?? index}>
              <div className="rv-card-header">
                <div className="rv-avatar">
                  {review.user_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <div className="rv-user">{review.user_name || "Anonymous"}</div>
                  <div className="rv-date">
                    {new Date(review.created_at ?? review.date).toLocaleDateString()}
                  </div>
                  {allBranches && review.place_id && (
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      📍 {placeMap[review.place_id] ?? `Branch #${review.place_id}`}
                    </div>
                  )}
                </div>
                <div className="rv-rating-wrap">
                  <StarRating rating={review.rating ?? review.stars} />
                  <span className="rv-rating-num">{review.rating ?? review.stars}/5</span>
                </div>
                {review.sentiment && sentimentBadge[review.sentiment] && (
                  <span style={{
                    fontSize: "11px", fontWeight: 500, padding: "2px 10px",
                    borderRadius: "20px", marginLeft: "auto",
                    ...sentimentBadge[review.sentiment].style,
                  }}>
                    {sentimentBadge[review.sentiment].label}
                  </span>
                )}
                <button className="or-delete-btn" onClick={() => setConfirmDelete(review)} title="Delete review">
                  🗑
                </button>
              </div>
              {review.comment && <p className="rv-comment">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <Pagination
          {...pagination}
          pageSize={pageSize}
          onPageSize={(s) => { setPageSize(s); resetPage(); }}
          onNext={pagination.next}
          onPrev={pagination.prev}
          onGoTo={pagination.goTo}
        />
      )}

      {confirmDelete && (
        <div className="or-modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="or-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this review?</h3>
            <p>By: {confirmDelete.user_name || "Anonymous"}</p>
            <p>This action cannot be undone.</p>
            <div className="or-confirm-actions">
              <button className="or-confirm-cancel" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button className="or-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}