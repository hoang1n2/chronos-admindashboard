import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { Product } from '../../api/types';

// Service definitions matching the website sidebar
const SERVICES = [
  { key: 'youtube', name: 'Youtube Premium', icon: 'fa-brands fa-youtube', color: '#FF0000' },
  { key: 'capcut', name: 'Capcut Pro', icon: 'fa-solid fa-scissors', color: '#000000' },
  { key: 'canva', name: 'Canva Pro', icon: 'fa-solid fa-palette', color: '#00C4CC' },
  { key: 'veo3', name: 'Google Veo3 Ultra', icon: 'fa-solid fa-video', color: '#4285F4' },
  { key: 'gemini', name: 'Google Gemini Pro', icon: 'fa-solid fa-sparkles', color: '#886FBF' },
  { key: 'chatgpt', name: 'ChatGPT Plus', icon: 'fa-solid fa-robot', color: '#10A37F' },
  { key: 'cursor', name: 'Cursor Pro', icon: 'fa-solid fa-code', color: '#6366F1' },
  { key: 'website', name: 'Website Profissional', icon: 'fa-solid fa-globe', color: '#3B82F6' },
  { key: 'hosting', name: 'Hosting Web', icon: 'fa-solid fa-server', color: '#F59E0B' },
  { key: 'microsoft', name: 'Microsoft Office', icon: 'fa-brands fa-microsoft', color: '#D83B01' },
  { key: 'desktop', name: 'Desktop App', icon: 'fa-solid fa-desktop', color: '#64748B' },
];

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, in_stock: true, features: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Add Service/Package Modal States
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({ name: '', category: '', description: '', image: '' });
  const [newPackageForm, setNewPackageForm] = useState({ name: '', price: 0, features: '' });
  
  // Confirm dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'toggle' | 'delete';
    product: Product | null;
    title: string;
    message: string;
  }>({ isOpen: false, type: 'toggle', product: null, title: '', message: '' });
  
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
        product_id: (p.product_id ?? '') as string,
        name: (p.name ?? '') as string,
        description: (p.description ?? '') as string,
        price: typeof p.price === 'number' ? p.price : 0,
        currency: (p.currency ?? 'USD') as string,
        category: (p.category ?? '') as string,
        service: (p.service ?? '') as string,
        service_icon: (p.service_icon ?? '') as string,
        image: (p.image ?? '') as string,
        in_stock: p.in_stock !== false,
        popular: p.popular === true,
        sort_order: typeof p.sort_order === 'number' ? p.sort_order : 0,
        features: Array.isArray(p.features) ? p.features as string[] : [],
        created_at: (p.created_at ?? new Date().toISOString()) as string,
        updated_at: (p.updated_at ?? new Date().toISOString()) as string,
      }));

      all.sort((a, b) => a.sort_order - b.sort_order);
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
    const interval = setInterval(loadProducts, 10000);
    return () => clearInterval(interval);
  }, [loadProducts]);

  const handleSeedProducts = async () => {
    if (!confirm('Sincronizar todos os produtos do website para a base de dados? (Isto irá substituir os produtos existentes)')) return;
    setIsSeeding(true);
    try {
      const res = await apiPost('/api/products/seed', {});
      const data = await res.json();
      if (data.success) {
        alert(`Sucesso! ${data.count} produtos sincronizados.`);
        loadProducts();
      } else {
        alert('Erro: ' + (data.message || 'Falha na sincronização'));
      }
    } catch (err) {
      console.error('Error seeding:', err);
      alert('Erro ao sincronizar produtos');
    } finally {
      setIsSeeding(false);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      price: product.price,
      in_stock: product.in_stock,
      features: (product.features || []).join('\n'),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    
    const features = editForm.features.split('\n').map(f => f.trim()).filter(Boolean);
    const updatedProduct = {
      ...editingProduct,
      price: editForm.price,
      in_stock: editForm.in_stock,
      features,
    };
    
    // Optimistic update - update UI immediately
    setProducts(prev => prev.map(p => 
      p.id === editingProduct.id ? updatedProduct : p
    ));
    
    try {
      await apiPut('/api/products/manage', {
        id: editingProduct.id,
        price: editForm.price,
        in_stock: editForm.in_stock,
        features,
      });
      setEditingProduct(null);
    } catch (err) {
      console.error('Error saving:', err);
      loadProducts(); // Revert on error
      alert('Erro ao guardar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  // Show confirm dialog before toggling stock
  const confirmToggleStock = (product: Product) => {
    const newStatus = !product.in_stock;
    setConfirmDialog({
      isOpen: true,
      type: 'toggle',
      product,
      title: newStatus ? 'Ativar produto?' : 'Desativar produto?',
      message: newStatus
        ? `Tem certeza que deseja marcar "${product.name}" como disponível? O produto será mostrado como disponível no website.`
        : `Tem certeza que deseja marcar "${product.name}" como esgotado? O produto será mostrado como "Esgotado" no website.`,
    });
  };

  // Show confirm dialog before deleting
  const confirmDeleteProduct = (product: Product) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      product,
      title: 'Eliminar produto?',
      message: `Tem certeza que deseja eliminar "${product.name}" permanentemente? Esta ação não pode ser desfeita.`,
    });
  };

  // Execute confirm action
  const handleConfirmAction = async () => {
    if (!confirmDialog.product) return;
    
    const productId = confirmDialog.product.id;
    const newStockStatus = !confirmDialog.product.in_stock;
    
    // Optimistic update - update UI immediately before API call
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, in_stock: newStockStatus } : p
    ));
    
    try {
      if (confirmDialog.type === 'toggle') {
        await apiPut('/api/products/manage', {
          id: productId,
          in_stock: newStockStatus,
        });
      } else if (confirmDialog.type === 'delete') {
        await apiDelete('/api/products/manage', {
          body: JSON.stringify({ id: productId }),
        });
        // Remove from list after successful delete
        setProducts(prev => prev.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error('Error:', err);
      // Revert on error
      loadProducts();
      alert('Ocorreu um erro. Tente novamente.');
    } finally {
      setConfirmDialog({ isOpen: false, type: 'toggle', product: null, title: '', message: '' });
    }
  };

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Contactar';
    return `$${amount.toFixed(2)}`;
  };

  // Open Add Service Modal
  const openAddServiceModal = () => {
    setNewServiceForm({ name: '', category: '', description: '', image: '' });
    setIsAddServiceModalOpen(true);
  };

  // Open Add Package Modal
  const openAddPackageModal = () => {
    setNewPackageForm({ name: '', price: 0, features: '' });
    setIsAddPackageModalOpen(true);
  };

  // Handle Add New Service
  const handleAddService = async () => {
    if (!newServiceForm.name || !newServiceForm.category) {
      alert('Vui lòng nhập tên và danh mục dịch vụ');
      return;
    }
    try {
      const res = await apiPost('/api/services/admin', {
        id: `service-${Date.now()}`,
        ...newServiceForm,
        is_active: true,
        packages: [],
      });
      const data = await res.json();
      if (data.success) {
        alert('Thêm dịch vụ thành công!');
        setIsAddServiceModalOpen(false);
        loadProducts();
      } else {
        alert('Lỗi: ' + (data.message || 'Không thể thêm dịch vụ'));
      }
    } catch (err) {
      console.error('Error adding service:', err);
      alert('Lỗi khi thêm dịch vụ');
    }
  };

  // Handle Add New Package
  const handleAddPackage = async () => {
    if (!selectedService || !newPackageForm.name) {
      alert('Vui lòng nhập tên gói');
      return;
    }
    try {
      const features = newPackageForm.features.split('\n').map(f => f.trim()).filter(Boolean);
      const res = await apiPost('/api/services/admin', {
        id: selectedService,
        packages: [{
          id: `package-${Date.now()}`,
          name: newPackageForm.name,
          price: newPackageForm.price,
          features,
          outOfStock: false,
        }],
      });
      const data = await res.json();
      if (data.success) {
        alert('Thêm gói dịch vụ thành công!');
        setIsAddPackageModalOpen(false);
        loadProducts();
      } else {
        alert('Lỗi: ' + (data.message || 'Không thể thêm gói'));
      }
    } catch (err) {
      console.error('Error adding package:', err);
      alert('Lỗi khi thêm gói dịch vụ');
    }
  };

  // Group products by service
  const serviceProducts = SERVICES.map(svc => ({
    ...svc,
    products: products.filter(p => p.category === svc.key),
    inStock: products.filter(p => p.category === svc.key && p.in_stock).length,
    outOfStock: products.filter(p => p.category === svc.key && !p.in_stock).length,
  }));

  const selectedServiceData = selectedService
    ? serviceProducts.find(s => s.key === selectedService)
    : null;

  const totalProducts = products.length;
  const totalInStock = products.filter(p => p.in_stock).length;
  const totalOutOfStock = products.filter(p => !p.in_stock).length;

  return (
    <div className="page-container">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#6366f1' }}><i className="fas fa-box" /></div>
          <div><div className="stat-label">TOTAL PRODUTOS</div><div className="stat-value">{totalProducts}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}><i className="fas fa-check-circle" /></div>
          <div><div className="stat-label">DISPONÍVEL</div><div className="stat-value">{totalInStock}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef4444' }}><i className="fas fa-times-circle" /></div>
          <div><div className="stat-label">ESGOTADO</div><div className="stat-value">{totalOutOfStock}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}><i className="fas fa-layer-group" /></div>
          <div><div className="stat-label">SERVIÇOS</div><div className="stat-value">{SERVICES.length}</div></div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="actions-bar">
        <div className="actions-left">
          {/* Level 1: Service List */}
          {!selectedService && (
            <>
              {totalProducts === 0 && (
                <button onClick={handleSeedProducts} disabled={isSeeding} className="btn-primary">
                  <i className={`fas ${isSeeding ? 'fa-spinner fa-spin' : 'fa-sync'}`} />
                  {isSeeding ? ' A sincronizar...' : ' Sincronizar Produtos do Website'}
                </button>
              )}
              {totalProducts > 0 && (
                <>
                  <button onClick={handleSeedProducts} disabled={isSeeding} className="btn-refresh" title="Re-sincronizar produtos">
                    <i className={`fas ${isSeeding ? 'fa-spinner fa-spin' : 'fa-sync'}`} />
                    {isSeeding ? ' A sincronizar...' : ' Re-sincronizar'}
                  </button>
                  <button onClick={openAddServiceModal} className="btn-primary" title="Thêm Dịch Vụ Mới">
                    <i className="fas fa-plus" /> Thêm Dịch Vụ Mới
                  </button>
                </>
              )}
            </>
          )}
          
          {/* Level 2: Service Details */}
          {selectedService && (
            <button onClick={() => setSelectedService(null)} className="btn-refresh">
              <i className="fas fa-arrow-left" /> Voltar aos serviços
            </button>
          )}
        </div>
        <div className="actions-right">
          <span className="filter-info">{totalProducts} produtos em {SERVICES.length} serviços</span>
        </div>
      </div>

      {/* Add Package Button - Only show in Level 2 */}
      {selectedService && selectedServiceData && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={openAddPackageModal} className="btn-primary">
            <i className="fas fa-plus" /> Thêm Các gói của dịch vụ
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Editar Produto</h2>
              <button onClick={() => setEditingProduct(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                {editingProduct.image && (
                  <img src={editingProduct.image} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{editingProduct.name}</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{editingProduct.service}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Preço (USD) — 0 = Contactar</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={editForm.in_stock ? 'true' : 'false'}
                  onChange={e => setEditForm({ ...editForm, in_stock: e.target.value === 'true' })}
                >
                  <option value="true">Disponível</option>
                  <option value="false">Esgotado</option>
                </select>
              </div>
              <div className="form-group">
                <label>Funcionalidades (uma por linha)</label>
                <textarea
                  value={editForm.features}
                  onChange={e => setEditForm({ ...editForm, features: e.target.value })}
                  rows={5}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingProduct(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="btn-primary">
                {isSaving ? <><i className="fas fa-spinner fa-spin" /> A guardar...</> : 'Guardar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ padding: '30px 20px 10px' }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: 16,
              }}>
                {confirmDialog.type === 'delete' ? '🗑️' : (confirmDialog.product?.in_stock ? '⏸️' : '▶️')}
              </div>
              <h2 style={{ margin: '0 0 12px', fontSize: '1.25rem' }}>{confirmDialog.title}</h2>
              <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: '.9rem', lineHeight: 1.5 }}>
                {confirmDialog.message}
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="btn-secondary"
                style={{ minWidth: 100 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className="btn-primary"
                style={{
                  minWidth: 100,
                  backgroundColor: confirmDialog.type === 'delete' ? '#dc2626' : undefined,
                }}
              >
                {confirmDialog.type === 'delete' ? 'Eliminar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {isAddServiceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddServiceModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Thêm Dịch Vụ Mới</h2>
              <button onClick={() => setIsAddServiceModalOpen(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên dịch vụ</label>
                <input
                  type="text"
                  value={newServiceForm.name}
                  onChange={e => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                  placeholder="VD: Youtube Premium"
                />
              </div>
              <div className="form-group">
                <label>Danh mục</label>
                <input
                  type="text"
                  value={newServiceForm.category}
                  onChange={e => setNewServiceForm({ ...newServiceForm, category: e.target.value })}
                  placeholder="VD: youtube"
                />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={newServiceForm.description}
                  onChange={e => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                  rows={3}
                  placeholder="Mô tả dịch vụ..."
                />
              </div>
              <div className="form-group">
                <label>URL hình ảnh</label>
                <input
                  type="url"
                  value={newServiceForm.image}
                  onChange={e => setNewServiceForm({ ...newServiceForm, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsAddServiceModalOpen(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleAddService} className="btn-primary">
                <i className="fas fa-plus" /> Thêm Dịch Vụ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      {isAddPackageModalOpen && selectedServiceData && (
        <div className="modal-overlay" onClick={() => setIsAddPackageModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Thêm Các gói của dịch vụ - {selectedServiceData.name}</h2>
              <button onClick={() => setIsAddPackageModalOpen(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên gói</label>
                <input
                  type="text"
                  value={newPackageForm.name}
                  onChange={e => setNewPackageForm({ ...newPackageForm, name: e.target.value })}
                  placeholder="VD: Premium (1 Tháng)"
                />
              </div>
              <div className="form-group">
                <label>Giá (USD)</label>
                <input
                  type="number"
                  value={newPackageForm.price}
                  onChange={e => setNewPackageForm({ ...newPackageForm, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Tính năng (mỗi dòng một)</label>
                <textarea
                  value={newPackageForm.features}
                  onChange={e => setNewPackageForm({ ...newPackageForm, features: e.target.value })}
                  rows={5}
                  placeholder="Tính năng 1&#10;Tính năng 2&#10;Tính năng 3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsAddPackageModalOpen(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleAddPackage} className="btn-primary">
                <i className="fas fa-plus" /> Thêm Gói
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>A carregar produtos...</p></div>
      ) : totalProducts === 0 ? (
        <div className="empty-state">
          <i className="fas fa-box-open" />
          <p>Nenhum produto na base de dados</p>
          <p className="empty-hint">Clique em "Sincronizar Produtos do Website" para importar todos os serviços e planos.</p>
          <button onClick={handleSeedProducts} disabled={isSeeding} className="btn-primary" style={{ marginTop: 16 }}>
            <i className={`fas ${isSeeding ? 'fa-spinner fa-spin' : 'fa-sync'}`} />
            {isSeeding ? ' A sincronizar...' : ' Sincronizar Produtos do Website'}
          </button>
        </div>
      ) : !selectedService ? (
        /* Services Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {serviceProducts.map(svc => (
            <div
              key={svc.key}
              onClick={() => setSelectedService(svc.key)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 20,
                cursor: 'pointer',
                transition: 'all .2s',
                boxShadow: 'var(--shadow)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.borderColor = svc.color;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                {svc.products[0]?.image ? (
                  <img
                    src={svc.products[0].image}
                    alt={svc.name}
                    style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: svc.color + '15', color: svc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    <i className={svc.icon} />
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{svc.name}</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{svc.products.length} planos</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: '#10b98115', color: '#10b981' }}>
                  {svc.inStock} disponível
                </span>
                {svc.outOfStock > 0 && (
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: '#ef444415', color: '#ef4444' }}>
                    {svc.outOfStock} esgotado
                  </span>
                )}
              </div>
              <div style={{ marginTop: 12, fontSize: '.85rem', color: 'var(--text-dim)' }}>
                {svc.products.length > 0
                  ? `${formatPrice(Math.min(...svc.products.filter(p => p.price > 0).map(p => p.price)))} — ${formatPrice(Math.max(...svc.products.map(p => p.price)))}`
                  : 'Sem planos'}
              </div>
            </div>
          ))}
        </div>
      ) : selectedServiceData ? (
        /* Service Plans Table */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            {selectedServiceData.products[0]?.image && (
              <img
                src={selectedServiceData.products[0].image}
                alt={selectedServiceData.name}
                style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
              />
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{selectedServiceData.name}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '.9rem' }}>
                {selectedServiceData.products.length} planos · {selectedServiceData.inStock} disponível · {selectedServiceData.outOfStock} esgotado
              </p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Plano</th>
                  <th>Preço</th>
                  <th>Estado</th>
                  <th>Popular</th>
                  <th>Funcionalidades</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {selectedServiceData.products.map(p => (
                  <tr key={p.id} style={{ opacity: p.in_stock ? 1 : 0.6 }}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: p.price === 0 ? 'var(--warning)' : 'var(--text)' }}>
                        {formatPrice(p.price)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${p.in_stock ? 'status-completed' : 'status-cancelled'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => confirmToggleStock(p)}
                        title="Clique para alternar"
                      >
                        {p.in_stock ? 'Disponível' : 'Esgotado'}
                      </span>
                    </td>
                    <td>
                      {p.popular && <span style={{ color: '#f59e0b' }}><i className="fas fa-star" /> Popular</span>}
                    </td>
                    <td>
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', maxWidth: 300 }}>
                        {p.features.slice(0, 2).join(' · ')}
                        {p.features.length > 2 && ` +${p.features.length - 2}`}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditModal(p)} className="btn-sm" title="Editar">
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          onClick={() => confirmToggleStock(p)}
                          className="btn-sm"
                          title={p.in_stock ? 'Marcar esgotado' : 'Marcar disponível'}
                        >
                          <i className={`fas ${p.in_stock ? 'fa-toggle-on' : 'fa-toggle-off'}`} style={{ color: p.in_stock ? '#10b981' : '#ef4444' }} />
                        </button>
                        <button
                          onClick={() => confirmDeleteProduct(p)}
                          className="btn-sm"
                          title="Eliminar produto"
                          style={{ color: '#dc2626' }}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
