
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { ErrorView } from "../components/ErrorView";
import { PrimaryButton } from "../components/PrimaryButton";

import { getOrdersByUser } from "../services/orderService";
import { getBooks } from "../services/bookService";
import { getErrorMessage } from "../api/client";

import { useAuth, useCart } from "../store/hooks";
import { formatDateTime } from "../utils/format";
import { showMessage } from "../utils/dialog";

import { RootScreenProps } from "../navigation/types";
import { Order, OrderStatus } from "../types";
import { colors, formatPrice, radius } from "../theme";

export const PAYMENT_LABEL = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank: "Chuyển khoản ngân hàng",
} as const;

export function OrdersScreen({
  navigation,
}: RootScreenProps<"Orders">) {
  const { user, isLoggedIn } = useAuth();

  // Lấy dữ liệu và các hàm thao tác giỏ hàng
  const {
    items: cartItems,
    add,
    setQty,
  } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  // Bộ lọc trạng thái đơn hàng
  const [status, setStatus] = useState<"all" | OrderStatus>("all");

  const filters = [
    { label: "Tất cả", value: "all" },
    { label: "Chờ xác nhận", value: "pending" },
    { label: "Đang giao", value: "shipping" },
    { label: "Hoàn tất", value: "completed" },
    { label: "Đã huỷ", value: "cancelled" },
  ] as const;

  // Lọc đơn hàng theo trạng thái được chọn
  const filteredOrders = orders.filter(
    (o) => status === "all" || o.status === status
  );

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

      // Sắp xếp: đơn mới nhất nằm trên cùng
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

  // BT9.C1: Thử thách điểm cộng - Mua lại
  const reorder = async (order: Order) => {
    try {
      // Lấy giá và tồn kho mới nhất từ API
      const books = await getBooks();

      // Duyệt qua từng sản phẩm trong đơn hàng cũ
      order.items.forEach((it) => {
        const book = books.find((b) => b.id === it.bookId);

        // Sách không còn tồn tại thì bỏ qua
        if (!book) return;

        // Kiểm tra sản phẩm đã có trong giỏ chưa
        const inCart = cartItems.find(
          (c) => c.bookId === it.bookId
        );

        // Nếu chưa có thì thêm vào giỏ
        if (!inCart) {
          add({
            bookId: book.id,
            title: book.title,
            price: book.price,
            emoji: book.emoji,
            color: book.color,
            stock: book.stock,
          });
        }

        // Cộng số lượng, setQty tự giới hạn theo tồn kho
        setQty(
          it.bookId,
          (inCart?.quantity ?? 0) + it.quantity
        );
      });

      // Thông báo và chuyển sang tab Giỏ hàng
      showMessage(
        "Đã thêm vào giỏ",
        "Các sản phẩm của đơn hàng đã được thêm lại vào giỏ.",
        () =>
          navigation.navigate("Tabs", {
            screen: "Cart",
          })
      );
    } catch (e) {
      // Nếu có lỗi khi lấy sách hoặc thêm lại
      showMessage(
        "Không thể mua lại",
        getErrorMessage(e)
      );
    }
  };

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

      {/* Bộ lọc trạng thái */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map((item) => {
          const selected = status === item.value;

          return (
            <Pressable
              key={item.value}
              onPress={() => setStatus(item.value)}
              style={[
                styles.filterButton,
                selected && styles.filterActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Danh sách đơn hàng */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          status === "all" ? (
            <EmptyState
              emoji="🧾"
              title="Bạn chưa có đơn hàng nào"
              message="Đặt đơn đầu tiên để theo dõi tại đây."
              actionLabel="Mua sắm ngay"
              onAction={() =>
                navigation.navigate("Tabs", {
                  screen: "Home",
                })
              }
            />
          ) : (
            <View style={styles.noResult}>
              <Text style={styles.noResultEmoji}>📦</Text>

              <Text style={styles.noResultTitle}>
                Không có đơn hàng
              </Text>

              <Text style={styles.noResultText}>
                Không tìm thấy đơn hàng ở trạng thái này.
              </Text>
            </View>
          )
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

                  {/* BT9.C1: Chỉ hiện nút khi đơn đã hoàn tất */}
                  {o.status === "completed" && (
                    <PrimaryButton
                      title="Mua lại"
                      variant="outline"
                      onPress={() => reorder(o)}
                    />
                  )}
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

  // Bộ lọc trạng thái
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },

  filterContainer: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },

  filterButton: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
  },

  filterActive: {
    backgroundColor: colors.indigo,
    borderColor: colors.indigo,
  },

  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },

  filterTextActive: {
    color: "#fff",
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

  // Không có kết quả lọc
  noResult: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },

  noResultEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },

  noResultTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 5,
  },

  noResultText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
});
