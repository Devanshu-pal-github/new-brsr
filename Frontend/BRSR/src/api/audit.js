import axios from "axios";

export async function fetchAuditedState({ question_id, company_id, token }) {
  try {
    const response = await axios.get(`/dynamic-audit/audited/${question_id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { company_id },
    });
    return response.data;
  } catch (err) {
    console.error("[AUDIT] Failed to fetch audited state", err);
    throw err;
  }
}
