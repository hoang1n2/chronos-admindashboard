import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '../../api/client';
import type { Order } from '../../api/types';

export default function TodayOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAllOrders, setShowAllOrders] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastKnownTimestampRef = useRef<string | null>(null);
  const soundEnabledRef = useRef(true);
  const filterStatusRef = useRef('all');
  const showAllOrdersRef = useRef(false);
  const isFirstLoadRef = useRef(true);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { filterStatusRef.current = filterStatus; }, [filterStatus]);
  useEffect(() => { showAllOrdersRef.current = showAllOrders; }, [showAllOrders]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setIsLoading(true);

      const res = await apiGet('/api/orders/list');
      if (!res.ok) throw new Error('Failed to fetch orders');

      const data = await res.json();
      if (!data.success || !Array.isArray(data.orders)) throw new Error('Invalid response');

      let allOrders: Order[] = data.orders.map((o: Record<string, unknown>) => ({
        id: String(o.id ?? o._id ?? ''),
        order_id: (o.order_id ?? o.orderId) as string,
        user_id: (o.user_id ?? o.userId ?? '') as string,
        customer_name: (o.customer_name ?? o.customerName ?? '') as string,
        customer_email: (o.customer_email ?? o.customerEmail ?? '') as string,
        customer_phone: (o.customer_phone ?? o.customerPhone ?? '') as string,
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: typeof o.subtotal === 'number' ? o.subtotal : 0,
        discount: typeof o.discount === 'number' ? o.discount : 0,
        total: typeof o.total === 'number' ? o.total : 0,
        status: (o.status as string) ?? 'pending',
        created_at: (o.created_at ?? o.createdAt) as string,
        updated_at: (o.updated_at ?? o.updatedAt ?? o.created_at ?? o.createdAt) as string,
      }));

      // Sort newest first
      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Filter: today only or all
      if (!showAllOrdersRef.current) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        allOrders = allOrders.filter(o => {
          const d = new Date(o.created_at);
          return d >= today && d < tomorrow;
        });
      }

      // Filter by status
      if (filterStatusRef.current !== 'all') {
        allOrders = allOrders.filter(o => o.status === filterStatusRef.current);
      }

      // Detect new orders
      const lastTs = lastKnownTimestampRef.current;
      if (lastTs) {
        const detected = allOrders.filter(o => new Date(o.created_at).getTime() > new Date(lastTs).getTime());
        if (detected.length > 0) {
          const ids = new Set(detected.map(o => o.order_id));
          setNewOrderIds(prev => new Set([...prev, ...ids]));
          setTimeout(() => {
            setNewOrderIds(prev => {
              const next = new Set(prev);
              ids.forEach(id => next.delete(id));
              return next;
            });
          }, 30000);
          if (soundEnabledRef.current) playNotificationSound();
        }
      }

      if (allOrders.length > 0 && allOrders[0].created_at) {
        lastKnownTimestampRef.current = allOrders[0].created_at;
      }

      setOrders(allOrders);
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [playNotificationSound]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  useEffect(() => {
    if (!isFirstLoadRef.current) loadOrders();
  }, [filterStatus, showAllOrders, loadOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setIsRefreshing(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiPost('/api/orders/update-status', { orderId, status });
      await loadOrders();
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'Liên hệ';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'pending': return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'processing': return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'completed': return { backgroundColor: '#d1fae5', color: '#065f46' };
      case 'cancelled': return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default: return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const statusText: Record<string, string> = {
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };

  return (
    <div className="page-container">
      <audio ref={audioRef} src="/notification-sound.mp3" preload="auto" />

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}><i className="fas fa-dollar-sign" /></div>
          <div><div className="stat-label">Doanh Thu</div><div className="stat-value">{formatCurrency(orders.reduce((s, o) => s + o.total, 0))}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f6' }}><i className="fas fa-shopping-cart" /></div>
          <div><div className="stat-label">Tổng Đơn</div><div className="stat-value">{orders.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}><i className="fas fa-clock" /></div>
          <div><div className="stat-label">Chờ Xử Lý</div><div className="stat-value">{orders.filter(o => o.status === 'pending').length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8b5cf6' }}><i className="fas fa-check-circle" /></div>
          <div><div className="stat-label">Hoàn Thành</div><div className="stat-value">{orders.filter(o => o.status === 'completed').length}</div></div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-bar">
        <div className="actions-left">
          <label className="checkbox-label">
            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
            <span>Thông báo âm thanh</span>
          </label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <label className="checkbox-label">
            <input type="checkbox" checked={showAllOrders} onChange={(e) => setShowAllOrders(e.target.checked)} />
            <span>Tất cả đơn hàng</span>
          </label>
        </div>
        <div className="actions-right">
          <button onClick={handleRefresh} disabled={isRefreshing} className="btn-refresh">
            <i className={`fas ${isRefreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} />
            {isRefreshing ? 'Đang làm mới...' : 'Làm Mới'}
          </button>
          {lastRefreshTime && <span className="refresh-time">Cập nhật: {lastRefreshTime.toLocaleTimeString('vi-VN')}</span>}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải đơn hàng...</p></div>
      ) : orders.length === 0 ? (
        <div className="empty-state"><i className="fas fa-inbox" /><p>{showAllOrders ? 'Chưa có đơn hàng nào' : 'Chưa có đơn hàng hôm nay'}</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Khách Hàng</th>
                <th>SĐT</th>
                <th>Sản Phẩm</th>
                <th>Ngày</th>
                <th>Tổng</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={newOrderIds.has(order.order_id) ? 'row-new' : ''}>
                  <td>
                    <span className="order-id">{order.order_id}</span>
                    {newOrderIds.has(order.order_id) && <span className="badge-new">MỚI</span>}
                  </td>
                  <td>{order.customer_name || '—'}</td>
                  <td>{order.customer_phone || '—'}</td>
                  <td>
                    {order.items.slice(0, 2).map((item, i) => <div key={i} className="item-name">{item.name}</div>)}
                    {order.items.length > 2 && <div className="item-more">+{order.items.length - 2} khác</div>}
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                  <td className="cell-total">{formatCurrency(order.total)}</td>
                  <td><span className="status-badge" style={getStatusColor(order.status)}>{statusText[order.status] || order.status}</span></td>
                  <td>
                    <select value={order.status} onChange={(e) => updateOrderStatus(order.order_id, e.target.value)} className="status-select">
                      <option value="pending">Chờ xử lý</option>
                      <option value="processing">Đang xử lý</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
