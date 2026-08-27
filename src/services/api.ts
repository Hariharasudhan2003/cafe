const getApiBaseUrl = (): string => {
  let envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  envUrl = envUrl.trim();
  if (envUrl.endsWith('/')) {
    envUrl = envUrl.slice(0, -1);
  }
  if (!envUrl.endsWith('/api')) {
    envUrl = `${envUrl}/api`;
  }
  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Helper for standard API calls with fallback graceful handling
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`[API] Fetch failed for ${endpoint}:`, error);
    throw error;
  }
}

// ---------------- PRODUCTS ----------------
export const apiGetProducts = (category?: string, search?: string) => {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<any[]>(`/products${query}`);
};

export const apiCreateProduct = (data: any) => {
  return apiFetch<any>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const apiUpdateProduct = (id: string, data: any) => {
  return apiFetch<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const apiDeleteProduct = (id: string) => {
  return apiFetch<any>(`/products/${id}`, {
    method: 'DELETE',
  });
};

// ---------------- ORDERS ----------------
export const apiGetOrders = () => {
  return apiFetch<any[]>('/orders');
};

export const apiCreateOrder = (data: any) => {
  return apiFetch<any>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const apiUpdateOrder = (id: string, data: any) => {
  return apiFetch<any>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const apiDeleteOrder = (id: string) => {
  return apiFetch<any>(`/orders/${id}`, {
    method: 'DELETE',
  });
};

// ---------------- BILLS ----------------
export const apiGetBills = (status?: string) => {
  const query = status ? `?status=${status}` : '';
  return apiFetch<any[]>(`/bills${query}`);
};

export const apiCreateBill = (data: any) => {
  return apiFetch<any>('/bills', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const apiUpdateBillStatus = (id: string, status: string) => {
  return apiFetch<any>(`/bills/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const apiDeleteBill = (id: string) => {
  return apiFetch<any>(`/bills/${id}`, {
    method: 'DELETE',
  });
};

// ---------------- DASHBOARD & SETTINGS ----------------
export const apiGetDashboardStats = () => {
  return apiFetch<any>('/dashboard/stats');
};

export const apiGetSettings = () => {
  return apiFetch<any>('/settings');
};

export const apiUpdateSettings = (data: any) => {
  return apiFetch<any>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
