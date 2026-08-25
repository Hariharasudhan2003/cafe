export interface Product {
  id: string;
  name: string;
  category: 'Tea' | 'Coffee' | 'Juice' | 'Cool Drinks' | 'Snacks';
  price: number;
  stock: number | 'infinity';
  image: string;
  status?: 'Active' | 'Inactive';
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface BillSummary {
  billNo: string;
  date: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  paymentMethod: 'Cash' | 'UPI';
}
