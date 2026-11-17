
import { api } from "../api/client";
import { User } from "../types";

// BT9.4: Cập nhật họ tên và số điện thoại
export async function updateProfile(
  id: number,
  data: Pick<User, "name" | "phone">
): Promise<User> {
  const res = await api.patch<User & { password?: string }>(
    `/users/${id}`,
    data
  );

  // Không đưa password từ API vào Redux Store
  const updatedUser = { ...res.data };
  delete updatedUser.password;

  return updatedUser;
}
