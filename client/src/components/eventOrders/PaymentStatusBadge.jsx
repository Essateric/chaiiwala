// PaymentStatusBadge.jsx
export default function PaymentStatusBadge({ status }) {
  if (status === "paid") {
    return (
      <span style={{
        background: "#22c55e",
        color: "#fff",
        borderRadius: 8,
        padding: "2px 8px",
        fontSize: 12
      }}>Paid</span>
    );
  }
  return (
    <span style={{
      background: "#f59e42",
      color: "#fff",
      borderRadius: 8,
      padding: "2px 8px",
      fontSize: 12
    }}>Unpaid</span>
  );
}
