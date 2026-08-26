const calculateQuotationTotals = () => {
  const subtotal = items.reduce((total, item) => {
    const qty = Number(item.quantity || item.qty || 0);
    const rate = Number(item.rate || item.price || 0);

    return total + (qty * rate);
  }, 0);

  const discountPercent = Number(formData.discount_percent || 0);
  const freight = Number(formData.freight || 0);
  const gstPercent = Number(formData.gst_percent || 18);

  // Calculate discount from subtotal
  const discountAmount = subtotal * discountPercent / 100;

  // IMPORTANT: subtract discount before GST
  const taxableAmount = subtotal - discountAmount + freight;

  // GST is calculated on discounted taxable amount
  const gstAmount = taxableAmount * gstPercent / 100;

  // Final total
  const grandTotal = taxableAmount + gstAmount;

  setFormData(prev => ({
    ...prev,
    subtotal: subtotal.toFixed(2),
    discount_amount: discountAmount.toFixed(2),
    taxable_amount: taxableAmount.toFixed(2),
    gst_amount: gstAmount.toFixed(2),
    grand_total: grandTotal.toFixed(2)
  }));
};
