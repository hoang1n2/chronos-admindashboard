import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../api/client';
import type { Customer } from '../../api/types';

export default function CustomerInfo() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 20;
  const isFirstLoadRef = useRef(true);

  const load = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setIsLoading(true);
      const res = await apiGet('/api/customers/list');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (!data.success) throw new Error('Invalid');

      const all: Customer[] = (data.customers || []).map((c: Record<string, unknown>) => ({
        id: String(c.id ?? c._id ?? ''),
        email: (c.email ?? '') as string,
        name: c.name as string | undefined,
        created_at: (c.created_at ?? new Date().toISOString()) as string,
        last_sign_in_at: c.last_sign_in_at as string | undefined,
      }));

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      setTodayCount(all.filter(c => { const d = new Date(c.created_at); return d >= today && d < tomorrow; }).length);
      setTotalCount(all.length);

      const skip = (currentPage - 1) * perPage;
      setCustomers(all.slice(skip, skip + perPage));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [currentPage]);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page-container">
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon" style={{background:'#3b82f6'}}><i className="fas fa-users" /></div><div><div className="stat-label">Tổng Thành Viên</div><div className="stat-value">{totalCount}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{background:'#10b981'}}><i className="fas fa-user-plus" /></div><div><div className="stat-label">Hôm Nay</div><div className="stat-value">{todayCount}</div></div></div>
      </div>

      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải...</p></div>
      ) : customers.length === 0 ? (
        <div className="empty-state"><i className="fas fa-users" /><p>Chưa có khách hàng</p></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead><tr><th>ID</th><th>Email</th><th>Tên</th><th>Ngày Đăng Ký</th><th>Đăng Nhập Cuối</th></tr></thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td className="cell-id">{c.id.substring(0, 8)}...</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.name || '—'}</td>
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
