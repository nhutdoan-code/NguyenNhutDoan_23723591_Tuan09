
import { api } from "../api/client";
import { Order, OrderItem, PaymentMethod, ShippingAddress } from "../types";

export interface NewOrder {
  userId: number;
  items: OrderItem[];
  total: number;
  address: ShippingAddress;
  paymentMethod: PaymentMethod;
}

// BT9.2: Gửi đơn hàng lên API POST /orders
export async function createOrder(payload: NewOrder): Promise<Order> {
  const res = await api.post<Order>("/orders", {
    ...payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return res.data;
}

// BT9.3: Lấy danh sách đơn hàng của người dùng
export async function getOrdersByUser(userId: number): Promise<Order[]> {
  const res = await api.get<Order[]>("/orders", {
    params: {
      userId,
      _sort: "createdAt",
      _order: "desc",
    },
  });

  return res.data;
}
