import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import { fetchProductTypes, fetchMaterials } from '../utils/supabase';
import { createOrder } from '../utils/api';

const UNITS           = ['Pieces', 'Kgs'];
const PAYMENT_OPTIONS = ['Pending', 'Paid', 'Partial', 'After 30 days'];

function Field({ label, required, children, error }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// Empty product item for the form
const EMPTY_PRODUCT = {
  product_type: '',
  material:     '',
  quantity:     '',
  unit:         'Pieces',
  unit_cost:    '',
  sale_cost:    '',
  cgst:         '',
  sgst:         '',
  description:  '',
};

// Empty form state
const EMPTY_FORM = {
  customer_name:     '',
  phone:             '',
  email:             '',
  payment_status:    'Pending',
  delivery_timeline: null,
};

export default function NewOrderPage() {
  const navigate = useNavigate();

  const [skus,      setSkus]      = useState([]);
  const [materials, setMaterials] = useState([]);
  const [skuLoading,  setSkuLoading]  = useState(true);
  const [matLoading,  setMatLoading]  = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [products,  setProducts]  = useState([EMPTY_PRODUCT]); // Array of products
  const [errors,    setErrors]    = useState({});

  useEffect(() => {
    // top_sku view → skus column
    fetchProductTypes()
      .then(setSkus)
      .catch(() => toast.error('Failed to load product types'))
      .finally(() => setSkuLoading(false));

    // material_spilt view → material_type column
    fetchMaterials()
      .then(setMaterials)
      .catch(() => toast.error('Failed to load materials'))
      .finally(() => setMatLoading(false));
  }, []);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const setProduct = (index, key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setProducts((prev) => {
      const newProducts = [...prev];
      const current = { ...newProducts[index], [key]: value };
      
      // Auto-calculate sale_cost when unit_cost or quantity changes
      if (key === 'unit_cost' || key === 'quantity') {
        // Get the current values (after the update)
        const unitCost = parseFloat(current.unit_cost) || 0;
        const qty = parseFloat(current.quantity) || 0;
        current.sale_cost = (unitCost * qty).toFixed(2);
      }
      
      // Auto-calculate CGST and SGST (9% each) when sale_cost changes
      if (key === 'sale_cost' || key === 'unit_cost' || key === 'quantity') {
        const saleCost = parseFloat(current.sale_cost) || 0;
        current.cgst = (saleCost * 0.09).toFixed(2);
        current.sgst = (saleCost * 0.09).toFixed(2);
      }
      
      newProducts[index] = current;
      return newProducts;
    });
  };

  const addProduct = () => {
    setProducts((prev) => [...prev, { ...EMPTY_PRODUCT }]);
  };

  const removeProduct = (index) => {
    if (products.length === 1) {
      toast.error('At least one product is required');
      return;
    }
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const clearError = (key) =>
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });

  // Calculate total cost from all products (including taxes)
  const totalCost = products.reduce((sum, p) => {
    const saleCost = parseFloat(p.sale_cost) || 0;
    const cgst = parseFloat(p.cgst) || 0;
    const sgst = parseFloat(p.sgst) || 0;
    return sum + saleCost + cgst + sgst;
  }, 0);

  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim()) errs.customer_name = 'Customer name is required';
    if (!form.phone.trim())         errs.phone         = 'Phone number is required';
    if (!form.email.trim())         errs.email         = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.delivery_timeline)    errs.delivery_timeline = 'Select a delivery date';

  // Validate each product
  products.forEach((p, idx) => {
    // For product_type, check if it's a valid selection or a custom value
    if (!p.product_type || p.product_type === 'custom_other') {
      errs[`product_${idx}_product_type`] = 'Select a product type or enter custom value';
    }
    // For material, check if it's a valid selection or a custom value
    if (!p.material || p.material === 'custom_other') {
      errs[`product_${idx}_material`] = 'Select a material or enter custom value';
    }
    if (!p.quantity || isNaN(p.quantity) || Number(p.quantity) <= 0)
      errs[`product_${idx}_quantity`] = 'Enter a valid quantity';
    // sale_cost is auto-calculated, but validate it exists
    if (!p.sale_cost || isNaN(p.sale_cost) || Number(p.sale_cost) < 0)
      errs[`product_${idx}_sale_cost`] = 'Enter a valid sale cost';
  });

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        delivery_timeline: form.delivery_timeline?.toISOString().split('T')[0],
        status:            'Order Received',
        products:          products.map(p => ({
          product_type: p.product_type,
          material:     p.material,
          quantity:     Number(p.quantity),
          unit:         p.unit || 'Pieces',
          unit_cost:    Number(p.unit_cost) || 0,
          sale_cost:    Number(p.sale_cost),
          cgst:         Number(p.cgst) || 0,
          sgst:         Number(p.sgst) || 0,
          description:  p.description || '',
        })),
      };
      const result = await createOrder(payload);
      toast.success('Order created successfully!');
      navigate(`/orders/${result.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')} style={{ padding: '6px 8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 className="page-title">New Order</h1>
              <p className="page-subtitle">Fill in all details — status is automatically set to Order Received</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={handleSubmit} noValidate>

          {/* ── Section 1: Customer ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">
                <span style={{ color: 'var(--brand-teal)', marginRight: 8 }}>①</span>
                Customer Information
              </span>
            </div>
            <div className="card-body">
                    <div className="form-grid-3">
                <Field label="Customer Name" required error={errors.customer_name}>
                  <input
                    className={`form-control${errors.customer_name ? ' error' : ''}`}
                    placeholder="e.g. Rahul Sharma"
                    value={form.customer_name}
                    onChange={(e) => { set('customer_name')(e); clearError('customer_name'); }}
                  />
                </Field>

                <Field label="Phone Number" required error={errors.phone}>
                  <input
                    className={`form-control${errors.phone ? ' error' : ''}`}
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => { set('phone')(e); clearError('phone'); }}
                    type="tel"
                  />
                </Field>

                <Field label="Email Address" required error={errors.email}>
                  <input
                    className={`form-control${errors.email ? ' error' : ''}`}
                    placeholder="customer@example.com"
                    value={form.email}
                    onChange={(e) => { set('email')(e); clearError('email'); }}
                    type="email"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Section 2: Products ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">
                <span style={{ color: 'var(--brand-teal)', marginRight: 8 }}>②</span>
                Products
              </span>
            </div>
            <div className="card-body">
              {products.map((product, index) => (
                <div key={index} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  marginBottom: index < products.length - 1 ? 16 : 0,
                  background: 'var(--neutral-50)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-700)' }}>
                      Product #{index + 1}
                    </span>
                    {products.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeProduct(index)}
                        title="Remove product"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    {/* Product Type — with manual option */}
                    <Field label="Product Type" required error={errors[`product_${index}_product_type`]}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          className={`form-control${errors[`product_${index}_product_type`] ? ' error' : ''}`}
                          value={skus.includes(product.product_type) ? product.product_type : 'custom_other'}
                          onChange={(e) => {
                            if (e.target.value === 'custom_other') {
                              setProduct(index, 'product_type')('');
                            } else {
                              setProduct(index, 'product_type')(e);
                            }
                            clearError(`product_${index}_product_type`);
                          }}
                          disabled={skuLoading}
                          style={{ flex: 1 }}
                        >
                          <option value="">{skuLoading ? 'Loading…' : 'Select product type…'}</option>
                          {skus.map((s) => <option key={s} value={s}>{s}</option>)}
                          <option value="custom_other">-- Type Custom --</option>
                        </select>
                        <input
                          className={`form-control${errors[`product_${index}_product_type`] ? ' error' : ''}`}
                          placeholder="Type custom product type..."
                          value={product.product_type}
                          onChange={(e) => { setProduct(index, 'product_type')(e); clearError(`product_${index}_product_type`); }}
                          style={{ flex: 1, display: !skus.includes(product.product_type) ? 'block' : 'none' }}
                        />
                      </div>
                    </Field>

                    {/* Material — with manual option */}
                    <Field label="Material" required error={errors[`product_${index}_material`]}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          className={`form-control${errors[`product_${index}_material`] ? ' error' : ''}`}
                          value={materials.includes(product.material) ? product.material : 'custom_other'}
                          onChange={(e) => {
                            if (e.target.value === 'custom_other') {
                              setProduct(index, 'material')('');
                            } else {
                              setProduct(index, 'material')(e);
                            }
                            clearError(`product_${index}_material`);
                          }}
                          disabled={matLoading}
                          style={{ flex: 1 }}
                        >
                          <option value="">{matLoading ? 'Loading…' : 'Select material…'}</option>
                          {materials.map((m) => <option key={m} value={m}>{m}</option>)}
                          <option value="custom_other">-- Type Custom --</option>
                        </select>
                        <input
                          className={`form-control${errors[`product_${index}_material`] ? ' error' : ''}`}
                          placeholder="Type custom material..."
                          value={product.material}
                          onChange={(e) => { setProduct(index, 'material')(e); clearError(`product_${index}_material`); }}
                          style={{ flex: 1, display: !materials.includes(product.material) ? 'block' : 'none' }}
                        />
                      </div>
                    </Field>

                    {/* Unit Cost (auto-calculates sale cost) */}
                    <Field label="Unit Cost (₹)" error={errors[`product_${index}_unit_cost`]}>
                      <div className="input-group">
                        <span
                          style={{
                            display: 'flex', alignItems: 'center',
                            padding: '0 12px',
                            background: 'var(--neutral-100)',
                            border: '1.5px solid var(--neutral-200)',
                            borderRight: 'none',
                            borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                            fontSize: 13, color: 'var(--neutral-600)', fontWeight: 600,
                          }}
                        >₹</span>
                        <input
                          className={`form-control${errors[`product_${index}_unit_cost`] ? ' error' : ''}`}
                          style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', borderLeft: 'none' }}
                          placeholder="0.00"
                          value={product.unit_cost}
                          onChange={(e) => { setProduct(index, 'unit_cost')(e); clearError(`product_${index}_unit_cost`); }}
                          type="number"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </Field>

                    {/* Quantity + Unit */}
                    <Field label="Quantity" required error={errors[`product_${index}_quantity`]}>
                      <div className="input-group">
                        <input
                          className={`form-control${errors[`product_${index}_quantity`] ? ' error' : ''}`}
                          placeholder="0"
                          value={product.quantity}
                          onChange={(e) => { setProduct(index, 'quantity')(e); clearError(`product_${index}_quantity`); }}
                          type="number"
                          min="0"
                          step="any"
                        />
                        <select
                          style={{
                            border: '1.5px solid var(--neutral-200)',
                            borderLeft: 'none',
                            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                            padding: '0 12px',
                            background: 'var(--neutral-100)',
                            fontSize: 13,
                            color: 'var(--neutral-600)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            outline: 'none',
                            minWidth: 80,
                          }}
                          value={product.unit}
                          onChange={setProduct(index, 'unit')}
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </Field>

                    {/* Sale Cost (auto-calculated) */}
                    <Field label="Sale Cost (₹)" required error={errors[`product_${index}_sale_cost`]}>
                      <div className="input-group">
                        <span
                          style={{
                            display: 'flex', alignItems: 'center',
                            padding: '0 12px',
                            background: 'var(--neutral-100)',
                            border: '1.5px solid var(--neutral-200)',
                            borderRight: 'none',
                            borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                            fontSize: 13, color: 'var(--neutral-600)', fontWeight: 600,
                          }}
                        >₹</span>
                        <input
                          className={`form-control${errors[`product_${index}_sale_cost`] ? ' error' : ''}`}
                          style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', borderLeft: 'none' }}
                          placeholder="0.00"
                          value={product.sale_cost}
                          onChange={(e) => { setProduct(index, 'sale_cost')(e); clearError(`product_${index}_sale_cost`); }}
                          type="number"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </Field>

                    {/* CGST (9% - auto-calculated) */}
                    <Field label="CGST (9%)">
                      <div className="input-group">
                        <span
                          style={{
                            display: 'flex', alignItems: 'center',
                            padding: '0 12px',
                            background: 'var(--neutral-100)',
                            border: '1.5px solid var(--neutral-200)',
                            borderRight: 'none',
                            borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                            fontSize: 13, color: 'var(--neutral-600)', fontWeight: 600,
                          }}
                        >₹</span>
                        <input
                          className="form-control"
                          style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', borderLeft: 'none', background: 'var(--neutral-50)' }}
                          value={product.cgst ? parseFloat(product.cgst).toFixed(2) : '0.00'}
                          readOnly
                          type="number"
                        />
                      </div>
                    </Field>

                    {/* SGST (9% - auto-calculated) */}
                    <Field label="SGST (9%)">
                      <div className="input-group">
                        <span
                          style={{
                            display: 'flex', alignItems: 'center',
                            padding: '0 12px',
                            background: 'var(--neutral-100)',
                            border: '1.5px solid var(--neutral-200)',
                            borderRight: 'none',
                            borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                            fontSize: 13, color: 'var(--neutral-600)', fontWeight: 600,
                          }}
                        >₹</span>
                        <input
                          className="form-control"
                          style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', borderLeft: 'none', background: 'var(--neutral-50)' }}
                          value={product.sgst ? parseFloat(product.sgst).toFixed(2) : '0.00'}
                          readOnly
                          type="number"
                        />
                      </div>
                    </Field>

                    {/* Description (optional) */}
                    <Field label="Description (Optional)">
                      <input
                        className="form-control"
                        placeholder="Add notes or specifications (optional)"
                        value={product.description}
                        onChange={(e) => setProduct(index, 'description')(e)}
                      />
                    </Field>
                  </div>
                </div>
              ))}

              {/* Add Product Button */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addProduct}
                style={{ width: '100%', marginTop: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Another Product
              </button>

              {/* Total Cost Display */}
              <div style={{
                marginTop: 20,
                padding: '16px 20px',
                background: 'var(--brand-teal-light)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(0,185,142,.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--brand-teal-dark)' }}>
                  Total Cost
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-teal)' }}>
                  ₹{totalCost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Order Settings ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">
                <span style={{ color: 'var(--brand-teal)', marginRight: 8 }}>③</span>
                Order Settings
              </span>
            </div>
            <div className="card-body">
              <div className="form-grid">
                {/* Payment Status */}
                <Field label="Payment Status" required>
                  <select
                    className="form-control"
                    value={form.payment_status}
                    onChange={set('payment_status')}
                  >
                    {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>

                {/* Delivery Timeline */}
                <Field label="Delivery Timeline" required error={errors.delivery_timeline}>
                  <DatePicker
                    selected={form.delivery_timeline}
                    onChange={(date) => {
                      setForm((f) => ({ ...f, delivery_timeline: date }));
                      clearError('delivery_timeline');
                    }}
                    minDate={new Date()}
                    dateFormat="dd MMM yyyy"
                    placeholderText="Select delivery date"
                    className={`form-control${errors.delivery_timeline ? ' error' : ''}`}
                    popperPlacement="bottom-start"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </Field>
              </div>

              {/* Auto-status notice */}
              <div style={{
                marginTop: 20,
                padding: '12px 16px',
                background: 'var(--brand-teal-light)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(0,185,142,.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'var(--brand-teal-dark)',
                fontWeight: 500,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                </svg>
                Order status will automatically be set to <strong style={{ marginLeft: 4 }}>Order Received</strong> and a confirmation email will be sent to the customer.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/orders')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
            >
              {submitting
                ? <><span className="spinner" /> Creating Order…</>
                : <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Create Order
                  </>
              }
            </button>
          </div>
        </form>
      </div>
    </>
  );
}