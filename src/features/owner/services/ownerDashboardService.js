import { api } from "../../../api/axios";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

// helper: يبني query string موحّد
function buildQuery(placeId, dateFrom, dateTo) {
  const params = new URLSearchParams({ place_id: placeId });

  if (dateFrom) params.append("date_from", dateFrom.slice(0, 10));
  if (dateTo)   params.append("date_to",   dateTo.slice(0, 10));

  return params.toString();
}

export const getOwnerDashboard = async (placeId, dateFrom, dateTo) => {
  const res = await api.get(
    `/owner/dashboard?${buildQuery(placeId, dateFrom, dateTo)}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const getAnalytics = async (placeId, dateFrom, dateTo) => {
  const res = await api.get(
    `/owner/analytics?${buildQuery(placeId, dateFrom, dateTo)}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const getActiveVisitors = async (placeId, dateFrom, dateTo) => {
  const res = await api.get(
    `/owner/active-visitors?${buildQuery(placeId, dateFrom, dateTo)}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const getAnomaliesSummary = async (placeId, dateFrom, dateTo) => {
  const res = await api.get(
    `/owner/anomalies/summary?${buildQuery(placeId, dateFrom, dateTo)}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const getOpportunities = async (placeId, dateFrom, dateTo) => {
  const res = await api.get(
    `/owner/opportunities?${buildQuery(placeId, dateFrom, dateTo)}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const getChatbotStats = async (placeId, dateFrom, dateTo) => {
  const res = await api.get(
    `/owner/chatbot-stats?${buildQuery(placeId, dateFrom, dateTo)}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

// Visitor Location Heatmap
export const getLocationHeatmap = async (
  placeId,
  dateFrom,
  dateTo
) => {
  const res = await api.get(
    `/owner/location-heatmap?${buildQuery(
      placeId,
      dateFrom,
      dateTo
    )}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const getTopItems = async (placeId, limit = 3) => {
  const res = await api.get(
    `/owner/orders/place/${placeId}/top-items?limit=${limit}`,
    { headers: authHeader() }
  );
  return res.data;
};