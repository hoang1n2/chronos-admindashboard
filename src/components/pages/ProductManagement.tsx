import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { Product } from '../../api/types';

const CATEGORIES = [
  'Streaming', 'Design', 'Produtividade', 'IA',
  'Desenvolvimento', 'Website', 'Hosting', 'Outros',
];

const DEFAULT_PRODUCT: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: '',
  price: 0,
  currency: 'EUR',
  category: 'Outros',
  image: '',
  in_stock: true,
  stock_label: 'Disponível',
  features: [],
};

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(DEFAULT_PRODUCT);
  const [featuresInput, setFeaturesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isFirstLoadRef = useRef(true);

  const loadProducts = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setIsLoading(true);
      const res = await apiGet('/api/products/list');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (!data.success) throw new Error('Invalid');

      const all: Product[] = (data.products || []).map((p: Record<string, unknown>) => ({
        id: String(p.id ?? p._id ?? ''),
        name: (p.name ?? '') as string,
        description: (p.description ?? '') as string,
        price: typeof p.price === 'number' ? p.price : 0,
        currency: (p.currency ?? 'EUR') as string,
        category: (p.category ?? 'Outros') as string,
        image: (p.image ?? '') as string,
        in_stock: p.in_stock !== false,
        stock_label: (p.stock_label ?? '') as string,
        features: Array.isArray(p.features) ? p.features as string[] : [],
        created_at: (p.created_at ?? new Date().toISOString()) as string,
        updated_at: (p.updated_at ?? new Date().toISOString()) as string,
      }));

      setProducts(all);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      isFirstLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadProducts();
    const interval = setInterval(loadProducts, 30000);
    return () => clearInterval(interval);
  }, [loadProducts]);

  const filteredProducts = products.filter(p => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (filterStock === 'in_stock' && !p.in_stock) return false;
    if (filterStock === 'out_of_stock' && p.in_stock) return false;
    return true;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({ ...DEFAULT_PRODUCT });
    setFeaturesInput('');
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      category: product.category,
      image: product.image,
      in_stock: product.in_stock,
      stock_label: product.stock_label || '',
      features: product.features || [],
    });
    setFeaturesInput((product.features || []).join('\n'));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return alert('Vui lòng nhập tên sản phẩm');
    setIsSaving(true);

    try {
      const features = featuresInput.split('\n').map(f => f.trim()).filter(Boolean);
      const payload = { ...formData, features };

      if (editingProduct) {
        await apiPut('/api/products/manage', { id: editingProduct.id, ...payload });
      } else {
        await apiPost('/api/products/manage', payload);
      }

      setShowModal(false);
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Lỗi khi lưu sản phẩm');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStock = async (product: Product) => {
    try {
      await apiPut('/api/products/manage', {
        id: product.id,
        in_stock: !product.in_stock,
        stock_label: !product.in_stock ? 'Disponível' : 'Esgotado',
      });
      loadProducts();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Xóa sản phẩm "${product.name}"?`)) return;
    try {
      await apiDelete('/api/products/manage', { body: JSON.stringify({ id: product.id }) });
      loadProducts();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (amount === 0) return 'Liên hệ';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency || 'EUR' }).format(amount);
  };

  const inStockCount = products.filter(p => p.in_stock).length;
  const outOfStockCount = products.filter(p => !p.in_stock).length;
  const uniqueCategories = [...new Set(products.map(p => p.category))];

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#6366f1' }}><i className="fas fa-box" /></div>
          <div><div className="stat-label">Tổng Sản Phẩm</div><div className="stat-value">{products.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}><i className="fas fa-check-circle" /></div>
          <div><div className="stat-label">Còn Hàng</div><div className="stat-value">{inStockCount}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef4444' }}><i className="fas fa-times-circle" /></div>
          <div><div className="stat-label">Hết Hàng</div><div className="stat-value">{outOfStockCount}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}><i className="fas fa-layer-group" /></div>
          <div><div className="stat-label">Danh Mục</div><div className="stat-value">{uniqueCategories.length}</div></div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-bar">
        <div className="actions-left">
          <button onClick={openCreateModal} className="btn-primary">
            <i className="fas fa-plus" /> Thêm Sản Phẩm
          </button>
          <input
            type="text"
            className="search-input"
            placeholder="Tìm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="filter-select">
            <option value="all">Tất cả danh mục</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="filter-select">
            <option value="all">Tất cả</option>
            <option value="in_stock">Còn hàng</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>
        </div>
        <div className="actions-right">
          <span className="filter-info">{filteredProducts.length} sản phẩm</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên Sản Phẩm *</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Youtube Premium (1 Mês)"
                />
              </div>
              <div className="form-group">
                <label>Mô Tả</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả sản phẩm..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Giá (0 = Liên hệ)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Tiền Tệ</label>
                  <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="BRL">BRL (R$)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Danh Mục</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tình Trạng</label>
                  <select
                    value={formData.in_stock ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, in_stock: e.target.value === 'true' })}
                  >
                    <option value="true">Còn hàng</option>
                    <option value="false">Hết hàng</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>URL Hình Ảnh</label>
                <input
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>Tính Năng (mỗi dòng 1 tính năng)</label>
                <textarea
                  value={featuresInput}
                  onChange={e => setFeaturesInput(e.target.value)}
                  placeholder="Tính năng 1&#10;Tính năng 2&#10;Tính năng 3"
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary">
                {isSaving ? <><i className="fas fa-spinner fa-spin" /> Đang lưu...</> : editingProduct ? 'Cập Nhật' : 'Tạo Sản Phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Đang tải sản phẩm...</p></div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-box-open" />
          <p>{searchTerm || filterCategory !== 'all' || filterStock !== 'all' ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}</p>
          {!searchTerm && filterCategory === 'all' && (
            <button onClick={openCreateModal} className="btn-primary" style={{ marginTop: 12 }}>
              <i className="fas fa-plus" /> Thêm Sản Phẩm Đầu Tiên
            </button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((p) => (
            <div key={p.id} className={`product-card ${!p.in_stock ? 'out-of-stock' : ''}`}>
              <div className="product-header">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="product-image" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="product-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '1.2rem' }}>
                    <i className="fas fa-box" />
                  </div>
                )}
                <div>
                  <div className="product-title">{p.name}</div>
                  <div className="product-subtitle">{p.category}</div>
                </div>
              </div>
              <div className="product-body">
                {p.description && <div style={{ fontSize: '.85rem', color: '#64748b', lineHeight: 1.4 }}>{p.description.substring(0, 100)}{p.description.length > 100 ? '...' : ''}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="product-price">{formatCurrency(p.price, p.currency)}</div>
                  <span className={`stock-badge ${p.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                    {p.in_stock ? (p.stock_label || 'Disponível') : (p.stock_label || 'Esgotado')}
                  </span>
                </div>
                {p.features && p.features.length > 0 && (
                  <div style={{ fontSize: '.8rem', color: '#64748b' }}>
                    {p.features.slice(0, 3).map((f, i) => (
                      <div key={i}>• {f}</div>
                    ))}
                    {p.features.length > 3 && <div>+{p.features.length - 3} tính năng khác</div>}
                  </div>
                )}
              </div>
              <div className="product-actions">
                <button onClick={() => openEditModal(p)} className="btn-sm"><i className="fas fa-edit" /> Sửa</button>
                <button onClick={() => handleToggleStock(p)} className="btn-sm">
                  <i className={`fas ${p.in_stock ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                  {p.in_stock ? 'Hết hàng' : 'Còn hàng'}
                </button>
                <button onClick={() => handleDelete(p)} className="btn-sm btn-danger"><i className="fas fa-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
