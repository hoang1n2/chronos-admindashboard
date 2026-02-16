import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '../../api/client';
import type { SupplierProduct, DashboardNotification } from '../../api/types';

// Configured suppliers
const SUPPLIERS = [
  { name: 'MTD Shop', key: 'mtdshop', url: 'https://mtdshop247.com/', icon: '🛒' },
  { name: 'Genz Shop', key: 'genzshop', url: 'https://genzshop.vn/', icon: '🛍️' },
];

export default function SupplierMonitor() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'products' | 'notifications'>('suppliers');
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
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Scan suppliers
  const handleScan = async (supplierKey?: string) => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await apiPost('/api/supplier/scan', supplierKey ? { supplier: supplierKey } : {});
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScanResult(data.message);
          // Reload data after scan
          await loadData();
          // Switch to products tab to see results
          setActiveTab('products');
        } else {
          setScanResult('Lỗi: ' + (data.message || 'Không thể quét'));
        }
      } else {
        setScanResult('Lỗi kết nối API');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setScanResult('Lỗi: Không thể kết nối đến API');
    } finally {
      setIsScanning(false);
      // Clear result after 5s
      setTimeout(() => setScanResult(null), 5000);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

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

      {/* Scan Bar */}
      <div className="actions-bar">
        <div className="actions-left">
          <button
            onClick={() => handleScan()}
            disabled={isScanning}
            className="btn-primary"
          >
            <i className={`fas ${isScanning ? 'fa-spinner fa-spin' : 'fa-search'}`} />
            {isScanning ? ' Đang quét...' : ' Quét tất cả nhà cung cấp'}
          </button>
          {SUPPLIERS.map(s => (
            <button
              key={s.key}
              onClick={() => handleScan(s.key)}
              disabled={isScanning}
              className="btn-refresh"
              title={`Quét ${s.name}`}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
        <div className="actions-right">
          {scanResult && (
            <span style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '.85rem',
              fontWeight: 500,
              background: scanResult.startsWith('Lỗi') ? '#fee2e2' : '#dcfce7',
              color: scanResult.startsWith('Lỗi') ? '#dc2626' : '#16a34a',
            }}>
              {scanResult}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>
          <i className="fas fa-store" /> Nhà Cung Cấp ({SUPPLIERS.length})
        </button>
        <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          <i className="fas fa-box" /> Sản Phẩm ({products.length})
        </button>
        <button className={`tab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          <i className="fas fa-bell" /> Thông Báo {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải dữ liệu nhà cung cấp...</p></div>
      ) : activeTab === 'suppliers' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {SUPPLIERS.map(s => {
            const supplierProducts = products.filter(p => p.supplier === s.name);
            const inStock = supplierProducts.filter(p => p.in_stock).length;
            const outOfStock = supplierProducts.filter(p => !p.in_stock).length;
            const lastChecked = supplierProducts.length > 0
              ? supplierProducts.reduce((latest, p) => {
                  const pDate = new Date(p.last_checked).getTime();
                  return pDate > new Date(latest).getTime() ? p.last_checked : latest;
                }, supplierProducts[0].last_checked)
              : null;

            return (
              <div key={s.name} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: 24, boxShadow: 'var(--shadow)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <span style={{ fontSize: '2rem' }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.name}</div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.85rem', color: 'var(--primary)' }}>
                      {s.url} <i className="fas fa-external-link-alt" style={{ fontSize: '.7rem' }} />
                    </a>
                  </div>
                  <button
                    onClick={() => handleScan(s.key)}
                    disabled={isScanning}
                    className="btn-sm"
                    title={`Quét ${s.name}`}
                    style={{ padding: '8px 14px' }}
                  >
                    <i className={`fas ${isScanning ? 'fa-spinner fa-spin' : 'fa-sync'}`} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '.8rem', fontWeight: 600, background: '#3b82f615', color: '#3b82f6' }}>
                    {supplierProducts.length} sản phẩm
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '.8rem', fontWeight: 600, background: '#10b98115', color: '#10b981' }}>
                    {inStock} còn hàng
                  </span>
                  {outOfStock > 0 && (
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '.8rem', fontWeight: 600, background: '#ef444415', color: '#ef4444' }}>
                      {outOfStock} hết hàng
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
                  {lastChecked
                    ? `Lần quét cuối: ${formatDate(lastChecked)}`
                    : 'Chưa quét. Nhấn nút quét để bắt đầu.'}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'products' ? (
        products.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-search" />
            <p>Chưa có sản phẩm nào được theo dõi</p>
            <p className="empty-hint">Nhấn nút "Quét tất cả nhà cung cấp" ở trên để bắt đầu quét.</p>
            <button
              onClick={() => handleScan()}
              disabled={isScanning}
              className="btn-primary"
              style={{ marginTop: 16 }}
            >
              <i className={`fas ${isScanning ? 'fa-spinner fa-spin' : 'fa-search'}`} />
              {isScanning ? ' Đang quét...' : ' Quét ngay'}
            </button>
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
                      {p.price > 0 ? `${p.price.toLocaleString()} ${p.currency}` : 'N/A'}
                    </td>
                    <td className="cell-prev-price">
                      {p.previous_price && p.previous_price !== p.price ? `${p.previous_price.toLocaleString()} ${p.currency}` : '—'}
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
