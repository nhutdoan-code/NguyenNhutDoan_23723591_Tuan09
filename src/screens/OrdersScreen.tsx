
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { ErrorView } from "../components/ErrorView";

import { getOrdersByUser } from "../services/orderService";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../store/hooks";
import { formatDateTime } from "../utils/format";
import { RootScreenProps } from "../navigation/types";
import { Order } from "../types";
import { colors, formatPrice, radius } from "../theme";

export const PAYMENT_LABEL = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank: "Chuyển khoản ngân hàng",
} as const;

export function OrdersScreen({
  navigation,
}: RootScreenProps<"Orders">) {
  const { user, isLoggedIn } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  // BT9.3a: Tải đơn hàng của người dùng
  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getOrdersByUser(user.id);

      // Sắp xếp lại: đơn mới nhất nằm trên cùng
      const sortedOrders = [...data].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );

      setOrders(sortedOrders);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Chưa đăng nhập
  if (!isLoggedIn) {
    return (
      <EmptyState
        emoji="🔒"
        title="Bạn cần đăng nhập"
        actionLabel="Đăng nhập"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  // Đang tải dữ liệu
  if (loading) {
    return <LoadingView />;
  }

  // Có lỗi khi tải dữ liệu
  if (error) {
    return <ErrorView message={error} onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🧾 Đơn hàng của tôi</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            emoji="🧾"
            title="Bạn chưa có đơn hàng nào"
            message="Đặt đơn đầu tiên để theo dõi tại đây."
            actionLabel="Mua sắm ngay"
            onAction={() =>
              navigation.navigate("Tabs", { screen: "Home" })
            }
          />
        }
        renderItem={({ item: o }) => {
          const open = openId === o.id;

          return (
            <View style={styles.card}>
              {/* Phần thông tin chính của đơn hàng */}
              <Pressable
                onPress={() => setOpenId(open ? null : o.id)}
                style={styles.head}
              >
                <View style={styles.info}>
                  <Text style={styles.code}>
                    Đơn #{o.id}
                  </Text>

                  <Text style={styles.date}>
                    {formatDateTime(o.createdAt)}
                  </Text>

                  <Text style={styles.total}>
                    {formatPrice(o.total)}
                  </Text>
                </View>

                <View style={styles.right}>
                  <StatusBadge status={o.status} />

                  <Text style={styles.toggle}>
                    {open ? "Thu gọn ▲" : "Chi tiết ▼"}
                  </Text>
                </View>
              </Pressable>

              {/* Chi tiết đơn hàng */}
              {open && (
                <View style={styles.detail}>
                  <Text style={styles.sectionTitle}>
                    Sản phẩm
                  </Text>

                  {o.items.map((item, index) => (
                    <View
                      key={`${item.bookId}-${index}`}
                      style={styles.itemRow}
                    >
                      <Text
                        style={styles.itemTitle}
                        numberOfLines={2}
                      >
                        {item.title} × {item.quantity}
                      </Text>

                      <Text style={styles.itemPrice}>
                        {formatPrice(
                          item.price * item.quantity
                        )}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  <Text style={styles.sectionTitle}>
                    Địa chỉ giao hàng
                  </Text>

                  <Text style={styles.detailText}>
                    {o.address.name} · {o.address.phone}
                  </Text>

                  <Text style={styles.detailText}>
                    {o.address.address}
                  </Text>

                  <View style={styles.payment}>
                    <Text style={styles.sectionTitle}>
                      Phương thức thanh toán
                    </Text>

                    <Text style={styles.detailText}>
                      {PAYMENT_LABEL[o.paymentMethod]}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  list: {
    gap: 10,
    flexGrow: 1,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.md,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  code: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.muted,
  },
  total: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.indigo,
    marginTop: 3,
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
  },
  toggle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.indigo,
  },
  detail: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 5,
  },
  detailText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
  payment: {
    marginTop: 6,
    gap: 4,
  },
});
