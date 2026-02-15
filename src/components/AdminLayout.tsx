import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TodayOrders from './pages/TodayOrders';
import OrderHistory from './pages/OrderHistory';
import DiscountCoupons from './pages/DiscountCoupons';
import CustomerInfo from './pages/CustomerInfo';
import ProductManagement from './pages/ProductManagement';
import SupplierMonitor from './pages/SupplierMonitor';

type AdminPage = 'today-orders' | 'order-history' | 'discount-coupons' | 'customer-info' | 'product-management' | 'supplier-monitor';

const NAV_ITEMS: { key: AdminPage; label: string; icon: string }[] = [
  { key: 'today-orders', label: 'Đơn Hàng Hôm Nay', icon: 'fa-shopping-cart' },
  { key: 'order-history', label: 'Lịch Sử Mua Hàng', icon: 'fa-history' },
  { key: 'product-management', label: 'Quản Lý Sản Phẩm', icon: 'fa-box' },
  { key: 'discount-coupons', label: 'Phiếu Giảm Giá', icon: 'fa-tag' },
  { key: 'customer-info', label: 'Thông Tin Khách Hàng', icon: 'fa-users' },
  { key: 'supplier-monitor', label: 'Theo Dõi Nhà Cung Cấp', icon: 'fa-eye' },
];

const PAGE_TITLES: Record<AdminPage, { title: string; subtitle: string }> = {
  'today-orders': { title: 'Đơn Hàng Hôm Nay', subtitle: 'Quản lý và theo dõi đơn hàng mới trong ngày' },
  'order-history': { title: 'Lịch Sử Mua Hàng', subtitle: 'Xem lại toàn bộ lịch sử đơn hàng' },
  'product-management': { title: 'Quản Lý Sản Phẩm', subtitle: 'Thêm, sửa, xóa và quản lý tất cả sản phẩm' },
  'discount-coupons': { title: 'Phiếu Giảm Giá', subtitle: 'Tạo và quản lý mã giảm giá' },
  'customer-info': { title: 'Thông Tin Khách Hàng', subtitle: 'Thông tin khách hàng đã đăng ký' },
  'supplier-monitor': { title: 'Theo Dõi Nhà Cung Cấp', subtitle: 'Giám sát giá, tồn kho và dịch vụ mới' },
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState<AdminPage>('today-orders');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { title, subtitle } = PAGE_TITLES[activePage];

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="https://i.imgur.com/k7G7ZwP.png" alt="Davarium" />
            {!sidebarCollapsed && (
              <div className="logo-text">
                <div className="logo-title">Admin Portal</div>
                <div className="logo-subtitle">Quản lý hệ thống</div>
              </div>
            )}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activePage === item.key ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
              title={item.label}
            >
              <i className={`fas ${item.icon}`} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" title={user?.email}>
            <i className="fas fa-user-shield" />
            {!sidebarCollapsed && <span>{user?.name || user?.username || 'Admin'}</span>}
          </div>
          <button className="btn-logout" onClick={logout} title="Đăng xuất">
            <i className="fas fa-sign-out-alt" />
            {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-right">
            <div className="api-status connected">
              <span className="status-dot" />
              <span>API Connected</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {activePage === 'today-orders' && <TodayOrders />}
          {activePage === 'order-history' && <OrderHistory />}
          {activePage === 'product-management' && <ProductManagement />}
          {activePage === 'discount-coupons' && <DiscountCoupons />}
          {activePage === 'customer-info' && <CustomerInfo />}
          {activePage === 'supplier-monitor' && <SupplierMonitor />}
        </div>
      </main>
    </div>
  );
}
