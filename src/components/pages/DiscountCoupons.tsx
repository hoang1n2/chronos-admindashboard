import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { Coupon } from '../../api/types';

export default function DiscountCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: 10, discount_amount: 0, expires_at: '' });
  const isFirstLoadRef = useRef(true);

  const loadCoupons = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setIsLoading(true);
      const res = await apiGet('/api/coupons/list');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.coupons)) {
          setCoupons(data.coupons.map((c: Record<string, unknown>) => ({
            id: String(c._id ?? c.id ?? ''),
            code: c.code as string,
            discount_percent: Number(c.discount_percent ?? 0),
            discount_amount: Number(c.discount_amount ?? 0),
            is_active: (c.is_active as boolean) ?? true,
            is_used: (c.is_used as boolean) ?? false,
            used_by: c.used_by as string | undefined,
            used_at: c.used_at as string | undefined,
            created_at: (c.created_at as string) ?? new Date().toISOString(),
            expires_at: c.expires_at as string | undefined,
          })));
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadCoupons();
    const interval = setInterval(loadCoupons, 15000);
    return () => clearInterval(interval);
  }, [loadCoupons]);

  const handleCreate = async () => {
    if (!newCoupon.code.trim()) return alert('Vui lòng nhập mã giảm giá');
    try {
      await apiPost('/api/coupons/admin', {
        code: newCoupon.code.toUpperCase().trim(),
        discount_percent: newCoupon.discount_percent,
        discount_amount: newCoupon.discount_amount,
        expires_at: newCoupon.expires_at || undefined,
      });
      setShowModal(false);
      setNewCoupon({ code: '', discount_percent: 10, discount_amount: 0, expires_at: '' });
      loadCoupons();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await apiPut('/api/coupons/admin', { id, is_active: !isActive });
    loadCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa phiếu giảm giá này?')) return;
    await apiDelete('/api/coupons/admin', { body: JSON.stringify({ id }) });
    loadCoupons();
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page-container">
      <div className="actions-bar">
        <button onClick={() => setShowModal(true)} className="btn-primary"><i className="fas fa-plus" /> Tạo Phiếu Mới</button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Tạo Phiếu Giảm Giá</h2><button onClick={() => setShowModal(false)} className="modal-close">×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Mã Giảm Giá *</label><input value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="VD: SALE10" /></div>
              <div className="form-group"><label>Phần Trăm Giảm (%)</label><input type="number" value={newCoupon.discount_percent} onChange={e => setNewCoupon({...newCoupon, discount_percent: parseInt(e.target.value) || 0})} min="0" max="100" /></div>
              <div className="form-group"><label>Số Tiền Giảm (€)</label><input type="number" value={newCoupon.discount_amount} onChange={e => setNewCoupon({...newCoupon, discount_amount: parseInt(e.target.value) || 0})} min="0" /></div>
              <div className="form-group"><label>Ngày Hết Hạn</label><input type="datetime-local" value={newCoupon.expires_at} onChange={e => setNewCoupon({...newCoupon, expires_at: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button onClick={() => setShowModal(false)} className="btn-secondary">Hủy</button><button onClick={handleCreate} className="btn-primary">Tạo</button></div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải...</p></div>
      ) : coupons.length === 0 ? (
        <div className="empty-state"><i className="fas fa-tag" /><p>Chưa có phiếu giảm giá</p></div>
      ) : (
        <div className="coupons-grid">
          {coupons.map((c) => (
            <div key={c.id} className={`coupon-card ${c.is_used ? 'used' : ''} ${!c.is_active ? 'inactive' : ''}`}>
              <div className="coupon-header">
                <span className="coupon-code">{c.code}</span>
                <span className={`status-badge ${c.is_used ? 'used' : !c.is_active ? 'inactive' : 'active'}`}>
                  {c.is_used ? 'Đã dùng' : !c.is_active ? 'Tắt' : 'Hoạt động'}
                </span>
              </div>
              <div className="coupon-body">
                {c.discount_percent > 0 && <div className="coupon-value">{c.discount_percent}% giảm</div>}
                {c.discount_amount > 0 && <div className="coupon-value">{c.discount_amount}€ giảm</div>}
                <div className="coupon-info">Tạo: {formatDate(c.created_at)}</div>
                {c.expires_at && <div className="coupon-info">Hết hạn: {formatDate(c.expires_at)}</div>}
              </div>
              <div className="coupon-actions">
                {!c.is_used && <button onClick={() => handleToggle(c.id, c.is_active)} className="btn-sm">{c.is_active ? 'Tắt' : 'Bật'}</button>}
                <button onClick={() => handleDelete(c.id)} className="btn-sm btn-danger"><i className="fas fa-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
