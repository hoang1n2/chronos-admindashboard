import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../api/client';
import type { SupplierProduct, DashboardNotification } from '../../api/types';

export default function SupplierMonitor() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'notifications' | 'history'>('products');
  const isFirstLoadRef = useRef(true);

  const loadData = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setIsLoading(true);

      // Load supplier products
      try {
        const res = await apiGet('/api/supplier/products');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setProducts(data.products || []);
        }
      } catch { /* API not ready yet */ }

      // Load notifications
      try {
        const res = await apiGet('/api/supplier/notifications');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setNotifications(data.notifications || []);
        }
      } catch { /* API not ready yet */ }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getChangeIcon = (product: SupplierProduct) => {
    if (product.is_new) return '🆕';
    if (product.price_changed) return product.price > (product.previous_price || 0) ? '📈' : '📉';
    if (product.stock_changed) return product.in_stock ? '✅' : '❌';
    return '—';
  };

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f6' }}><i className="fas fa-box" /></div>
          <div><div className="stat-label">Sản Phẩm Theo Dõi</div><div className="stat-value">{products.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}><i className="fas fa-bell" /></div>
          <div><div className="stat-label">Thông Báo Mới</div><div className="stat-value">{unreadCount}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}><i className="fas fa-check-circle" /></div>
          <div><div className="stat-label">Còn Hàng</div><div className="stat-value">{products.filter(p => p.in_stock).length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef4444' }}><i className="fas fa-times-circle" /></div>
          <div><div className="stat-label">Hết Hàng</div><div className="stat-value">{products.filter(p => !p.in_stock).length}</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          <i className="fas fa-box" /> Sản Phẩm
        </button>
        <button className={`tab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          <i className="fas fa-bell" /> Thông Báo {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải dữ liệu nhà cung cấp...</p></div>
      ) : activeTab === 'products' ? (
        products.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-eye" />
            <p>Chưa có sản phẩm nào được theo dõi</p>
            <p className="empty-hint">Hệ thống sẽ tự động quét nhà cung cấp 5 lần/ngày và cập nhật tại đây.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Thay Đổi</th>
                  <th>Nhà Cung Cấp</th>
                  <th>Sản Phẩm</th>
                  <th>Giá</th>
                  <th>Giá Cũ</th>
                  <th>Tồn Kho</th>
                  <th>Lần Kiểm Tra</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.price_changed || p.stock_changed || p.is_new ? 'row-changed' : ''}>
                    <td className="cell-icon">{getChangeIcon(p)}</td>
                    <td>{p.supplier}</td>
                    <td>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="product-link">
                        {p.name}
                      </a>
                    </td>
                    <td className={`cell-price ${p.price_changed ? 'price-changed' : ''}`}>
                      {p.price > 0 ? `${p.price} ${p.currency}` : 'N/A'}
                    </td>
                    <td className="cell-prev-price">
                      {p.previous_price && p.previous_price !== p.price ? `${p.previous_price} ${p.currency}` : '—'}
                    </td>
                    <td>
                      <span className={`stock-badge ${p.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                        {p.in_stock ? 'Còn hàng' : 'Hết hàng'}
                      </span>
                    </td>
                    <td>{formatDate(p.last_checked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        notifications.length === 0 ? (
          <div className="empty-state"><i className="fas fa-bell" /><p>Chưa có thông báo nào</p></div>
        ) : (
          <div className="notifications-list">
            {notifications.map((n) => (
              <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
                <div className="notification-icon">
                  {n.type === 'price_change' && '💰'}
                  {n.type === 'out_of_stock' && '❌'}
                  {n.type === 'back_in_stock' && '✅'}
                  {n.type === 'new_product' && '🆕'}
                  {n.type === 'new_order' && '🛒'}
                  {n.type === 'info' && 'ℹ️'}
                </div>
                <div className="notification-content">
                  <div className="notification-title">{n.title}</div>
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-time">{formatDate(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
