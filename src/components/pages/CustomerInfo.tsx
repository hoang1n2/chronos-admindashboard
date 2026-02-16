import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../api/client';
import type { Customer } from '../../api/types';

export default function CustomerInfo() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const perPage = 20;
  const isFirstLoadRef = useRef(true);

  const load = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setIsLoading(true);
      
      // Load customers
      const res = await apiGet('/api/customers/list');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (!data.success) throw new Error('Invalid');

      let all: Customer[] = (data.customers || []).map((c: Record<string, unknown>) => ({
        id: String(c.id ?? c._id ?? ''),
        email: (c.email ?? '') as string,
        username: (c.username ?? '') as string,
        name: c.name as string | undefined,
        phone: (c.phone ?? '') as string,
        role: (c.role ?? 'user') as string,
        customer_tier: (c.customer_tier ?? 'regular') as string,
        total_spent: typeof c.total_spent === 'number' ? c.total_spent : 0,
        loyalty_points: typeof c.loyalty_points === 'number' ? c.loyalty_points : 0,
        created_at: (c.created_at ?? new Date().toISOString()) as string,
        last_sign_in_at: c.last_sign_in_at as string | undefined,
      }));

      // Calculate total revenue from customers' spending
      const totalRev = all.reduce((sum, c) => sum + (c.total_spent || 0), 0);
      setTotalRevenue(totalRev);

      // Calculate today's new customers
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayCustomers = all.filter(c => { 
        const d = new Date(c.created_at); 
        return d >= today && d < tomorrow; 
      });
      setTodayCount(todayCustomers.length);

      // Today's revenue (from orders API)
      try {
        const ordersRes = await apiGet('/api/orders/list');
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData.success && Array.isArray(ordersData.orders)) {
            const todayOrders = ordersData.orders.filter((o: any) => {
              const orderDate = new Date(o.created_at || o.orderDate);
              return orderDate >= today && orderDate < tomorrow;
            });
            const todayRev = todayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
            setTodayRevenue(todayRev);
          }
        }
      } catch (e) {
        console.log('Could not load orders:', e);
      }

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTodayCount(all.filter(c => { const d = new Date(c.created_at); return d >= today && d < tomorrow; }).length);

      // Filter by search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        all = all.filter(c =>
          (c.email || '').toLowerCase().includes(q) ||
          (c.name || '').toLowerCase().includes(q) ||
          (c.username || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        );
      }

      setTotalCount(all.length);
      const skip = (currentPage - 1) * perPage;
      setCustomers(all.slice(skip, skip + perPage));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [currentPage, searchTerm]);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  const getTierBadge = (tier?: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      vip: { bg: 'rgba(245,158,11,.1)', color: '#d97706', label: 'VIP' },
      premium: { bg: 'rgba(99,102,241,.1)', color: '#6366f1', label: 'Premium' },
      regular: { bg: 'rgba(100,116,139,.1)', color: '#64748b', label: 'Regular' },
    };
    const s = styles[tier || 'regular'] || styles.regular;
    return <span className="status-badge" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <div className="page-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f6' }}><i className="fas fa-users" /></div>
          <div><div className="stat-label">Tổng Thành Viên</div><div className="stat-value">{totalCount}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}><i className="fas fa-user-plus" /></div>
          <div><div className="stat-label">Mới Hôm Nay</div><div className="stat-value">{todayCount}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}><i className="fas fa-dollar-sign" /></div>
          <div><div className="stat-label">Tổng Doanh Thu</div><div className="stat-value">${totalRevenue.toFixed(2)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ec4899' }}><i className="fas fa-calendar-day" /></div>
          <div><div className="stat-label">Doanh Thu Hôm Nay</div><div className="stat-value">${todayRevenue.toFixed(2)}</div></div>
        </div>
      </div>

      <div className="actions-bar">
        <div className="actions-left">
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm email, tên, SĐT..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="actions-right">
          <span className="filter-info">{totalCount} khách hàng</span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải...</p></div>
      ) : customers.length === 0 ? (
        <div className="empty-state"><i className="fas fa-users" /><p>{searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có khách hàng'}</p></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Tên</th>
                  <th>Username</th>
                  <th>SĐT</th>
                  <th>Hạng</th>
                  <th>Tổng Chi</th>
                  <th>Ngày Đăng Ký</th>
                  <th>Đăng Nhập Cuối</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td>{c.email || '—'}</td>
                    <td>{c.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '.85rem' }}>{c.username || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{getTierBadge(c.customer_tier)}</td>
                    <td className="cell-total">{c.total_spent ? `€${c.total_spent.toFixed(2)}` : '€0.00'}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>{c.last_sign_in_at ? formatDate(c.last_sign_in_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-page">← Trước</button>
            <span>Trang {currentPage} / {Math.ceil(totalCount / perPage)}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * perPage >= totalCount} className="btn-page">Sau →</button>
          </div>
        </>
      )}
    </div>
  );
}
