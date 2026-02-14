import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../api/client';
import type { Order } from '../../api/types';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const ordersPerPage = 20;
  const isFirstLoadRef = useRef(true);

  const loadOrders = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setIsLoading(true);
      const res = await apiGet('/api/orders/list');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (!data.success) throw new Error('Invalid');

      let allOrders: Order[] = (data.orders || []).map((o: Record<string, unknown>) => ({
        id: String(o.id ?? o._id ?? ''),
        order_id: (o.order_id ?? o.orderId) as string,
        user_id: (o.user_id ?? '') as string,
        customer_name: (o.customer_name ?? '') as string,
        customer_email: (o.customer_email ?? '') as string,
        customer_phone: (o.customer_phone ?? '') as string,
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: typeof o.subtotal === 'number' ? o.subtotal : 0,
        discount: typeof o.discount === 'number' ? o.discount : 0,
        total: typeof o.total === 'number' ? o.total : 0,
        status: (o.status as string) ?? 'pending',
        created_at: (o.created_at ?? o.createdAt) as string,
        updated_at: (o.updated_at ?? o.created_at) as string,
      }));

      if (selectedStatus !== 'all') allOrders = allOrders.filter(o => o.status === selectedStatus);
      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTotalCount(allOrders.length);

      const skip = (currentPage - 1) * ordersPerPage;
      setOrders(allOrders.slice(skip, skip + ordersPerPage));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [currentPage, selectedStatus]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const formatCurrency = (n: number) => n === 0 ? 'Liên hệ' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getStatusColor = (s: string) => {
    const map: Record<string, { backgroundColor: string; color: string }> = {
      pending: { backgroundColor: '#fef3c7', color: '#92400e' },
      processing: { backgroundColor: '#dbeafe', color: '#1e40af' },
      completed: { backgroundColor: '#d1fae5', color: '#065f46' },
      cancelled: { backgroundColor: '#fee2e2', color: '#991b1b' },
    };
    return map[s] || { backgroundColor: '#f3f4f6', color: '#374151' };
  };
  const statusText: Record<string, string> = { pending: 'Chờ xử lý', processing: 'Đang xử lý', completed: 'Hoàn thành', cancelled: 'Đã hủy' };

  return (
    <div className="page-container">
      <div className="actions-bar">
        <div className="actions-left">
          <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }} className="filter-select">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <span className="filter-info">Tổng: {totalCount} đơn hàng</span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải...</p></div>
      ) : orders.length === 0 ? (
        <div className="empty-state"><i className="fas fa-history" /><p>Chưa có đơn hàng</p></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead><tr><th>Mã Đơn</th><th>Khách Hàng</th><th>SĐT</th><th>Sản Phẩm</th><th>Ngày</th><th>Tổng</th><th>Trạng Thái</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_id}</td>
                    <td>{o.customer_name || '—'}</td>
                    <td>{o.customer_phone || '—'}</td>
                    <td>{o.items.slice(0, 2).map((item, i) => <div key={i}>{item.name}</div>)}{o.items.length > 2 && <div className="item-more">+{o.items.length - 2}</div>}</td>
                    <td>{formatDate(o.created_at)}</td>
                    <td className="cell-total">{formatCurrency(o.total)}</td>
                    <td><span className="status-badge" style={getStatusColor(o.status)}>{statusText[o.status] || o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-page">← Trước</button>
            <span>Trang {currentPage} / {Math.ceil(totalCount / ordersPerPage)}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * ordersPerPage >= totalCount} className="btn-page">Sau →</button>
          </div>
        </>
      )}
    </div>
  );
}
